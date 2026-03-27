/**
 * Template-based plan (no web). Wording aligns with globally cited guidance:
 * WHO (activity, diet, weight management), international sleep consensus, ISSN (protein for training).
 */
export function generatePlanFromProfile(profile, goals) {
  const toNumber = (value, fallback = 0) => {
    const n = Number(value || fallback)
    return Number.isFinite(n) ? n : fallback
  }

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
  movementBullets.push(
    'Weekly baseline (WHO): at least 150–300 min/week moderate-intensity aerobic (or 75–150 min vigorous), or equivalent mix; plus muscle-strengthening for all major muscle groups on at least 2 days/week.',
  )
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
    nutritionBullets.push(
      'Sustainable pace: WHO-compatible approach—gradual loss (often discussed as ~0.5–1 kg or ~1–2 lb per week) with adequate protein and fiber, not crash dieting.',
    )
    const fatLossOptions = [
      'Create a gentle calorie deficit instead of crash dieting; aim for roughly 0.25–1% of bodyweight loss per week.',
      'Keep your deficit modest; focus on consistent mealtimes, fewer liquid calories, and protein at each meal.',
    ]
    nutritionBullets.push(fatLossOptions[Math.floor(Math.random() * fatLossOptions.length)])
  } else if (goals.primaryGoal === 'build_muscle') {
    nutritionBullets.push(
      'Protein: sports nutrition consensus (e.g. ISSN) often uses about 1.4–2.0 g per kg body weight per day when resistance training, with roughly 20–40 g per meal spread through the day.',
    )
    nutritionBullets.push(
      'Eat at maintenance or a small surplus; keep calories mostly from whole foods so gains are mostly lean tissue.',
    )
  } else {
    nutritionBullets.push(
      'Prioritize WHO-style patterns: vegetables, fruits, whole grains, legumes, nuts; limit salt, free sugars, and harmful fats.',
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

  lifestyleBullets.push(
    'Sleep: international consensus recommends at least 7 hours per night regularly for adults; many people do well with 7–9 hours.',
  )
  if (!sleep || sleep < 7) {
    lifestyleBullets.push(
      'Wind down 30–60 minutes before bed: dim lights, reduce screens, and keep a consistent wake time—sleep supports appetite control and recovery.',
    )
  } else {
    lifestyleBullets.push(
      'Protect your sleep schedule; short sleep raises injury risk and makes training and nutrition harder to stick with.',
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
