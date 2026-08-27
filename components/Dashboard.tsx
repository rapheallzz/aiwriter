"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalUser } from "./UserProvider";

type DocSummary = {
  id: string;
  title: string;
  updatedAt: string;
  owner: { id: string; name: string; color: string };
  collaborators: { user: { id: string; name: string; color: string } }[];
  _count: { versions: number };
};

export default function Dashboard() {
  const { user } = useLocalUser();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/documents?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  async function createDocument() {
    if (!user) return;
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, userName: user.name, userColor: user.color, title: "Untitled document" })
      });
      const data = await res.json();
      router.push(`/document/${data.document.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Your documents</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Signed in as <span className="font-medium" style={{ color: user?.color }}>{user?.name}</span>
          </p>
        </div>
        <button
          onClick={createDocument}
          disabled={creating}
          className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50"
        >
          {creating ? "Creating…" : "+ New document"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="border border-dashed border-neutral-300 rounded-xl py-16 text-center text-neutral-400">
          No documents yet. Create your first one to get started.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden bg-white">
          {documents.map((doc) => (
            <li
              key={doc.id}
              onClick={() => router.push(`/document/${doc.id}`)}
              className="px-5 py-4 hover:bg-neutral-50 cursor-pointer flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{doc.title || "Untitled document"}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Edited {new Date(doc.updatedAt).toLocaleString()} · {doc._count.versions} version
                  {doc._count.versions === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex -space-x-2">
                {[doc.owner, ...doc.collaborators.map((c) => c.user)].slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    title={p.name}
                    className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
