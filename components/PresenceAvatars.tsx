"use client";

import type { LocalUser } from "./UserProvider";

export default function PresenceAvatars({
  peers,
  me
}: {
  peers: { clientId: number; name: string; color: string }[];
  me: LocalUser;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        <div
          title={`${me.name} (you)`}
          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold text-white ring-1 ring-neutral-200"
          style={{ backgroundColor: me.color }}
        >
          {me.name[0]?.toUpperCase()}
        </div>
        {peers.map((p) => (
          <div
            key={p.clientId}
            title={p.name}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold text-white"
            style={{ backgroundColor: p.color }}
          >
            {p.name[0]?.toUpperCase()}
          </div>
        ))}
      </div>
      {peers.length > 0 && (
        <span className="text-xs text-neutral-400">
          {peers.length} other{peers.length === 1 ? "" : "s"} editing
        </span>
      )}
    </div>
  );
}
