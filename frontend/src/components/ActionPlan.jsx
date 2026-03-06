import styles from "./ActionPlan.module.css";

const RISK_CONFIG = {
  high: { label: "HIGH RISK", color: "#ef4444", bg: "#fef2f2" },
  medium: { label: "MEDIUM RISK", color: "#f59e0b", bg: "#fffbeb" },
  low: { label: "LOW RISK", color: "#22c55e", bg: "#f0fdf4" },
};

function RiskBadge({ level }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.medium;
  return (
    <span
      className={styles.riskBadge}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function ActionCard({ action, index }) {
  return (
    <div className={styles.actionCard}>
      <div className={styles.actionNum}>{index + 1}</div>
      <div className={styles.actionBody}>
        <div className={styles.actionText}>{action.action}</div>
        <div className={styles.actionMeta}>
          {action.owner && (
            <span className={styles.metaTag}>
              <span className={styles.metaIcon}>👤</span>
              {action.owner}
            </span>
          )}
          {action.deadline && (
            <span className={styles.metaTag}>
              <span className={styles.metaIcon}>📅</span>
              {action.deadline}
            </span>
          )}
        </div>
        {action.note && (
          <div className={styles.actionNote}>{action.note}</div>
        )}
      </div>
    </div>
  );
}

function EscalationCard({ item, index }) {
  return (
    <div className={styles.escalationCard}>
      <div className={styles.escalationTrigger}>
        <span className={styles.triggerIcon}>⚠️</span>
        <strong>If:</strong> {item.trigger}
      </div>
      <div className={styles.escalationAction}>
        <strong>Then:</strong> {item.action}
      </div>
      {item.contact && (
        <div className={styles.escalationContact}>
          <span className={styles.metaIcon}>📞</span> Contact: {item.contact}
        </div>
      )}
    </div>
  );
}

export default function ActionPlan({ plan }) {
  if (!plan) return null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Action Plan</h2>
          <div className={styles.meta}>
            <strong>{plan.childName}</strong>
            {plan.village && <span> · {plan.village}</span>}
          </div>
        </div>
        <RiskBadge level={plan.riskLevel} />
      </div>

      {/* Primary Issues */}
      {plan.primaryIssues?.length > 0 && (
        <div className={styles.issues}>
          {plan.primaryIssues.map((issue, i) => (
            <span key={i} className={styles.issueTag}>
              {issue}
            </span>
          ))}
        </div>
      )}

      {/* Immediate Actions */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🚨</span>
          <h3>Immediate Actions</h3>
          <span className={styles.sectionBadge}>Within 48 hours</span>
        </div>
        <div className={styles.actionList}>
          {plan.immediate?.map((action, i) => (
            <ActionCard key={i} action={action} index={i} />
          ))}
        </div>
      </section>

      {/* Medium-Term */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>📅</span>
          <h3>Medium-Term Actions</h3>
          <span className={styles.sectionBadge}>2–4 weeks</span>
        </div>
        <div className={styles.actionList}>
          {plan.mediumTerm?.map((action, i) => (
            <ActionCard key={i} action={action} index={i} />
          ))}
        </div>
      </section>

      {/* Escalation */}
      {plan.escalation?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📢</span>
            <h3>Escalation Triggers</h3>
          </div>
          <div className={styles.actionList}>
            {plan.escalation.map((item, i) => (
              <EscalationCard key={i} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Schemes to Enroll */}
      {plan.schemesToEnroll?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📋</span>
            <h3>Schemes to Enroll</h3>
          </div>
          <ul className={styles.schemeList}>
            {plan.schemesToEnroll.map((s, i) => (
              <li key={i} className={styles.schemeItem}>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Success Indicators */}
      {plan.successIndicators?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🎯</span>
            <h3>Success Indicators</h3>
          </div>
          <ul className={styles.schemeList}>
            {plan.successIndicators.map((s, i) => (
              <li key={i} className={styles.schemeItem}>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
