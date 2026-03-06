/**
 * Tool: check_scheme_eligibility
 * Given a beneficiary ID, returns which schemes they are eligible for,
 * which they are already enrolled in, and which they are missing out on.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const beneficiaryPath = join(__dirname, "../../data/beneficiaries.json");
const knowledgePath = join(__dirname, "../../data/intervention-knowledge.json");

let _bCache = null;
let _kCache = null;

function getBeneficiaries() {
  if (!_bCache) _bCache = JSON.parse(readFileSync(beneficiaryPath, "utf-8")).beneficiaries;
  return _bCache;
}

function getSchemes() {
  if (!_kCache) _kCache = JSON.parse(readFileSync(knowledgePath, "utf-8")).schemes;
  return _kCache;
}

function isEligible(beneficiary, scheme) {
  const e = scheme.eligibility;

  // Category check
  if (e.categories && !e.categories.includes("all")) {
    if (!e.categories.includes(beneficiary.category)) return false;
  }

  // Gender check
  if (e.gender && e.gender !== beneficiary.gender) return false;

  // Age range check
  if (e.ageRange) {
    const [minAge, maxAge] = e.ageRange.split("-").map(Number);
    if (beneficiary.age < minAge || beneficiary.age > maxAge) return false;
  }

  // Class range check
  if (e.classes) {
    const classRanges = e.classes;
    const inAnyRange = classRanges.some((range) => {
      const [min, max] = range.split("-").map(Number);
      return beneficiary.class >= min && beneficiary.class <= max;
    });
    if (!inAnyRange) return false;
  }

  // Income limit check
  if (e.incomeLimit) {
    const annualIncome = beneficiary.monthlyIncome * 12;
    if (annualIncome > e.incomeLimit) return false;
  }

  // Condition-based checks (heuristic on risk factors + situation)
  if (e.conditions) {
    const hasAnyConditionMatch = e.conditions.some((cond) => {
      const c = cond.toLowerCase();
      if (c.includes("child at risk of dropout"))
        return (
          beneficiary.riskFactors.includes("early_marriage_risk") ||
          beneficiary.riskFactors.includes("economic_hardship") ||
          beneficiary.riskFactors.includes("child_labor")
        );
      if (c.includes("distance to school greater than 3km"))
        return beneficiary.riskFactors.includes("distance_to_school");
      if (c.includes("early marriage risk"))
        return beneficiary.riskFactors.includes("early_marriage_risk");
      if (c.includes("difficult family situation"))
        return (
          beneficiary.riskFactors.includes("domestic_violence") ||
          beneficiary.riskFactors.includes("orphan") ||
          beneficiary.riskFactors.includes("single_parent")
        );
      if (c.includes("child engaged in labor"))
        return beneficiary.riskFactors.includes("child_labor");
      if (c.includes("disability certificate"))
        return beneficiary.riskFactors.includes("disability");
      if (c.includes("out of school or irregular attendance"))
        return true; // applies to anyone in the beneficiary list
      if (c.includes("enrolled in government school"))
        return true;
      if (
        c.includes("child in need of care and protection") ||
        c.includes("domestic violence") ||
        c.includes("orphan with inadequate care")
      )
        return (
          beneficiary.riskFactors.includes("domestic_violence") ||
          beneficiary.riskFactors.includes("orphan") ||
          beneficiary.riskFactors.includes("child_labor")
        );
      if (c.includes("underweight or malnourished"))
        return beneficiary.riskFactors.includes("malnutrition");
      return true; // default: assume condition met for eligibility display
    });
    if (!hasAnyConditionMatch) return false;
  }

  return true;
}

export function checkSchemeEligibility({ beneficiary_id }) {
  if (!beneficiary_id) return { error: "beneficiary_id is required" };

  const beneficiaries = getBeneficiaries();
  const schemes = getSchemes();

  const beneficiary = beneficiaries.find(
    (b) => b.id.toLowerCase() === beneficiary_id.toLowerCase()
  );

  if (!beneficiary) {
    return { error: `Beneficiary ${beneficiary_id} not found` };
  }

  const eligible = [];
  const alreadyEnrolled = [];
  const notEligible = [];

  for (const scheme of schemes) {
    const isEnrolled = beneficiary.schemes.includes(scheme.id);
    const eligible_ = isEligible(beneficiary, scheme);

    if (isEnrolled) {
      alreadyEnrolled.push({
        id: scheme.id,
        name: scheme.name,
        benefit: scheme.benefit,
        notes: scheme.notes,
      });
    } else if (eligible_) {
      eligible.push({
        id: scheme.id,
        name: scheme.name,
        benefit: scheme.benefit,
        implementingAgency: scheme.implementingAgency,
        notes: scheme.notes,
        disbursementCycle: scheme.disbursementCycle || null,
      });
    } else {
      notEligible.push({ id: scheme.id, name: scheme.name });
    }
  }

  return {
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name,
    category: beneficiary.category,
    village: beneficiary.village,
    alreadyEnrolled,
    eligibleButNotEnrolled: eligible,
    notEligible,
    summary: `${beneficiary.name} is enrolled in ${alreadyEnrolled.length} schemes and eligible for ${eligible.length} additional schemes.`,
  };
}
