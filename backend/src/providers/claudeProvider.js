/**
 * Claude API provider — abstracted behind this module so the agent layer
 * never imports the SDK directly. Swap for Kaapi or any other provider by
 * implementing the same interface below.
 *
 * Interface:
 *   streamCompletion(messages, systemPrompt, onToken) => Promise<string>
 *   complete(messages, systemPrompt) => Promise<string>
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

/**
 * Streams a completion. Calls onToken(text) for each text delta.
 * Returns the full assembled text when done.
 */
export async function streamCompletion(messages, systemPrompt, onToken) {
  let fullText = "";

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      const text = chunk.delta.text;
      fullText += text;
      if (onToken) onToken(text);
    }
  }

  return fullText;
}

/**
 * Non-streaming completion. Used for the final action plan call where we
 * want the full JSON before sending it to the client.
 */
export async function complete(messages, systemPrompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages,
  });

  return response.content[0].text;
}
