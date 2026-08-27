"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type LocalUser = {
  id: string;
  name: string;
  color: string;
};

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];

function randomId() {
  return "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadOrCreateUser(): LocalUser {
  if (typeof window === "undefined") return { id: "server", name: "Anonymous", color: COLORS[0] };
  const raw = window.localStorage.getItem("ai-writer:user");
  if (raw) return JSON.parse(raw);
  const user: LocalUser = {
    id: randomId(),
    name: "",
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };
  window.localStorage.setItem("ai-writer:user", JSON.stringify(user));
  return user;
}

const UserContext = createContext<{
  user: LocalUser | null;
  setName: (name: string) => void;
}>({ user: null, setName: () => {} });

export function useLocalUser() {
  return useContext(UserContext);
}

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    setUser(loadOrCreateUser());
  }, []);

  function setName(name: string) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, name };
      window.localStorage.setItem("ai-writer:user", JSON.stringify(next));
      return next;
    });
  }

  if (!user) return null;

  if (!user.name) {
    return <NamePrompt onSubmit={setName} color={user.color} />;
  }

  return <UserContext.Provider value={{ user, setName }}>{children}</UserContext.Provider>;
}

function NamePrompt({ onSubmit, color }: { onSubmit: (name: string) => void; color: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
        className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-6 shadow-sm"
      >
        <div
          className="w-10 h-10 rounded-full mb-4 flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: color }}
        >
          {value ? value[0].toUpperCase() : "?"}
        </div>
        <h1 className="text-lg font-semibold mb-1">Welcome to AI Writer</h1>
        <p className="text-sm text-neutral-500 mb-4">
          Pick a display name. This is how collaborators will see you in shared documents.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-neutral-800 transition"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
