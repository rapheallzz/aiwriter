"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

type Version = {
  id: string;
  title: string;
  label: string;
  createdAt: string;
  createdBy: { id: string; name: string; color: string } | null;
};

export default function VersionHistory({
  documentId,
  editor,
  onClose,
  onRestored
}: {
  documentId: string;
  editor: Editor | null;
  onClose: () => void;
  onRestored: (content: object, title: string) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/versions`)
      .then((r) => r.json())
      .then((d) => setVersions(d.versions ?? []))
      .finally(() => setLoading(false));
  }, [documentId]);

  async function restore(versionId: string) {
    setRestoringId(versionId);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.document) {
        onRestored(data.document.content, data.document.title);
        onClose();
      }
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-white border-l border-neutral-200 shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Version history</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-sm">
            Close
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-400 px-4 py-6">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-neutral-400 px-4 py-6">No saved versions yet. They're created automatically as you edit.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {versions.map((v) => (
              <li key={v.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{v.label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {new Date(v.createdAt).toLocaleString()}
                      {v.createdBy ? ` · ${v.createdBy.name}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => restore(v.id)}
                    disabled={restoringId === v.id}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    {restoringId === v.id ? "Restoring…" : "Restore"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
