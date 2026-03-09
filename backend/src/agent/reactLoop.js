/**
 * ReAct (Reasoning + Acting) agent loop.
 *
 * Flow per iteration:
 *   1. Call LLM (streaming) → get Thought + Action
 *   2. Parse Action → execute tool → get Result
 *   3. Append Result to conversation history
 *   4. Repeat until "Final Answer:" or max iterations reached
 *
 * SSE events emitted via `emit(type, data)`:
 *   { type: "thought",  data: { content: string } }
 *   { type: "token",    data: { content: string } }   ← streaming tokens
 *   { type: "action",   data: { tool: string, params: object } }
 *   { type: "result",   data: { content: string } }
 *   { type: "final",    data: { content: string } }
 *   { type: "error",    data: { message: string } }
 */

import { streamCompletion } from "../providers/claudeProvider.js";
import { TOOL_DESCRIPTIONS, executeTool } from "../tools/index.js";

const MAX_ITERATIONS = 6;

const HINDI_LANG_INSTRUCTION = `

भाषा आवश्यकता — अनिवार्य: आपको संपूर्ण विश्लेषण हिंदी में करना है।
- प्रत्येक Thought हिंदी में होना चाहिए
- Final Answer हिंदी में होना चाहिए
- Tool के नाम (जैसे get_beneficiary_history) और JSON parameter keys अंग्रेज़ी में रखें
- बाकी सब कुछ हिंदी में लिखें

सही format का उदाहरण:
Thought: [हिंदी में आपका तर्क]
Action: get_beneficiary_history({"query": "Priya"})
Final Answer: [हिंदी में अंतिम मूल्यांकन]`;

function buildSystemPrompt(lang) {
  const base = `You are an experienced NGO field coordinator helping field workers support children's education outcomes in rural India.

A field worker has submitted a raw, messy observation about a child. Your job is to reason through it step-by-step, gather data using tools, and build a complete picture of the situation.

${TOOL_DESCRIPTIONS}

REASONING FORMAT — you MUST follow this exactly. NO markdown, NO bold, NO bullet points. Plain text only.

Thought: <your reasoning about what you know and what you need to find out>
Action: <tool_name>({"param": "value"})

After receiving a Result, continue with another Thought/Action pair. When you have gathered enough information (usually 2-4 tool calls), write:

Thought: <final synthesis of all findings>
Final Answer: <concise summary: who the child is, what the key issues are, what risk level you assess, and which interventions are most relevant>

CRITICAL RULES:
- Output ONLY plain text. Do NOT use **, *, #, or any other markdown.
- The word "Thought:" must appear at the start of a line, followed by a colon, nothing else.
- The word "Action:" must appear at the start of a line, followed by the tool call.
- Always start by looking up the beneficiary to get their ID and profile
- Always check scheme eligibility once you have a beneficiary ID
- Always check community patterns to understand the systemic context
- Be specific — cite actual data from the results (attendance percentages, scheme names, risk factors)
- Your Final Answer should be 3-5 sentences that will be used to generate an action plan`;

  return lang === "hi" ? base + HINDI_LANG_INSTRUCTION : base;
}

/**
 * Strip markdown bold/italic markers so parsers work even if the model
 * ignores the "no markdown" instruction.
 */
function stripMarkdown(text) {
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
}

/**
 * Parses the LLM text for an Action line.
 * Returns { toolName, params } or null.
 */
function parseAction(text) {
  const clean = stripMarkdown(text);
  // Match: Action: tool_name({"key": "val"})  — JSON may span multiple lines
  const actionMatch = clean.match(/Action:\s*(\w+)\(\s*(\{[\s\S]*?\})\s*\)/);
  if (!actionMatch) return null;

  const toolName = actionMatch[1];
  let params = {};
  try {
    params = JSON.parse(actionMatch[2]);
  } catch {
    params = { query: actionMatch[2].replace(/[{}"]/g, "").trim() };
  }

  return { toolName, params };
}

/**
 * Parses the LLM text for a Final Answer.
 */
function parseFinalAnswer(text) {
  const clean = stripMarkdown(text);
  const match = clean.match(/Final Answer:\s*([\s\S]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Extracts the Thought content from the text.
 */
function parseThought(text) {
  const clean = stripMarkdown(text);
  const match = clean.match(/Thought:\s*([\s\S]*?)(?=Action:|Final Answer:|$)/);
  return match ? match[1].trim() : clean.trim();
}

/**
 * Main ReAct loop. Streams reasoning steps via `emit`.
 * Returns the final answer string when complete.
 */
export async function runReActLoop(observationText, emit, lang = "en") {
  const systemPrompt = buildSystemPrompt(lang);

  const messages = [
    {
      role: "user",
      content: `Field worker observation:\n\n"${observationText}"\n\nReason through this step by step. Start by identifying who the child is and searching for their record.`,
    },
  ];

  let finalAnswer = null;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS && !finalAnswer) {
    iterations++;

    // Buffer to accumulate streaming tokens for this iteration
    let iterationBuffer = "";

    // Stream this LLM call, emitting tokens as they arrive
    await streamCompletion(messages, systemPrompt, (token) => {
      iterationBuffer += token;
      emit("token", { content: token });
    });

    // Parse what we got
    const thought = parseThought(iterationBuffer);
    const action = parseAction(iterationBuffer);
    const final = parseFinalAnswer(iterationBuffer);

    // Emit the thought as a discrete event (for the UI to display cleanly)
    if (thought) {
      emit("thought", { content: thought, iteration: iterations });
    }

    if (final) {
      finalAnswer = final;
      emit("final", { content: final });

      // Append to messages for context in action plan generation
      messages.push({ role: "assistant", content: iterationBuffer });
      break;
    }

    if (action) {
      emit("action", { tool: action.toolName, params: action.params, iteration: iterations });

      // Execute the tool
      const toolResult = executeTool(action.toolName, action.params);
      const resultText = JSON.stringify(toolResult, null, 2);

      emit("result", {
        tool: action.toolName,
        content: resultText,
        iteration: iterations,
      });

      // Build the assistant + user (result injection) turn
      messages.push({ role: "assistant", content: iterationBuffer });
      messages.push({
        role: "user",
        content: `Result:\n${resultText}\n\nContinue your reasoning.`,
      });
    } else {
      // No action and no final answer — model deviated from the format.
      // Log raw output server-side for debugging and stop gracefully.
      console.error("[ReAct] Unexpected output (no Action or Final Answer):\n", iterationBuffer.slice(0, 500));
      emit("error", {
        message: "Agent output did not match expected format (Thought/Action or Final Answer). The model may have added unexpected formatting.",
      });
      break;
    }
  }

  if (!finalAnswer && iterations >= MAX_ITERATIONS) {
    finalAnswer = "Maximum reasoning iterations reached. Please review the gathered data above.";
    emit("final", { content: finalAnswer });
  }

  return { finalAnswer, conversationHistory: messages };
}
