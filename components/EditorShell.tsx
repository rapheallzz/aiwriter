"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useLocalUser } from "./UserProvider";
import Editor from "./Editor";
import VersionHistory from "./VersionHistory";

type DocumentData = {
  id: string;
  title: string;
  content: object;
};

const AUTOSAVE_DEBOUNCE_MS = 1500;
const VERSION_SNAPSHOT_INTERVAL_MS = 60_000; // periodic version snapshot while actively editing

export default function EditorShell({ documentId }: { documentId: string }) {
  const { user } = useLocalUser();
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [showHistory, setShowHistory] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const editorRef = useRef<TiptapEditor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const versionTimer = useRef<ReturnType<typeof setInterval>>();
  const dirtySinceVersion = useRef(false);

  // Load document + register current user as a collaborator (idempotent).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch(`/api/documents/${documentId}`)
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setDoc(data.document);
        setTitle(data.document.title);
      })
      .finally(() => !cancelled && setLoading(false));

    fetch(`/api/documents/${documentId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, name: user.name, color: user.color })
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [documentId, user]);

  const persistContent = useCallback(
    async (createVersion = false) => {
      const editor = editorRef.current;
      if (!editor) return;
      setSaveState("saving");
      const content = editor.getJSON();
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      }).catch(() => {});
      setSaveState("saved");

      if (createVersion && dirtySinceVersion.current) {
        dirtySinceVersion.current = false;
        await fetch(`/api/documents/${documentId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id, label: "Autosave" })
        }).catch(() => {});
      }
    },
    [documentId, user]
  );

  function handleDirtyChange() {
    dirtySinceVersion.current = true;
    setSaveState("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistContent(false), AUTOSAVE_DEBOUNCE_MS);
  }

  // Periodic version snapshots so history has meaningful checkpoints, not just every keystroke.
  useEffect(() => {
    versionTimer.current = setInterval(() => persistContent(true), VERSION_SNAPSHOT_INTERVAL_MS);
    return () => {
      if (versionTimer.current) clearInterval(versionTimer.current);
    };
  }, [persistContent]);

  async function saveVersionNow() {
    await persistContent(false);
    dirtySinceVersion.current = true;
    await fetch(`/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, label: "Manual save" })
    });
    dirtySinceVersion.current = false;
  }

  async function updateTitle(newTitle: string) {
    setTitle(newTitle);
    await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle })
    }).catch(() => {});
  }

  function handleRestored(content: object, restoredTitle: string) {
    editorRef.current?.commands.setContent(content, false);
    setTitle(restoredTitle);
  }

  async function continueWriting() {
    const editor = editorRef.current;
    if (!editor || continuing) return;
    setContinuing(true);
    editor.chain().focus("end").run();
    const end = editor.state.doc.content.size;
    const fullText = editor.getText();
    const seed = fullText.slice(-2000) || " ";

    try {
      const res = await fetch("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "continue", text: seed, context: fullText })
      });
      if (!res.ok || !res.body) throw new Error("AI request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let cursor = end;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        editor.chain().insertContentAt(cursor, chunk).run();
        cursor += chunk.length;
      }
    } catch {
      // Silently ignore; user can retry.
    } finally {
      setContinuing(false);
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-neutral-400">Loading document…</div>;
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-neutral-500 mb-4">This document doesn't exist.</p>
        <button onClick={() => router.push("/")} className="text-indigo-600 text-sm font-medium">
          ← Back to your documents
        </button>
      </div>
    );
  }
  if (!doc || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push("/")} className="text-sm text-neutral-400 hover:text-neutral-700">
          ← All documents
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
          </span>
          <button
            onClick={continueWriting}
            disabled={continuing}
            className="text-xs font-medium bg-indigo-50 text-indigo-700 rounded-md px-3 py-1.5 hover:bg-indigo-100 disabled:opacity-50"
          >
            {continuing ? "Writing…" : "✨ Continue writing"}
          </button>
          <button
            onClick={saveVersionNow}
            className="text-xs font-medium text-neutral-600 border border-neutral-200 rounded-md px-3 py-1.5 hover:bg-neutral-50"
          >
            Save version
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs font-medium text-neutral-600 border border-neutral-200 rounded-md px-3 py-1.5 hover:bg-neutral-50"
          >
            History
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => updateTitle(e.target.value)}
        placeholder="Untitled document"
        className="w-full text-3xl font-bold mb-2 focus:outline-none placeholder:text-neutral-300"
      />

      <Editor
        documentId={documentId}
        user={user}
        initialContent={doc.content}
        onEditorReady={(editor) => (editorRef.current = editor)}
        onDirtyChange={handleDirtyChange}
      />

      {showHistory && (
        <VersionHistory
          documentId={documentId}
          editor={editorRef.current}
          onClose={() => setShowHistory(false)}
          onRestored={handleRestored}
        />
      )}
    </div>
  );
}
