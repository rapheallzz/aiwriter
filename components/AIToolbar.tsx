"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { AiAction } from "@/lib/openai";

const ACTIONS: { id: AiAction; label: string }[] = [
  { id: "improve", label: "Improve writing" },
  { id: "shorten", label: "Shorten" },
  { id: "expand", label: "Expand" },
  { id: "fix", label: "Fix grammar" },
  { id: "summarize", label: "Summarize" }
];

export default function AIToolbar({ editor, documentId }: { editor: Editor; documentId: string }) {
  const [busyAction, setBusyAction] = useState<AiAction | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function runAction(action: AiAction, instruction?: string) {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    setError(null);
    setBusyAction(action);
    setShowCustom(false);

    // Wider surrounding context helps the model match tone/continuity.
    const docText = editor.getText();

    const controller = new AbortController();
    abortRef.current = controller;

    // Replace the selection with a live-updating placeholder as tokens stream in.
    let rangeEnd = to;
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, "").run();

    try {
      const res = await fetch("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: selectedText, instruction, context: docText }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => "")) || "AI request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        editor
          .chain()
          .insertContentAt({ from, to: rangeEnd }, acc)
          .run();
        rangeEnd = from + acc.length;
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err?.message || "Something went wrong");
        // Restore the original selection text on failure.
        editor.chain().insertContentAt({ from, to: rangeEnd }, selectedText).run();
      }
    } finally {
      setBusyAction(null);
      abortRef.current = null;
    }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-1 min-w-[220px] fade-in">
      {error && <p className="text-xs text-red-500 px-2 pt-1">{error}</p>}

      {!showCustom ? (
        <>
          <button
            onClick={() => setShowCustom(true)}
            disabled={!!busyAction}
            className="text-left px-2.5 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 disabled:opacity-50"
          >
            ✨ Ask AI…
          </button>
          <div className="h-px bg-neutral-100 my-0.5" />
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => runAction(a.id)}
              disabled={!!busyAction}
              className="text-left px-2.5 py-1.5 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 flex items-center justify-between"
            >
              {a.label}
              {busyAction === a.id && <span className="text-xs text-neutral-400">…</span>}
            </button>
          ))}
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customPrompt.trim()) runAction("custom", customPrompt.trim());
          }}
          className="p-1"
        >
          <input
            autoFocus
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Make this more formal"
            className="w-full text-sm border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <button type="button" onClick={() => setShowCustom(false)} className="text-xs text-neutral-500 px-2 py-1">
              Cancel
            </button>
            <button type="submit" className="text-xs bg-neutral-900 text-white rounded-md px-2.5 py-1 font-medium">
              Go
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
