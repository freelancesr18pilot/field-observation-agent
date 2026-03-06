import { useEffect, useRef } from "react";
import styles from "./ReasoningChain.module.css";

const STEP_ICONS = {
  thought: "💭",
  action: "⚡",
  result: "📋",
  final: "✅",
  error: "⚠️",
  status: "⏳",
};

const TOOL_LABELS = {
  get_beneficiary_history: "Get Beneficiary History",
  check_scheme_eligibility: "Check Scheme Eligibility",
  find_community_patterns: "Find Community Patterns",
};

function ThoughtStep({ step }) {
  return (
    <div className={`${styles.step} ${styles.thought}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>💭</span>
        <span className={styles.label}>Thought</span>
        {step.iteration && (
          <span className={styles.iteration}>Step {step.iteration}</span>
        )}
      </div>
      <div className={styles.stepContent}>{step.content}</div>
    </div>
  );
}

function ActionStep({ step }) {
  return (
    <div className={`${styles.step} ${styles.action}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>⚡</span>
        <span className={styles.label}>
          {TOOL_LABELS[step.tool] || step.tool}
        </span>
      </div>
      <div className={styles.stepContent}>
        <code className={styles.toolCall}>
          {step.tool}(
          {JSON.stringify(step.params)}
          )
        </code>
      </div>
    </div>
  );
}

function ResultStep({ step }) {
  let parsed = null;
  try {
    parsed = JSON.parse(step.content);
  } catch {
    parsed = null;
  }

  return (
    <div className={`${styles.step} ${styles.result}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>📋</span>
        <span className={styles.label}>Result from {TOOL_LABELS[step.tool] || step.tool}</span>
      </div>
      <div className={styles.stepContent}>
        {parsed ? (
          <ResultSummary data={parsed} tool={step.tool} />
        ) : (
          <pre className={styles.raw}>{step.content}</pre>
        )}
      </div>
    </div>
  );
}

function ResultSummary({ data, tool }) {
  if (tool === "get_beneficiary_history" && data.found && data.beneficiaries) {
    const b = data.beneficiaries[0];
    const m = b.computedMetrics;
    return (
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <strong>{b.name}</strong> — {b.age}yr, Class {b.class}, {b.village}
        </div>
        <div className={styles.summaryRow}>
          Attendance avg: <strong>{m.averageAttendance}%</strong> ({m.attendanceTrend})
          &nbsp;·&nbsp; Risk: <RiskBadge level={m.riskLevel} />
        </div>
        <div className={styles.summaryRow}>
          Risk factors: {b.riskFactors.join(", ") || "none"}
        </div>
        <div className={styles.summaryRow}>
          Enrolled schemes: {b.schemes.join(", ")}
        </div>
        {b.previousInterventions.length > 0 && (
          <div className={styles.summaryRow}>
            Last intervention: {b.previousInterventions.at(-1).type} (
            {b.previousInterventions.at(-1).outcome})
          </div>
        )}
      </div>
    );
  }

  if (tool === "check_scheme_eligibility" && data.eligibleButNotEnrolled) {
    return (
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <strong>{data.beneficiaryName}</strong> — enrolled in{" "}
          {data.alreadyEnrolled.length} schemes
        </div>
        {data.eligibleButNotEnrolled.length > 0 ? (
          <div className={styles.summaryRow}>
            <strong className={styles.highlight}>
              Eligible but NOT enrolled ({data.eligibleButNotEnrolled.length}):
            </strong>{" "}
            {data.eligibleButNotEnrolled.map((s) => s.name).join(", ")}
          </div>
        ) : (
          <div className={styles.summaryRow}>All applicable schemes enrolled.</div>
        )}
      </div>
    );
  }

  if (tool === "find_community_patterns" && data.found) {
    return (
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <strong>{data.village}</strong> — avg attendance {data.attendancePatterns.averageAttendance}%,
          dropout rate {data.attendancePatterns.dropoutRateAnnual}%/yr
        </div>
        {data.alerts && (
          <div className={`${styles.summaryRow} ${styles.alert}`}>
            {data.alerts}
          </div>
        )}
        <div className={styles.summaryRow}>
          {data.attendancePatterns.currentMonthAlert}
        </div>
        <div className={styles.summaryRow}>
          Primary risks: {data.primaryRiskFactors.join(", ")}
        </div>
      </div>
    );
  }

  // Fallback: raw JSON (collapsed)
  return (
    <details>
      <summary className={styles.rawToggle}>View raw data</summary>
      <pre className={styles.raw}>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

function RiskBadge({ level }) {
  const colors = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#22c55e",
  };
  return (
    <span
      style={{
        color: colors[level] || "#666",
        fontWeight: 600,
        textTransform: "uppercase",
        fontSize: "11px",
      }}
    >
      {level}
    </span>
  );
}

function FinalStep({ step }) {
  return (
    <div className={`${styles.step} ${styles.final}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>✅</span>
        <span className={styles.label}>Agent Assessment</span>
      </div>
      <div className={styles.stepContent}>{step.content}</div>
    </div>
  );
}

function StreamingLine({ text }) {
  return (
    <div className={styles.streamingLine}>
      <span className={styles.cursor} />
      <span className={styles.streamingText}>{text}</span>
    </div>
  );
}

export default function ReasoningChain({ steps, streamingText, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps, streamingText]);

  if (steps.length === 0 && !isLoading) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Reasoning Chain</h2>
        {isLoading && (
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            Live
          </span>
        )}
      </div>

      <div className={styles.chain}>
        {steps.map((step, i) => {
          switch (step.type) {
            case "thought":
              return <ThoughtStep key={i} step={step} />;
            case "action":
              return <ActionStep key={i} step={step} />;
            case "result":
              return <ResultStep key={i} step={step} />;
            case "final":
              return <FinalStep key={i} step={step} />;
            case "error":
              return (
                <div key={i} className={`${styles.step} ${styles.error}`}>
                  <div className={styles.stepHeader}>
                    <span className={styles.icon}>⚠️</span>
                    <span className={styles.label}>Error</span>
                  </div>
                  <div className={styles.stepContent}>{step.message}</div>
                </div>
              );
            default:
              return null;
          }
        })}

        {/* Live streaming buffer for the current LLM call */}
        {isLoading && streamingText && (
          <div className={`${styles.step} ${styles.streaming}`}>
            <div className={styles.stepHeader}>
              <span className={styles.icon}>💭</span>
              <span className={styles.label}>Thinking...</span>
            </div>
            <div className={styles.stepContent}>
              <StreamingLine text={streamingText} />
            </div>
          </div>
        )}

        {isLoading && !streamingText && (
          <div className={styles.thinkingPlaceholder}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
