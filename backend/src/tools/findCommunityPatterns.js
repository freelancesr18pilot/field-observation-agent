/**
 * Tool: find_community_patterns
 * Returns community-level risk patterns, attendance trends, and
 * successful interventions for a given village or district.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const knowledgePath = join(__dirname, "../../data/intervention-knowledge.json");
const beneficiaryPath = join(__dirname, "../../data/beneficiaries.json");

let _kCache = null;
let _bCache = null;

function getKnowledge() {
  if (!_kCache) _kCache = JSON.parse(readFileSync(knowledgePath, "utf-8"));
  return _kCache;
}

function getBeneficiaries() {
  if (!_bCache) _bCache = JSON.parse(readFileSync(beneficiaryPath, "utf-8")).beneficiaries;
  return _bCache;
}

export function findCommunityPatterns({ village, issue_type }) {
  if (!village) return { error: "village parameter is required" };

  const knowledge = getKnowledge();
  const beneficiaries = getBeneficiaries();

  const v = village.toLowerCase().trim();
  const communityData = knowledge.communityPatterns.find(
    (c) => c.village.toLowerCase() === v
  );

  if (!communityData) {
    return {
      found: false,
      message: `No community pattern data for "${village}". Available villages: ${knowledge.communityPatterns
        .map((c) => c.village)
        .join(", ")}`,
    };
  }

  // Get all beneficiaries from this village for context
  const villageBeneficiaries = beneficiaries.filter(
    (b) => b.village.toLowerCase() === v
  );

  const riskSummary = villageBeneficiaries.reduce((acc, b) => {
    b.riskFactors.forEach((rf) => {
      acc[rf] = (acc[rf] || 0) + 1;
    });
    return acc;
  }, {});

  // Filter intervention playbook entries relevant to issue_type if provided
  let relevantInterventions = null;
  if (issue_type && knowledge.interventionPlaybook[issue_type]) {
    relevantInterventions = {
      issueType: issue_type,
      playbook: knowledge.interventionPlaybook[issue_type],
    };
  }

  // Check current month against peak absence months
  const currentMonth = new Date().toLocaleString("en-US", { month: "long" });
  const isPeakAbsenceNow = communityData.attendancePatterns.peakAbsenceMonths.includes(currentMonth);

  return {
    found: true,
    village: communityData.village,
    district: communityData.district,
    population: communityData.population,
    primaryRiskFactors: communityData.primaryRiskFactors,
    attendancePatterns: {
      ...communityData.attendancePatterns,
      currentMonthAlert: isPeakAbsenceNow
        ? `WARNING: ${currentMonth} is a peak absence month for this village. Expect elevated absenteeism.`
        : `${currentMonth} is not a peak absence month for this village.`,
    },
    alerts: communityData.alerts || null,
    successfulInterventions: communityData.successfulInterventions,
    pendingActions: communityData.pendingActions,
    currentBeneficiaryCount: villageBeneficiaries.length,
    riskFactorBreakdown: riskSummary,
    relevantInterventions,
  };
}
