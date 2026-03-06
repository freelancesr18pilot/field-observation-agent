import { getBeneficiaryHistory } from "./getBeneficiaryHistory.js";
import { checkSchemeEligibility } from "./checkSchemeEligibility.js";
import { findCommunityPatterns } from "./findCommunityPatterns.js";

export const TOOL_DESCRIPTIONS = `You have access to these tools:

1. get_beneficiary_history({"query": "<name, ID, or village>"})
   Returns a child's full profile: attendance history, family background, risk factors, previous interventions.

2. check_scheme_eligibility({"beneficiary_id": "<ID like B001>"})
   Returns which government schemes the child is already enrolled in, which they are eligible for but missing, and application details.

3. find_community_patterns({"village": "<village name>", "issue_type": "<optional: child_labor|early_marriage|seasonal_migration|domestic_violence|malnutrition|scholarship_diversion>"})
   Returns community-level attendance patterns, risk factors, successful past interventions, and a contextual action playbook.`;

export const TOOLS = {
  get_beneficiary_history: getBeneficiaryHistory,
  check_scheme_eligibility: checkSchemeEligibility,
  find_community_patterns: findCommunityPatterns,
};

export function executeTool(toolName, params) {
  const tool = TOOLS[toolName];
  if (!tool) {
    return { error: `Unknown tool: "${toolName}". Available tools: ${Object.keys(TOOLS).join(", ")}` };
  }
  try {
    return tool(params);
  } catch (err) {
    return { error: `Tool execution failed: ${err.message}` };
  }
}
