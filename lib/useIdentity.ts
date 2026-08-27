"use client";

import { useEffect, useState } from "react";

export type Identity = {
  id: string;
  name: string;
  color: string;
};

const COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6"];

function randomId() {
  return "u_" + Math.random().toString(36).slice(2, 10);
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/**
 * Lightweight local identity used to attribute authorship and drive
 * collaboration cursors. This intentionally isn't a full auth system —
 * swap this hook out for NextAuth/Clerk/etc. in production and keep the
 * same `Identity` shape.
 */
export function useIdentity(): { identity: Identity | null; setName: (name: string) => void } {
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("ai-writer-identity");
    if (stored) {
      setIdentity(JSON.parse(stored));
      return;
    }
    const name = window.prompt("What's your name? (shown to collaborators)") || "Anonymous";
    const fresh: Identity = { id: randomId(), name, color: randomColor() };
    localStorage.setItem("ai-writer-identity", JSON.stringify(fresh));
    setIdentity(fresh);
  }, []);

  const setName = (name: string) => {
    if (!identity) return;
    const next = { ...identity, name };
    localStorage.setItem("ai-writer-identity", JSON.stringify(next));
    setIdentity(next);
  };

  return { identity, setName };
}
