import { NextRequest } from "next/server";
import { openai, buildSystemPrompt, type AiAction } from "@/lib/openai";

export const runtime = "edge";

// POST /api/ai/complete
// body: { action: AiAction, text: string, instruction?: string, context?: string }
// Streams back plain-text tokens (text/event-stream-like chunked response).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.action || typeof body.text !== "string") {
    return new Response("Missing 'action' or 'text'", { status: 400 });
  }

  const action = body.action as AiAction;
  const { text, instruction, context } = body as {
    text: string;
    instruction?: string;
    context?: string;
  };

  const userContent = [
    context ? `Document context (for tone/continuity only, do not repeat it):\n"""${context.slice(-4000)}"""` : null,
    action === "custom" && instruction ? `Instruction: ${instruction}` : null,
    `Text:\n"""${text.slice(0, 8000)}"""`
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: action === "fix" ? 0.2 : 0.7,
      stream: true,
      messages: [
        { role: "system", content: buildSystemPrompt(action) },
        { role: "user", content: userContent }
      ]
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          controller.error(err);
          return;
        }
        controller.close();
      }
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (err: any) {
    return new Response(err?.message || "AI completion failed", { status: 500 });
  }
}
