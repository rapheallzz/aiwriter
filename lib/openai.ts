import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "[ai-writer] OPENAI_API_KEY is not set. AI completion routes will fail until it is configured."
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export type AiAction = "continue" | "improve" | "shorten" | "expand" | "fix" | "summarize" | "custom";

const ACTION_INSTRUCTIONS: Record<AiAction, string> = {
  continue:
    "Continue writing directly from where the text leaves off. Match the existing tone, voice, and formatting. Do not repeat what's already written. Output only the new text to append.",
  improve:
    "Rewrite the selected text to improve clarity, flow, and word choice while preserving its original meaning and length. Output only the rewritten text.",
  shorten:
    "Rewrite the selected text to be noticeably more concise while preserving its key meaning. Output only the rewritten text.",
  expand:
    "Elaborate on the selected text, adding relevant detail and depth while preserving its meaning and voice. Output only the expanded text.",
  fix: "Fix grammar, spelling, and punctuation errors in the selected text without changing its meaning, tone, or style. Output only the corrected text.",
  summarize:
    "Summarize the selected text into a short, clear summary capturing the key points. Output only the summary.",
  custom: "Follow the user's custom instruction precisely, applying it to the provided text. Output only the resulting text."
};

export function buildSystemPrompt(action: AiAction) {
  return `You are an embedded AI writing assistant inside a document editor, similar to Notion AI. ${ACTION_INSTRUCTIONS[action]} Never wrap output in markdown code fences, never add commentary, prefixes like "Here is...", or quotation marks around the result. Return plain text (light markdown for emphasis/lists is fine if the surrounding document uses it).`;
}
