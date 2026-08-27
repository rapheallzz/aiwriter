# AI Writer

A document editor built with **Next.js 14 (App Router)**, the **OpenAI API**, and **Prisma**, featuring:

- 📝 Rich-text editor (Tiptap) with AI completions — continue writing, improve, shorten, expand, fix grammar, summarize, or a custom instruction — streamed token-by-token
- 🤝 Real-time multiplayer editing via **Yjs** + **y-webrtc** (CRDT sync, no custom WebSocket server required) with live collaborator cursors and a presence avatar stack
- 🕓 Version history — autosaved snapshots every 60s while editing, manual "Save version," and one-click restore (which itself snapshots the pre-restore state)
- 💾 Prisma/PostgreSQL persistence for documents, collaborators, and versions

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Tiptap 2 + `@tiptap/extension-collaboration` / `-collaboration-cursor`
- Yjs + `y-webrtc` for peer-to-peer real-time sync
- OpenAI Node SDK, streamed via an Edge API route
- Prisma ORM + PostgreSQL

## Getting started

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL and OPENAI_API_KEY
npm run db:push           # creates tables from prisma/schema.prisma
npm run dev
```

Open http://localhost:3000, pick a display name (this app uses a lightweight
localStorage-based identity instead of full auth, to keep the demo simple —
see "Notes" below), and create a document.

To test real-time collaboration, open the same document URL in a second
browser (or incognito window) with a different display name.

## How it works

### Editor + AI completions
`components/Editor.tsx` wires up Tiptap with the Yjs collaboration extension.
Selecting text opens a bubble menu (`components/AIToolbar.tsx`) with quick
actions; each one calls `POST /api/ai/complete`, an Edge runtime route that
streams the OpenAI chat completion back as plain text, which is inserted into
the document live as it arrives. "Continue writing" (in the top toolbar) does
the same but appends at the end of the document, using the last ~2000
characters as context.

### Real-time collaboration
Each document gets its own Yjs `Doc` and a `WebrtcProvider` room named
`ai-writer-doc-<id>`. Peers sync CRDT updates directly (via the public y-webrtc
signaling servers by default — swap in your own via
`NEXT_PUBLIC_SIGNALING_SERVERS` for production). `CollaborationCursor` renders
each peer's name/color as a live caret. When a client first joins and finds an
empty shared doc, it seeds it from the persisted Prisma content.

### Version history
The current document snapshot (Tiptap JSON) is autosaved to Postgres on a
debounce after edits, and a full **version** row is snapshotted every 60
seconds of active editing (deduplicated if nothing changed), plus on demand via
"Save version." `components/VersionHistory.tsx` lists versions and restores
them via `POST /api/documents/:id/versions/:versionId/restore`, which itself
snapshots the pre-restore state first so restores are non-destructive.

## Notes / production hardening

This is a functional reference implementation, not a production deployment.
Before shipping it for real, you'd want to:

- Replace the localStorage identity (`components/UserProvider.tsx`) with real
  auth (e.g. NextAuth) and use `session.user.id` everywhere `userId` is passed
- Run your own y-webrtc (or swap to y-websocket/Hocuspocus) signaling
  infrastructure instead of the public demo servers
- Add authorization checks on the API routes (currently any known document id
  is readable/writable — add owner/collaborator checks)
- Rate-limit `/api/ai/complete` and add per-user usage caps
- Store the Yjs binary state (not just the Tiptap JSON snapshot) if you want
  perfect state continuity across periods with zero connected peers
