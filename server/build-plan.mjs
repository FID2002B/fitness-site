import { generatePlanFromProfile } from './plan-template.mjs'

export async function buildPlan(profile, goals) {
  return generatePlanFromProfile(profile, goals)
}
