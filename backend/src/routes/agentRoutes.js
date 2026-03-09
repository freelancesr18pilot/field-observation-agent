/**
 * Express routes for the field observation agent.
 *
 * POST /api/analyze — SSE stream of the ReAct loop + action plan
 * GET  /api/observations — list of sample field observations for the demo
 * GET  /api/beneficiaries — list of beneficiary summaries
 */

import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { runReActLoop } from "../agent/reactLoop.js";
import { generateActionPlan } from "../agent/actionPlan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Load static data once
const observations = JSON.parse(
  readFileSync(join(__dirname, "../../data/observations.json"), "utf-8")
).observations;

const beneficiariesRaw = JSON.parse(
  readFileSync(join(__dirname, "../../data/beneficiaries.json"), "utf-8")
).beneficiaries;

const beneficiarySummaries = beneficiariesRaw.map((b) => ({
  id: b.id,
  name: b.name,
  age: b.age,
  gender: b.gender,
  village: b.village,
  class: b.class,
  riskFactors: b.riskFactors,
  attendanceLastQuarter:
    Object.values(b.attendanceHistory).at(-1) ?? null,
}));

/**
 * GET /api/observations
 * Returns the 10 sample field observations for the demo UI.
 */
router.get("/observations", (req, res) => {
  res.json({ observations });
});

/**
 * GET /api/beneficiaries
 * Returns summary list for display.
 */
router.get("/beneficiaries", (req, res) => {
  res.json({ beneficiaries: beneficiarySummaries });
});

/**
 * POST /api/analyze
 * Body: { observation: string }
 *
 * Responds with an SSE stream:
 *   event: token     — raw streaming tokens from the LLM
 *   event: thought   — parsed Thought from a reasoning step
 *   event: action    — tool being called
 *   event: result    — tool result
 *   event: final     — Final Answer from the ReAct loop
 *   event: plan      — generated action plan (JSON)
 *   event: error     — any error
 *   event: done      — stream complete
 */
router.post("/analyze", async (req, res) => {
  const { observation, lang = "en" } = req.body;

  if (!observation || observation.trim().length < 10) {
    return res.status(400).json({ error: "observation text is required (min 10 chars)" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // Helper to send SSE events
  function sendEvent(eventType, data) {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    // Flush if available (for buffered responses)
    if (typeof res.flush === "function") res.flush();
  }

  // Emit function passed to the ReAct loop
  function emit(type, data) {
    sendEvent(type, data);
  }

  try {
    // Run the ReAct reasoning loop
    const { finalAnswer, conversationHistory } = await runReActLoop(
      observation,
      emit,
      lang
    );

    // Generate the structured action plan
    sendEvent("status", { message: "Generating action plan..." });

    const plan = await generateActionPlan(finalAnswer, conversationHistory, lang);
    sendEvent("plan", plan);
  } catch (err) {
    console.error("Agent error:", err);
    sendEvent("error", { message: err.message || "An unexpected error occurred" });
  } finally {
    sendEvent("done", {});
    res.end();
  }
});

export default router;
