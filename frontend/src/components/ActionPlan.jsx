import styles from "./ActionPlan.module.css";
import { useT } from "../LanguageContext.jsx";

function RiskBadge({ level, t }) {
  const cfg = {
    high:   { label: t("highRisk"),   color: "#ef4444", bg: "#fef2f2" },
    medium: { label: t("mediumRisk"), color: "#f59e0b", bg: "#fffbeb" },
    low:    { label: t("lowRisk"),    color: "#22c55e", bg: "#f0fdf4" },
  }[level] || { label: level, color: "#f59e0b", bg: "#fffbeb" };

  return (
    <span className={styles.riskBadge} style={{ color: cfg.color, background: cfg.bg }}>
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
        {action.note && <div className={styles.actionNote}>{action.note}</div>}
      </div>
    </div>
  );
}

function EscalationCard({ item, t }) {
  return (
    <div className={styles.escalationCard}>
      <div className={styles.escalationTrigger}>
        <span className={styles.triggerIcon}>⚠️</span>
        <strong>{t("ifTrigger")}</strong> {item.trigger}
      </div>
      <div className={styles.escalationAction}>
        <strong>{t("thenAction")}</strong> {item.action}
      </div>
      {item.contact && (
        <div className={styles.escalationContact}>
          <span className={styles.metaIcon}>📞</span> {t("contact")} {item.contact}
        </div>
      )}
    </div>
  );
}

export default function ActionPlan({ plan }) {
  const t = useT();
  if (!plan) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>{t("actionPlanTitle")}</h2>
          <div className={styles.meta}>
            <strong>{plan.childName}</strong>
            {plan.village && <span> · {plan.village}</span>}
          </div>
        </div>
        <RiskBadge level={plan.riskLevel} t={t} />
      </div>

      {plan.primaryIssues?.length > 0 && (
        <div className={styles.issues}>
          {plan.primaryIssues.map((issue, i) => (
            <span key={i} className={styles.issueTag}>{issue}</span>
          ))}
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>🚨</span>
          <h3>{t("immediateActions")}</h3>
          <span className={styles.sectionBadge}>{t("within48")}</span>
        </div>
        <div className={styles.actionList}>
          {plan.immediate?.map((action, i) => (
            <ActionCard key={i} action={action} index={i} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>📅</span>
          <h3>{t("mediumTermActions")}</h3>
          <span className={styles.sectionBadge}>{t("twoFourWeeks")}</span>
        </div>
        <div className={styles.actionList}>
          {plan.mediumTerm?.map((action, i) => (
            <ActionCard key={i} action={action} index={i} />
          ))}
        </div>
      </section>

      {plan.escalation?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📢</span>
            <h3>{t("escalationTriggers")}</h3>
          </div>
          <div className={styles.actionList}>
            {plan.escalation.map((item, i) => (
              <EscalationCard key={i} item={item} t={t} />
            ))}
          </div>
        </section>
      )}

      {plan.schemesToEnroll?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📋</span>
            <h3>{t("schemesToEnroll")}</h3>
          </div>
          <ul className={styles.schemeList}>
            {plan.schemesToEnroll.map((s, i) => (
              <li key={i} className={styles.schemeItem}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {plan.successIndicators?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🎯</span>
            <h3>{t("successIndicators")}</h3>
          </div>
          <ul className={styles.schemeList}>
            {plan.successIndicators.map((s, i) => (
              <li key={i} className={styles.schemeItem}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
