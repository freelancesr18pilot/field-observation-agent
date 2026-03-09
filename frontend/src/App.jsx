import { useState, useRef, useCallback } from "react";
import ObservationInput from "./components/ObservationInput.jsx";
import ReasoningChain from "./components/ReasoningChain.jsx";
import ActionPlan from "./components/ActionPlan.jsx";
import styles from "./App.module.css";
import { API_BASE } from "./config.js";
import { useLang, useT } from "./LanguageContext.jsx";

export default function App() {
  const { lang, setLang } = useLang();
  const t = useT();

  const [steps, setSteps] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [actionPlan, setActionPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const handleSubmit = useCallback(async (observationText) => {
    setSteps([]);
    setStreamingText("");
    setActionPlan(null);
    setError(null);
    setIsLoading(true);

    let tokenBuffer = "";
    let expectingNewThought = true;

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: observationText, lang }),
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

        const lines = buffer.split("\n");
        buffer = lines.pop();

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (currentEvent) {
                case "token":
                  if (expectingNewThought) {
                    tokenBuffer += data.content;
                    setStreamingText(tokenBuffer);
                  }
                  break;
                case "thought":
                  tokenBuffer = "";
                  setStreamingText("");
                  expectingNewThought = false;
                  setSteps((prev) => [...prev, { type: "thought", ...data }]);
                  break;
                case "action":
                  setSteps((prev) => [...prev, { type: "action", ...data }]);
                  break;
                case "result":
                  expectingNewThought = true;
                  tokenBuffer = "";
                  setStreamingText("");
                  setSteps((prev) => [...prev, { type: "result", ...data }]);
                  break;
                case "final":
                  tokenBuffer = "";
                  setStreamingText("");
                  expectingNewThought = false;
                  setSteps((prev) => [...prev, { type: "final", ...data }]);
                  break;
                case "plan":
                  setActionPlan(data);
                  break;
                case "error":
                  setSteps((prev) => [...prev, { type: "error", ...data }]);
                  setError(data.message);
                  break;
                case "done":
                  setIsLoading(false);
                  break;
              }
            } catch {
              // Malformed SSE line — ignore
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
  }, [lang]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🏫</span>
            <div>
              <div className={styles.logoTitle}>{t("appTitle")}</div>
              <div className={styles.logoSub}>{t("appSub")}</div>
            </div>
          </div>
          <div className={styles.headerMeta}>
            <div className={styles.langToggle}>
              <button
                className={`${styles.langBtn} ${lang === "en" ? styles.langActive : ""}`}
                onClick={() => setLang("en")}
                aria-label="Switch to English"
              >
                EN
              </button>
              <span className={styles.langDivider}>|</span>
              <button
                className={`${styles.langBtn} ${lang === "hi" ? styles.langActive : ""}`}
                onClick={() => setLang("hi")}
                aria-label="हिंदी में बदलें"
              >
                हिं
              </button>
            </div>
            <span className={styles.badge}>{t("badge")}</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className="container">
          <div className={styles.intro}>
            <div className={styles.introText}>
              <strong>{lang === "hi" ? "यह कैसे काम करता है:" : "How it works:"}</strong>{" "}
              {t("introText")}{" "}
              <span className={styles.highlight}>{t("introReact")}</span>{" "}
              {t("introText2")}
            </div>
            <div className={styles.introPipeline}>
              <span className={styles.pipeStep} style={{ background: "var(--thought-bg)", color: "var(--thought-text)" }}>{t("stepThought")}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.pipeStep} style={{ background: "var(--action-bg)", color: "var(--action-text)" }}>{t("stepAction")}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.pipeStep} style={{ background: "var(--result-bg)", color: "var(--result-text)" }}>{t("stepResult")}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.pipeStep} style={{ background: "var(--final-bg)", color: "var(--final-text)" }}>{t("stepPlan")}</span>
            </div>
          </div>

          <ObservationInput onSubmit={handleSubmit} isLoading={isLoading} />

          {error && (
            <div className={styles.errorBanner}>
              <strong>{t("error")}:</strong> {error}
            </div>
          )}

          <ReasoningChain steps={steps} streamingText={streamingText} isLoading={isLoading} />

          {actionPlan && <ActionPlan plan={actionPlan} />}
        </div>
      </main>

      <footer className={styles.footer}>
        <div className="container">{t("footer")}</div>
      </footer>
    </div>
  );
}
