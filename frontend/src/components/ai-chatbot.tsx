"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };

export function AiChatbot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content: "Ask about licenses, Telebirr / ETB checkout, downloads or which kit to start with. I won’t invent fake reviews or discounts.",
    },
  ]);
  const [sessionId, setSessionId] = useState("pending");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = localStorage.getItem("df_chat");
    if (existing) {
      setSessionId(existing);
      return;
    }
    const id = crypto.randomUUID();
    localStorage.setItem("df_chat", id);
    setSessionId(id);
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/pay") || pathname.startsWith("/f/")) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || pending) return;
    setInput("");
    const next = [...turns, { role: "user" as const, content: message }];
    setTurns(next);
    setPending(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        sessionId,
        path: pathname,
        history: next.slice(-6).map((t) => ({ role: t.role, content: t.content })),
      }),
    });
    const data = await res.json();
    setTurns((t) => [...t, { role: "assistant", content: data.reply || data.error || "Try again in a moment." }]);
    setPending(false);
  }

  return (
    <div className="fixed bottom-20 left-4 z-40 md:bottom-6">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border hairline bg-[color:var(--bg-elev)] shadow-2xl">
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-cream">
            <div>
              <p className="text-sm font-semibold">Forge assistant</p>
              <p className="text-[11px] text-cream/60">Objections, licenses, Ethiopian checkout</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-4 text-sm">
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "ml-8 rounded-2xl bg-copper px-3 py-2 text-white" : "mr-6 rounded-2xl bg-paper-2 px-3 py-2"}>
                {t.content}
              </div>
            ))}
            {pending && <p className="text-xs text-muted">Thinking…</p>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t hairline p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Is commercial license enough?"
              className="input !py-2 text-sm"
            />
            <button className="btn-primary !px-3 !py-2 text-sm" disabled={pending}>
              Send
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="grid h-12 w-12 place-items-center rounded-full bg-ink text-cream shadow-xl"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open assistant"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
