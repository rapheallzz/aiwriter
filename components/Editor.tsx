"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, BubbleMenu, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import type { LocalUser } from "./UserProvider";
import Toolbar from "./Toolbar";
import AIToolbar from "./AIToolbar";
import PresenceAvatars from "./PresenceAvatars";

type Props = {
  documentId: string;
  user: LocalUser;
  initialContent: object | null;
  onEditorReady: (editor: TiptapEditor) => void;
  onDirtyChange: (dirty: boolean) => void;
};

const SIGNALING_SERVERS = process.env.NEXT_PUBLIC_SIGNALING_SERVERS
  ? process.env.NEXT_PUBLIC_SIGNALING_SERVERS.split(",")
  : ["wss://signaling.yjs.dev", "wss://y-webrtc-signaling-eu.herokuapp.com"];

export default function Editor({ documentId, user, initialContent, onEditorReady, onDirtyChange }: Props) {
  const [peers, setPeers] = useState<{ clientId: number; name: string; color: string }[]>([]);
  const ydocRef = useRef<Y.Doc>();
  const providerRef = useRef<WebrtcProvider>();

  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    ydocRef.current = doc;
    return doc;
  }, [documentId]);

  const provider = useMemo(() => {
    const p = new WebrtcProvider(`ai-writer-doc-${documentId}`, ydoc, {
      signaling: SIGNALING_SERVERS
    });
    providerRef.current = p;
    return p;
  }, [documentId, ydoc]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }), // history is handled by Yjs
        Placeholder.configure({ placeholder: "Start writing, or select text to ask the AI…" }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider,
          user: { name: user.name, color: user.color }
        })
      ],
      editorProps: {
        attributes: {
          class: "prose prose-neutral max-w-none focus:outline-none px-1 py-4 min-h-[60vh]"
        }
      },
      onUpdate: () => onDirtyChange(true),
      immediatelyRender: false
    },
    [documentId]
  );

  // Seed the Yjs doc with persisted content the first time this client connects,
  // but only if the shared doc is still empty (avoids clobbering peers already editing).
  const seeded = useRef(false);
  useEffect(() => {
    if (!editor || seeded.current) return;
    seeded.current = true;
    const timer = setTimeout(() => {
      const isEmpty = editor.getText().trim().length === 0;
      if (isEmpty && initialContent && Object.keys(initialContent).length > 0) {
        editor.commands.setContent(initialContent, false);
      }
    }, 400); // brief grace period to let Yjs sync from any connected peers first
    return () => clearTimeout(timer);
  }, [editor, initialContent]);

  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Track connected peers for the presence avatar stack.
  useEffect(() => {
    function updatePeers() {
      const states = Array.from(provider.awareness.getStates().entries())
        .filter(([clientId]) => clientId !== provider.awareness.clientID)
        .map(([clientId, state]: [number, any]) => ({
          clientId,
          name: state?.user?.name ?? "Anonymous",
          color: state?.user?.color ?? "#999999"
        }));
      setPeers(states);
    }
    provider.awareness.on("change", updatePeers);
    updatePeers();
    return () => provider.awareness.off("change", updatePeers);
  }, [provider]);

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, [documentId]);

  if (!editor) return null;

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-neutral-200 flex items-center justify-between px-1 py-2">
        <Toolbar editor={editor} />
        <PresenceAvatars peers={peers} me={user} />
      </div>

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 120 }}
        shouldShow={({ state }) => !state.selection.empty}
      >
        <AIToolbar editor={editor} documentId={documentId} />
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  );
}
