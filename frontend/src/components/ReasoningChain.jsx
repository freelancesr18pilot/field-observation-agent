import { useEffect, useRef } from "react";
import styles from "./ReasoningChain.module.css";
import { useT } from "../LanguageContext.jsx";

function ThoughtStep({ step, t }) {
  return (
    <div className={`${styles.step} ${styles.thought}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>💭</span>
        <span className={styles.label}>{t("thought")}</span>
        {step.iteration && (
          <span className={styles.iteration}>{t("step")} {step.iteration}</span>
        )}
      </div>
      <div className={styles.stepContent}>{step.content}</div>
    </div>
  );
}

function ActionStep({ step, t }) {
  const toolLabels = {
    get_beneficiary_history: t("toolBeneficiary"),
    check_scheme_eligibility: t("toolScheme"),
    find_community_patterns: t("toolCommunity"),
  };

  return (
    <div className={`${styles.step} ${styles.action}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>⚡</span>
        <span className={styles.label}>{toolLabels[step.tool] || step.tool}</span>
      </div>
      <div className={styles.stepContent}>
        <code className={styles.toolCall}>
          {step.tool}({JSON.stringify(step.params)})
        </code>
      </div>
    </div>
  );
}

function ResultStep({ step, t }) {
  let parsed = null;
  try {
    parsed = JSON.parse(step.content);
  } catch {
    parsed = null;
  }

  const toolLabels = {
    get_beneficiary_history: t("toolBeneficiary"),
    check_scheme_eligibility: t("toolScheme"),
    find_community_patterns: t("toolCommunity"),
  };

  return (
    <div className={`${styles.step} ${styles.result}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>📋</span>
        <span className={styles.label}>{t("resultFrom")} {toolLabels[step.tool] || step.tool}</span>
      </div>
      <div className={styles.stepContent}>
        {parsed ? (
          <ResultSummary data={parsed} tool={step.tool} t={t} />
        ) : (
          <pre className={styles.raw}>{step.content}</pre>
        )}
      </div>
    </div>
  );
}

function ResultSummary({ data, tool, t }) {
  if (tool === "get_beneficiary_history" && data.found && data.beneficiaries) {
    const b = data.beneficiaries[0];
    const m = b.computedMetrics;
    return (
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <strong>{b.name}</strong> — {b.age}yr, Class {b.class}, {b.village}
        </div>
        <div className={styles.summaryRow}>
          {t("attendanceAvg")}: <strong>{m.averageAttendance}%</strong> ({m.attendanceTrend})
          &nbsp;·&nbsp; {t("risk")}: <RiskBadge level={m.riskLevel} />
        </div>
        <div className={styles.summaryRow}>
          {t("riskFactors")}: {b.riskFactors.join(", ") || t("none")}
        </div>
        <div className={styles.summaryRow}>
          {t("enrolledSchemes")}: {b.schemes.join(", ")}
        </div>
        {b.previousInterventions.length > 0 && (
          <div className={styles.summaryRow}>
            {t("lastIntervention")}: {b.previousInterventions.at(-1).type} (
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
          <strong>{data.beneficiaryName}</strong> — {t("enrolledIn")}{" "}
          {data.alreadyEnrolled.length} {t("schemes")}
        </div>
        {data.eligibleButNotEnrolled.length > 0 ? (
          <div className={styles.summaryRow}>
            <strong className={styles.highlight}>
              {t("eligibleNotEnrolled")} ({data.eligibleButNotEnrolled.length}):
            </strong>{" "}
            {data.eligibleButNotEnrolled.map((s) => s.name).join(", ")}
          </div>
        ) : (
          <div className={styles.summaryRow}>{t("allSchemesEnrolled")}</div>
        )}
      </div>
    );
  }

  if (tool === "find_community_patterns" && data.found) {
    return (
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <strong>{data.village}</strong> — {t("avgAttendance")} {data.attendancePatterns.averageAttendance}%,
          {t("dropoutRate")} {data.attendancePatterns.dropoutRateAnnual}%/yr
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
          {t("primaryRisks")}: {data.primaryRiskFactors.join(", ")}
        </div>
      </div>
    );
  }

  return (
    <details>
      <summary className={styles.rawToggle}>{t("viewRaw")}</summary>
      <pre className={styles.raw}>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

function RiskBadge({ level }) {
  const colors = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  return (
    <span style={{ color: colors[level] || "#666", fontWeight: 600, textTransform: "uppercase", fontSize: "11px" }}>
      {level}
    </span>
  );
}

function FinalStep({ step, t }) {
  return (
    <div className={`${styles.step} ${styles.final}`}>
      <div className={styles.stepHeader}>
        <span className={styles.icon}>✅</span>
        <span className={styles.label}>{t("agentAssessment")}</span>
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
  const t = useT();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps, streamingText]);

  if (steps.length === 0 && !isLoading) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("reasoningTitle")}</h2>
        {isLoading && (
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            {t("live")}
          </span>
        )}
      </div>

      <div className={styles.chain}>
        {steps.map((step, i) => {
          switch (step.type) {
            case "thought":
              return <ThoughtStep key={i} step={step} t={t} />;
            case "action":
              return <ActionStep key={i} step={step} t={t} />;
            case "result":
              return <ResultStep key={i} step={step} t={t} />;
            case "final":
              return <FinalStep key={i} step={step} t={t} />;
            case "error":
              return (
                <div key={i} className={`${styles.step} ${styles.error}`}>
                  <div className={styles.stepHeader}>
                    <span className={styles.icon}>⚠️</span>
                    <span className={styles.label}>{t("error")}</span>
                  </div>
                  <div className={styles.stepContent}>{step.message}</div>
                </div>
              );
            default:
              return null;
          }
        })}

        {isLoading && streamingText && (
          <div className={`${styles.step} ${styles.streaming}`}>
            <div className={styles.stepHeader}>
              <span className={styles.icon}>💭</span>
              <span className={styles.label}>{t("thinking")}</span>
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
