/**
 * Tool: get_beneficiary_history
 * Searches the beneficiary database by name, ID, or village.
 * Returns full profile including attendance history and interventions.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "../../data/beneficiaries.json");

let _cache = null;
function getBeneficiaries() {
  if (!_cache) _cache = JSON.parse(readFileSync(dataPath, "utf-8")).beneficiaries;
  return _cache;
}

export function getBeneficiaryHistory({ query }) {
  if (!query) return { error: "query parameter is required" };

  const beneficiaries = getBeneficiaries();
  const q = query.toLowerCase().trim();

  const matches = beneficiaries.filter((b) => {
    return (
      b.id.toLowerCase() === q ||
      b.name.toLowerCase().includes(q) ||
      b.village.toLowerCase().includes(q) ||
      b.parentGuardian.name.toLowerCase().includes(q)
    );
  });

  if (matches.length === 0) {
    return {
      found: false,
      message: `No beneficiary found matching "${query}". Try searching by name, ID (e.g. B001), or village.`,
    };
  }

  // Enrich attendance with computed metrics
  const enriched = matches.map((b) => {
    const quarters = Object.values(b.attendanceHistory);
    const averageAttendance =
      quarters.length > 0
        ? Math.round(quarters.reduce((a, v) => a + v, 0) / quarters.length)
        : null;

    const trend =
      quarters.length >= 2
        ? quarters[quarters.length - 1] > quarters[quarters.length - 2]
          ? "improving"
          : quarters[quarters.length - 1] < quarters[quarters.length - 2]
          ? "declining"
          : "stable"
        : "insufficient_data";

    return {
      ...b,
      computedMetrics: {
        averageAttendance,
        attendanceTrend: trend,
        interventionCount: b.previousInterventions.length,
        lastInterventionDate:
          b.previousInterventions.length > 0
            ? b.previousInterventions[b.previousInterventions.length - 1].date
            : null,
        riskLevel:
          b.riskFactors.length >= 3
            ? "high"
            : b.riskFactors.length >= 1
            ? "medium"
            : "low",
      },
    };
  });

  return {
    found: true,
    count: enriched.length,
    beneficiaries: enriched,
  };
}
