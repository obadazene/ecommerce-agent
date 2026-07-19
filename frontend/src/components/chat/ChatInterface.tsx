"use client";

import { useState } from "react";

export default function ChatInterface() {
  const [messages, setMessages] = useState<
    { role: "user" | "agent"; text: string }[]
  >([]);
  const [input, setInput] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: input.trim() },
    ]);
    setInput("");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-2xl p-4 ${
              message.role === "user"
                ? "bg-sky-100 text-slate-900"
                : "bg-slate-100 text-slate-900"
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-wide">
              {message.role}
            </p>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the agent..."
          className="flex-1 rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
        />
        <button
          type="submit"
          className="rounded-xl bg-sky-600 px-5 py-3 text-white hover:bg-sky-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
