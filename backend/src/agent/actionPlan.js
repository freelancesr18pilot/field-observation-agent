/**
 * Action Plan Generator — second LLM call.
 *
 * Takes the ReAct loop's final answer + conversation history and produces a
 * structured, field-worker-friendly action plan with three tiers:
 *   - immediate  (do within 48 hours)
 *   - mediumTerm (do within 2-4 weeks)
 *   - escalation (if situation worsens or blockers emerge)
 *
 * Returns a parsed JSON object.
 */

import { complete } from "../providers/claudeProvider.js";

const ACTION_PLAN_SYSTEM = `You are an expert NGO program coordinator generating action plans for field workers in rural India.

Based on the ReAct reasoning chain provided, generate a structured action plan in valid JSON format.

The plan must be practical, specific, and actionable for a field worker with limited resources. Use simple language — the field worker may not have high digital literacy.

Output ONLY valid JSON matching this schema exactly:
{
  "childName": "string",
  "village": "string",
  "riskLevel": "high|medium|low",
  "primaryIssues": ["string"],
  "immediate": [
    {
      "action": "string (clear, 1-sentence task)",
      "owner": "string (field worker / teacher / CWC / etc)",
      "deadline": "string (e.g. 'Within 24 hours', 'By this week')",
      "note": "string (optional context or how-to)"
    }
  ],
  "mediumTerm": [
    {
      "action": "string",
      "owner": "string",
      "deadline": "string",
      "note": "string"
    }
  ],
  "escalation": [
    {
      "trigger": "string (condition that would require this)",
      "action": "string",
      "contact": "string (who to call/report to)"
    }
  ],
  "schemesToEnroll": ["string (scheme name and benefit)"],
  "successIndicators": ["string (how we know the intervention worked)"]
}

CONSTRAINTS — keep the JSON compact:
- immediate: max 4 items
- mediumTerm: max 4 items
- escalation: max 3 items
- schemesToEnroll: max 4 items
- successIndicators: max 3 items
- All string values must be concise (1-2 sentences max)

Be specific. Use real scheme names. Name the relevant government bodies (CWC, DCPO, Block Education Officer, etc.). Do not be generic.`;

const HINDI_ACTION_PLAN_INSTRUCTION = `

भाषा आवश्यकता — अनिवार्य: JSON की सभी string values हिंदी में लिखें।
JSON keys (childName, village, riskLevel, action, owner, deadline, note, trigger, contact) अंग्रेज़ी में रखें।
riskLevel की value "high", "medium", या "low" ही रहनी चाहिए (अंग्रेज़ी में)।
बाकी सभी text values हिंदी में लिखें।`;

export async function generateActionPlan(finalAnswer, conversationHistory, lang = "en") {
  const systemPrompt = lang === "hi"
    ? ACTION_PLAN_SYSTEM + HINDI_ACTION_PLAN_INSTRUCTION
    : ACTION_PLAN_SYSTEM;
  // Extract only the text turns (skip raw tool result turns which are large JSON blobs).
  // We keep assistant turns (thoughts/actions) and the final answer summary.
  // This prevents the input from overflowing and leaving too few tokens for output.
  const condensedHistory = conversationHistory
    .filter((m) => m.role === "assistant")
    .map((m) => ({ role: "assistant", content: m.content }));

  const messages = [
    ...condensedHistory,
    {
      role: "user",
      content: `Based on the reasoning above and this final assessment:

"${finalAnswer}"

Generate a structured action plan as valid JSON. Be specific: use real scheme names, name the correct government bodies (CWC, DCPO, Block Education Officer, etc.), and keep language simple for a field worker.`,
    },
  ];

  const rawResponse = await complete(messages, systemPrompt);

  // Extract JSON — handle markdown code fences or bare JSON
  const jsonMatch =
    rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    rawResponse.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Action plan response did not contain valid JSON. Raw: " + rawResponse.slice(0, 200));
  }

  const jsonStr = jsonMatch[1].trim();

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    // Surface a clearer error that includes where the parse failed
    throw new Error(`JSON parse failed: ${err.message}. Check max_tokens or model output.`);
  }
}
