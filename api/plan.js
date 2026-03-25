function toNumber(value, fallback = 0) {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) ? n : fallback
}

function generatePlanFromProfile(profile = {}, goals = {}) {
  const feet = toNumber(profile.heightFeet)
  const inches = toNumber(profile.heightInches)
  const totalInches = feet * 12 + inches
  const heightCm = totalInches > 0 ? totalInches * 2.54 : 0

  const weightLbs = toNumber(profile.weightLbs)
  const weightKg = weightLbs > 0 ? weightLbs * 0.45359237 : 0

  const calculateBmi = (cm, kg) => {
    if (!cm || !kg) return null
    const hM = cm / 100
    return kg / (hM * hM)
  }

  const bmi = calculateBmi(heightCm, weightKg)

  const inferActivityLevel = (p) => {
    if (p.activityLevel) return p.activityLevel
    const steps = toNumber(p.averageSteps)
    if (steps >= 12000) return 'athlete'
    if (steps >= 9000) return 'active'
    if (steps >= 7000) return 'moderate'
    if (steps >= 5000) return 'light'
    return 'sedentary'
  }

  const activityLevel = inferActivityLevel(profile || {})

  const sections = []
  const disclaimers = [
    'This plan is for educational purposes only and does not replace medical advice.',
    'Consult a doctor before making major changes to your diet or exercise, especially if you have existing conditions.',
  ]

  let summary = 'Personalized plan based on your profile and goals.'
  if (bmi) {
    if (bmi < 18.5) {
      summary =
        'You are currently under the typical BMI range; focus on strength, nutrition quality, and gradual gain.'
    } else if (bmi < 25) {
      summary =
        'You are in a generally healthy BMI range; focus on performance, strength, and long-term habits.'
    } else if (bmi < 30) {
      summary =
        'You are slightly above the typical BMI range; focus on sustainable fat loss and daily movement.'
    } else {
      summary =
        'You are well above the typical BMI range; prioritize gentle, sustainable changes and consistency.'
    }
  }

  const movementBullets = []
  const baseStepsTarget =
    activityLevel === 'sedentary'
      ? 6000
      : activityLevel === 'light'
      ? 8000
      : activityLevel === 'moderate'
      ? 9000
      : 10000

  const movementVariants = [
    `Aim for about ${baseStepsTarget.toLocaleString()} steps per day by spreading short walks across your day.`,
    `Gradually build toward ${baseStepsTarget.toLocaleString()} steps per day; start by adding a 10–15 minute walk after one or two meals.`,
    `Use short walks to accumulate roughly ${baseStepsTarget.toLocaleString()} steps across the day instead of relying on a single long workout.`,
  ]

  const randomIndex = Math.floor(Math.random() * movementVariants.length)
  movementBullets.push(movementVariants[randomIndex])

  if (profile.jobType === 'mostly_sitting') {
    movementBullets.push(
      'Set a 45–60 minute timer while working; when it rings, stand up, stretch, and walk for 3–5 minutes.',
    )
  }

  if (goals.primaryGoal === 'build_muscle' || goals.primaryGoal === 'lose_fat') {
    const strengthOptions = [
      'Include 2–3 full-body strength sessions per week (push, pull, legs, core), 45–60 minutes each.',
      'Aim for 3 strength sessions per week hitting upper and lower body, leaving at least one rest day between hard sessions.',
    ]
    movementBullets.push(strengthOptions[Math.floor(Math.random() * strengthOptions.length)])
  } else {
    const cardioOptions = [
      'Include 2–3 sessions per week of moderate cardio (brisk walking, cycling, light jogging) for 20–30 minutes.',
      'Schedule 3 low-to-moderate intensity cardio sessions per week (for example, brisk walks you could still hold a conversation during).',
    ]
    movementBullets.push(cardioOptions[Math.floor(Math.random() * cardioOptions.length)])
  }

  sections.push({ title: 'Movement & Training', bullets: movementBullets })

  const nutritionBullets = []
  const timeline = toNumber(goals.timelineMonths)

  if (goals.primaryGoal === 'lose_fat') {
    const fatLossOptions = [
      'Create a gentle calorie deficit instead of crash dieting; aim for 0.25–0.75% of bodyweight loss per week.',
      'Keep your deficit modest; focus on habits like consistent mealtimes, fewer liquid calories, and protein at each meal.',
    ]
    nutritionBullets.push(fatLossOptions[Math.floor(Math.random() * fatLossOptions.length)])
  } else if (goals.primaryGoal === 'build_muscle') {
    nutritionBullets.push(
      'Eat at maintenance or a small surplus, with protein around 0.7–1.0 g per pound of bodyweight per day.',
    )
  } else {
    nutritionBullets.push(
      'Prioritize consistent mealtimes and whole foods; avoid large swings between undereating and overeating.',
    )
  }

  if (profile.nutritionQuality === 'poor' || profile.nutritionQuality === 'ok') {
    const upgradeOptions = [
      'Start by upgrading one meal per day (for example, swap a fast-food lunch for a protein + veggies + whole grain option).',
      'Pick one meal you eat often and redesign it to be higher in protein and fiber while keeping it easy to prepare.',
    ]
    nutritionBullets.push(upgradeOptions[Math.floor(Math.random() * upgradeOptions.length)])
    nutritionBullets.push(
      'Keep ultra-processed snacks out of sight and replace them with fruit, yogurt, nuts, or cut vegetables.',
    )
  } else {
    nutritionBullets.push(
      'You already have decent nutrition; refine portion sizes and protein distribution across 2–4 meals.',
    )
  }

  if (timeline && timeline >= 3) {
    nutritionBullets.push(
      'Every 4 weeks, review progress and adjust portions slightly instead of making huge changes overnight.',
    )
  }

  sections.push({ title: 'Nutrition Strategy', bullets: nutritionBullets })

  const lifestyleBullets = []
  const sleep = toNumber(profile.sleepHours)

  if (!sleep || sleep < 6) {
    lifestyleBullets.push(
      'Work toward 7–9 hours of sleep by setting a consistent wind-down routine 30–60 minutes before bed (screens off, dim lights, quiet activity).',
    )
  } else {
    lifestyleBullets.push(
      'Protect your current sleep schedule; it is one of the biggest drivers of recovery, appetite, and motivation.',
    )
  }

  if (goals.constraints) {
    lifestyleBullets.push(
      `Plan around your constraints: ${goals.constraints}. Schedule 2–3 “non-negotiable” movement blocks into your calendar.`,
    )
  } else {
    lifestyleBullets.push(
      'Block your workouts into your calendar like meetings; treat them as appointments with yourself.',
    )
  }

  sections.push({ title: 'Recovery & Lifestyle', bullets: lifestyleBullets })

  return { summary, sections, disclaimers }
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.end('Method Not Allowed')
    return
  }

  try {
    const body = req.body || {}
    const { profile = {}, goals = {} } = body
    const plan = generatePlanFromProfile(profile, goals)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(plan))
  } catch (err) {
    console.error('Error generating plan', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Failed to generate plan.' }))
  }
}

