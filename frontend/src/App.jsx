import { useState, useRef, useCallback } from "react";
import ObservationInput from "./components/ObservationInput.jsx";
import ReasoningChain from "./components/ReasoningChain.jsx";
import ActionPlan from "./components/ActionPlan.jsx";
import styles from "./App.module.css";
import { API_BASE } from "./config.js";

export default function App() {
  const [steps, setSteps] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [actionPlan, setActionPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const handleSubmit = useCallback(async (observationText) => {
    // Reset state
    setSteps([]);
    setStreamingText("");
    setActionPlan(null);
    setError(null);
    setIsLoading(true);

    // Token buffer for the current LLM streaming window
    let tokenBuffer = "";
    // Track if we're between thoughts (after a result arrives, clear buffer)
    let expectingNewThought = true;

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: observationText }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete last line

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (currentEvent) {
                case "token":
                  // Stream token into the buffer (shown live while LLM speaks)
                  if (expectingNewThought) {
                    tokenBuffer += data.content;
                    setStreamingText(tokenBuffer);
                  }
                  break;

                case "thought":
                  // A discrete thought was parsed — add it as a step
                  tokenBuffer = "";
                  setStreamingText("");
                  expectingNewThought = false;
                  setSteps((prev) => [...prev, { type: "thought", ...data }]);
                  break;

                case "action":
                  // Tool call identified
                  setSteps((prev) => [...prev, { type: "action", ...data }]);
                  break;

                case "result":
                  // Tool returned a result — next thing will be a new thought
                  expectingNewThought = true;
                  tokenBuffer = "";
                  setStreamingText("");
                  setSteps((prev) => [...prev, { type: "result", ...data }]);
                  break;

                case "final":
                  // Final answer from the ReAct loop
                  tokenBuffer = "";
                  setStreamingText("");
                  expectingNewThought = false;
                  setSteps((prev) => [...prev, { type: "final", ...data }]);
                  break;

                case "plan":
                  // Structured action plan
                  setActionPlan(data);
                  break;

                case "error":
                  setSteps((prev) => [...prev, { type: "error", ...data }]);
                  setError(data.message);
                  break;

                case "status":
                  // Informational only, no UI change needed
                  break;

                case "done":
                  setIsLoading(false);
                  break;
              }
            } catch {
              // Malformed JSON in SSE line — ignore
            }
            currentEvent = null;
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setStreamingText("");
    }
  }, []);

  return (
    <div className={styles.app}>
      {/* Top bar */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🏫</span>
            <div>
              <div className={styles.logoTitle}>Field Observation Agent</div>
              <div className={styles.logoSub}>Education NGO · ReAct AI System</div>
            </div>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.badge}>Demo</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className="container">

          {/* Intro banner */}
          <div className={styles.intro}>
            <div className={styles.introText}>
              <strong>How it works:</strong> Submit a raw field note about a child.
              The AI agent reasons through it using a{" "}
              <span className={styles.highlight}>ReAct loop</span> — searching
              beneficiary records, checking scheme eligibility, and analyzing
              community patterns — then generates a structured action plan.
            </div>
            <div className={styles.introPipeline}>
              <span className={styles.pipeStep} style={{ background: "var(--thought-bg)", color: "var(--thought-text)" }}>💭 Thought</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.pipeStep} style={{ background: "var(--action-bg)", color: "var(--action-text)" }}>⚡ Action</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.pipeStep} style={{ background: "var(--result-bg)", color: "var(--result-text)" }}>📋 Result</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.pipeStep} style={{ background: "var(--final-bg)", color: "var(--final-text)" }}>✅ Plan</span>
            </div>
          </div>

          {/* Input */}
          <ObservationInput onSubmit={handleSubmit} isLoading={isLoading} />

          {/* Error banner */}
          {error && (
            <div className={styles.errorBanner}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Reasoning Chain */}
          <ReasoningChain
            steps={steps}
            streamingText={streamingText}
            isLoading={isLoading}
          />

          {/* Action Plan */}
          {actionPlan && <ActionPlan plan={actionPlan} />}
        </div>
      </main>

      <footer className={styles.footer}>
        <div className="container">
          Built for Tech4Dev · Powered by Claude API · ReAct Agent Architecture
        </div>
      </footer>
    </div>
  );
}
