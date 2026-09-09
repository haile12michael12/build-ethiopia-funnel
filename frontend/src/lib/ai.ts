type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export async function completeChat(messages: ChatTurn[], opts?: { json?: boolean; timeoutMs?: number; maxTokens?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (process.env.OPENAI_API_KEY) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.4,
          max_tokens: opts?.maxTokens ?? 400,
          response_format: opts?.json ? { type: "json_object" } : undefined,
          messages,
        }),
      });
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
    if (process.env.ANTHROPIC_API_KEY) {
      const system = messages.find((m) => m.role === "system")?.content;
      const rest = messages.filter((m) => m.role !== "system");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
          max_tokens: opts?.maxTokens ?? 400,
          system,
          messages: rest.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        }),
      });
      const data = (await res.json()) as { content?: { text?: string }[] };
      return data.content?.[0]?.text?.trim() || null;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
