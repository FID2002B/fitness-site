import './App.css'

import { useState } from 'react'

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'

interface UserProfile {
  age: string
  sex: 'male' | 'female' | ''
  heightFeet: string
  heightInches: string
  weightLbs: string
  jobType: 'mostly_sitting' | 'mix' | 'on_feet' | 'manual_labor' | ''
  averageSteps: string
  sleepHours: string
  nutritionQuality: 'poor' | 'ok' | 'good' | 'great' | ''
  activityLevel: ActivityLevel | ''
}

interface UserGoals {
  primaryGoal: 'lose_fat' | 'build_muscle' | 'improve_health' | 'improve_endurance' | ''
  targetWeightLbs: string
  timelineMonths: string
  constraints: string
}

interface PlanSection {
  title: string
  bullets: string[]
}

interface ActionPlan {
  summary: string
  sections: PlanSection[]
  disclaimers: string[]
}

type ImportedMetrics = {
  heightCm?: number
  weightKg?: number
  averageSteps?: number
  sleepHours?: number
}

function calculateBmi(heightCm: number, weightKg: number) {
  if (!heightCm || !weightKg) return null
  const hM = heightCm / 100
  return weightKg / (hM * hM)
}

function normalizeNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const text = String(value).trim().replace(',', '.')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function parseMetricsFromCsv(text: string): ImportedMetrics | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) return null

  const headerCells = lines[0]
    .split(',')
    .map((cell) => cell.trim().replace(/^"|"$/g, ''))
  const lowerHeaders = headerCells.map((h) => h.toLowerCase())

  const dataLines = lines.slice(1)
  const rows = dataLines
    .map((line) => {
      const rawCells = line.split(',')
      const row: Record<string, string> = {}
      headerCells.forEach((key, idx) => {
        if (!key) return
        const raw = rawCells[idx] ?? ''
        row[key] = raw.trim().replace(/^"|"$/g, '')
      })
      return row
    })
    .filter((row) => Object.values(row).some((v) => v !== ''))

  if (!rows.length) return null

  const findIndex = (predicate: (name: string) => boolean) =>
    lowerHeaders.findIndex(predicate)

  const weightIndex = findIndex((name) => name.includes('weight') || name.includes('body_mass'))
  const heightIndex = findIndex((name) => name.includes('height') || name.includes('stature'))
  const stepsIndex = findIndex((name) => name.includes('step'))
  const sleepIndex = findIndex(
    (name) => name.includes('sleep') && (name.includes('hour') || name.includes('duration')),
  )

  const metrics: ImportedMetrics = {}

  if (weightIndex >= 0) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const raw = rows[i][headerCells[weightIndex]]
      const value = normalizeNumber(raw)
      if (value != null) {
        metrics.weightKg = value
        break
      }
    }
  }

  if (heightIndex >= 0) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const raw = rows[i][headerCells[heightIndex]]
      const value = normalizeNumber(raw)
      if (value != null) {
        metrics.heightCm = value
        break
      }
    }
  }

  if (stepsIndex >= 0) {
    const values: number[] = []
    for (const row of rows) {
      const raw = row[headerCells[stepsIndex]]
      const value = normalizeNumber(raw)
      if (value != null) values.push(value)
    }
    if (values.length) {
      const sum = values.reduce((acc, v) => acc + v, 0)
      metrics.averageSteps = sum / values.length
    }
  }

  if (sleepIndex >= 0) {
    const values: number[] = []
    for (const row of rows) {
      const raw = row[headerCells[sleepIndex]]
      const value = normalizeNumber(raw)
      if (value != null) values.push(value)
    }
    if (values.length) {
      const sum = values.reduce((acc, v) => acc + v, 0)
      metrics.sleepHours = sum / values.length
    }
  }

  return Object.keys(metrics).length ? metrics : null
}

function parseMetricsFromJson(text: string): ImportedMetrics | null {
  try {
    const raw = JSON.parse(text) as unknown

    const pick = (source: unknown): ImportedMetrics | null => {
      if (!source || typeof source !== 'object') return null
      const obj = source as Record<string, unknown>
      const metrics: ImportedMetrics = {}

      const from = (container: Record<string, unknown>) => {
        if (container.heightCm != null || container.height != null) {
          metrics.heightCm = normalizeNumber(container.heightCm ?? container.height) ?? undefined
        }
        if (container.weightKg != null || container.weight != null) {
          metrics.weightKg = normalizeNumber(container.weightKg ?? container.weight) ?? undefined
        }
        if (container.averageSteps != null || container.steps != null) {
          metrics.averageSteps =
            normalizeNumber(container.averageSteps ?? container.steps) ?? undefined
        }
        if (container.sleepHours != null || container.sleep != null) {
          metrics.sleepHours =
            normalizeNumber(container.sleepHours ?? container.sleep) ?? undefined
        }
      }

      from(obj)

      if ('metrics' in obj && obj.metrics && typeof obj.metrics === 'object') {
        from(obj.metrics as Record<string, unknown>)
      }

      return Object.keys(metrics).length ? metrics : null
    }

    if (Array.isArray(raw)) {
      for (let i = raw.length - 1; i >= 0; i -= 1) {
        const picked = pick(raw[i])
        if (picked) return picked
      }
      return null
    }

    return pick(raw)
  } catch {
    return null
  }
}

function inferActivityLevel(profile: UserProfile): ActivityLevel {
  if (profile.activityLevel) return profile.activityLevel
  const steps = Number(profile.averageSteps || '0')

  if (steps >= 12000) return 'athlete'
  if (steps >= 9000) return 'active'
  if (steps >= 7000) return 'moderate'
  if (steps >= 5000) return 'light'
  return 'sedentary'
}

function generatePlan(profile: UserProfile, goals: UserGoals): ActionPlan {
  const feet = Number(profile.heightFeet || '0')
  const inches = Number(profile.heightInches || '0')
  const totalInches = feet * 12 + inches
  const heightCm = totalInches > 0 ? totalInches * 2.54 : 0

  const weightLbs = Number(profile.weightLbs || '0')
  const weightKg = weightLbs > 0 ? weightLbs * 0.45359237 : 0
  const bmi = calculateBmi(heightCm, weightKg)
  const activityLevel = inferActivityLevel(profile)

  const sections: PlanSection[] = []
  const disclaimers: string[] = [
    'This plan is for educational purposes only and does not replace medical advice.',
    'Consult a doctor before making major changes to your diet or exercise, especially if you have existing conditions.',
  ]

  // Summary
  let summary = 'Personalized plan based on your profile and goals.'
  if (bmi) {
    if (bmi < 18.5) {
      summary = 'You are currently under the typical BMI range; focus on strength, nutrition quality, and gradual gain.'
    } else if (bmi < 25) {
      summary = 'You are in a generally healthy BMI range; focus on performance, strength, and long-term habits.'
    } else if (bmi < 30) {
      summary = 'You are slightly above the typical BMI range; focus on sustainable fat loss and daily movement.'
    } else {
      summary = 'You are well above the typical BMI range; prioritize gentle, sustainable changes and consistency.'
    }
  }

  // Movement section
  const movementBullets: string[] = []
  const baseStepsTarget =
    activityLevel === 'sedentary' ? 6000 :
    activityLevel === 'light' ? 8000 :
    activityLevel === 'moderate' ? 9000 :
    10000

  movementBullets.push(
    `Aim for about ${baseStepsTarget.toLocaleString()} steps per day by spreading short walks across your day.`,
  )

  if (profile.jobType === 'mostly_sitting') {
    movementBullets.push(
      'Set a 45–60 minute timer while working; when it rings, stand up, stretch, and walk for 3–5 minutes.',
    )
  }

  if (goals.primaryGoal === 'build_muscle' || goals.primaryGoal === 'lose_fat') {
    movementBullets.push(
      'Include 2–3 full-body strength sessions per week (push, pull, legs, core), 45–60 minutes each.',
    )
  } else {
    movementBullets.push(
      'Include 2–3 sessions per week of moderate cardio (brisk walking, cycling, light jogging) for 20–30 minutes.',
    )
  }

  sections.push({ title: 'Movement & Training', bullets: movementBullets })

  // Nutrition section
  const nutritionBullets: string[] = []
  const timeline = Number(goals.timelineMonths || '0')

  if (goals.primaryGoal === 'lose_fat') {
    nutritionBullets.push(
      'Create a gentle calorie deficit instead of crash dieting; aim for 0.25–0.75% of bodyweight loss per week.',
    )
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
    nutritionBullets.push(
      'Start by upgrading one meal per day (for example, swap a fast-food lunch for a protein + veggies + whole grain option).',
    )
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

  // Recovery & lifestyle
  const lifestyleBullets: string[] = []
  const sleep = Number(profile.sleepHours || '0')

  if (!sleep || sleep < 6) {
    lifestyleBullets.push(
      'Work toward 7–9 hours of sleep by setting a consistent wind-down routine 30–60 minutes before bed (screens off, dim lights, quiet activity).',
    )
  } else {
    lifestyleBullets.push(
      'Protect your current sleep schedule; it is one of the biggest drivers of recovery, appetite, and motivation.',
    )
  }

  if (profile.constraints) {
    lifestyleBullets.push(
      `Plan around your constraints: ${profile.constraints}. Schedule 2–3 “non-negotiable” movement blocks into your calendar.`,
    )
  } else {
    lifestyleBullets.push(
      'Block your workouts into your calendar like meetings; treat them as appointments with yourself.',
    )
  }

  sections.push({ title: 'Recovery & Lifestyle', bullets: lifestyleBullets })

  return { summary, sections, disclaimers }
}

/** "Generate new plan" builds a mostly different plan (~75%+ new content): different summary, training approach, nutrition angle, and recovery focus. */
function generatePlanVariant(profile: UserProfile, goals: UserGoals): ActionPlan {
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  const activityLevel = inferActivityLevel(profile)
  const stepsTarget =
    activityLevel === 'sedentary' ? 6000 :
    activityLevel === 'light' ? 8000 :
    activityLevel === 'moderate' ? 9000 : 10000
  const timeline = Number(goals.timelineMonths || '0')
  const sleep = Number(profile.sleepHours || '0')
  const constraints = goals.constraints?.trim() || ''

  // Summary: pick one of several completely different angles
  const summary = pick([
    'Focus on sustainable habits: daily movement, protein-rich meals, and recovery. Adjust intensity based on how you feel.',
    'Your plan emphasizes consistency over perfection—small, repeatable changes in training, nutrition, and sleep.',
    "We'll prioritize one main lever at a time (e.g. steps first, then strength, then nutrition) so you don't get overwhelmed.",
    'A practical, time-efficient approach: short movement blocks, simple nutrition rules, and protected recovery.',
    "Build the plan around your schedule and constraints; we'll keep sessions and meals realistic so you can stick with it.",
  ])

  // Movement: choose a different training framework each time
  const movementBullets: string[] = []
  const movementApproach = pick([
    () => {
      movementBullets.push(`Hit around ${stepsTarget.toLocaleString()} steps most days—break it into 2–3 short walks so it doesn't feel like one big chunk.`)
      if (profile.jobType === 'mostly_sitting') movementBullets.push('Use a 50-minute work block, then 5 minutes of standing, stretching, or walking before the next block.')
      if (goals.primaryGoal === 'build_muscle' || goals.primaryGoal === 'lose_fat') {
        movementBullets.push('Do 3 full-body strength days per week (e.g. Mon / Wed / Fri), 50–60 min each: compound lifts plus a few accessories.')
      } else {
        movementBullets.push('Add 3 cardio sessions per week—brisk walking, cycling, or swimming—20–35 minutes at a comfortable-but-challenging pace.')
      }
    },
    () => {
      movementBullets.push(`Build toward ${stepsTarget.toLocaleString()} steps daily; add a 15-minute walk after breakfast or lunch if you're short.`)
      if (profile.jobType === 'mostly_sitting') movementBullets.push('Every hour, do 2 minutes of standing and walking; it adds up and reduces stiffness.')
      if (goals.primaryGoal === 'build_muscle' || goals.primaryGoal === 'lose_fat') {
        movementBullets.push('Run an upper/lower split 4 days per week (e.g. upper Mon/Thu, lower Tue/Fri), 45–55 min per session.')
      } else {
        movementBullets.push('Aim for 3 moderate cardio sessions weekly—30 min each—plus daily steps. Keep intensity where you can talk in short sentences.')
      }
    },
    () => {
      movementBullets.push(`Target roughly ${stepsTarget.toLocaleString()} steps per day; use a lunch walk and an evening stroll to get most of the way there.`)
      if (profile.jobType === 'mostly_sitting') movementBullets.push('Set reminders to stand and walk for 3–5 min every 45–60 minutes during work.')
      if (goals.primaryGoal === 'build_muscle' || goals.primaryGoal === 'lose_fat') {
        movementBullets.push('Do 2 full-body strength sessions and 2 lighter cardio or conditioning sessions per week (e.g. 40 min strength, 25 min cardio).')
      } else {
        movementBullets.push('Schedule 3 cardio sessions of 25–30 minutes (walking, cycling, or rowing) and use steps to fill in the rest of your activity.')
      }
    },
    () => {
      movementBullets.push(`First habit: get to ${stepsTarget.toLocaleString()} steps on most days. Second: add 2–3 dedicated workout slots once that feels automatic.`)
      if (profile.jobType === 'mostly_sitting') movementBullets.push('Break up sitting with 3–5 minute movement breaks every hour—walk, stretch, or do a few bodyweight moves.')
      if (goals.primaryGoal === 'build_muscle' || goals.primaryGoal === 'lose_fat') {
        movementBullets.push('Strength: 2–3 sessions per week, 45–60 min, covering push, pull, legs, and core. Quality over volume at first.')
      } else {
        movementBullets.push('Cardio: 2–3 sessions per week, 20–30 min, at a pace where you can breathe through your nose for most of it.')
      }
    },
  ])
  movementApproach()

  const nutritionBullets: string[] = []
  const nutritionApproach = pick([
    () => {
      if (goals.primaryGoal === 'lose_fat') nutritionBullets.push('Small deficit: cut 200–400 kcal from your usual intake and aim for ~0.5% bodyweight loss per week.')
      else if (goals.primaryGoal === 'build_muscle') nutritionBullets.push('Eat at maintenance or a slight surplus; target 0.8–1 g protein per lb bodyweight and spread it across 3–4 meals.')
      else nutritionBullets.push('Eat regularly and focus on whole foods; limit liquid calories and large late-night meals.')
      if (profile.nutritionQuality === 'poor' || profile.nutritionQuality === 'ok') {
        nutritionBullets.push('Upgrade one anchor meal first (e.g. breakfast or lunch) to include protein + vegetables + whole grains.')
        nutritionBullets.push('Swap packaged snacks for fruit, nuts, Greek yogurt, or veggie sticks so defaults are better without willpower.')
      } else nutritionBullets.push('Tweak portions and protein timing; keep 2–4 solid meals and avoid skipping meals or over-restricting.')
      if (timeline >= 3) nutritionBullets.push('Reassess every 4–6 weeks: adjust calories or portions gradually instead of big swings.')
    },
    () => {
      if (goals.primaryGoal === 'lose_fat') nutritionBullets.push('Prioritize protein and fiber at each meal; reduce added sugars and fried foods. Let the deficit be modest and consistent.')
      else if (goals.primaryGoal === 'build_muscle') nutritionBullets.push('Surplus of 100–300 kcal with 0.7–1.0 g protein per lb; prioritize post-workout nutrition and sleep.')
      else nutritionBullets.push('Stable meal timing and balanced plates (protein + veg + starch); avoid binge–restrict cycles.')
      if (profile.nutritionQuality === 'poor' || profile.nutritionQuality === 'ok') {
        nutritionBullets.push('Pick the one meal you control most and make it higher in protein and vegetables; repeat that template often.')
        nutritionBullets.push('Keep fruit, nuts, and yogurt visible; store less healthy options out of sight.')
      } else nutritionBullets.push('Refine what you already do: portion sizes, protein distribution, and consistency.')
      if (timeline >= 3) nutritionBullets.push('Every month, review weight and energy; make small adjustments rather than overhauling the plan.')
    },
    () => {
      if (goals.primaryGoal === 'lose_fat') nutritionBullets.push('Gentle deficit with an emphasis on satiety: protein and vegetables first, then starches and fats.')
      else if (goals.primaryGoal === 'build_muscle') nutritionBullets.push('Slight surplus, 0.8+ g protein per lb, and enough carbs around training to support performance.')
      else nutritionBullets.push('Eat at consistent times; favor whole foods and limit ultra-processed options.')
      if (profile.nutritionQuality === 'poor' || profile.nutritionQuality === 'ok') {
        nutritionBullets.push('Improve one meal at a time—e.g. swap a default lunch for a higher-protein, higher-fiber option you enjoy.')
        nutritionBullets.push('Replace low-quality snacks with fruit, nuts, or veggies and hummus so choices are easier.')
      } else nutritionBullets.push('Optimize portion sizes and protein across meals; maintain current habits with small tweaks.')
      if (timeline >= 3) nutritionBullets.push('Check in every 4 weeks and adjust food intake in small steps based on results and adherence.')
    },
  ])
  nutritionApproach()

  const lifestyleBullets: string[] = []
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

  const disclaimers = [
    'This plan is for educational purposes only and does not replace medical advice.',
    'Consult a doctor before making major changes to your diet or exercise, especially if you have existing conditions.',
  ]

  return {
    summary,
    sections: [
      { title: 'Movement & Training', bullets: movementBullets },
      { title: 'Nutrition Strategy', bullets: nutritionBullets },
      { title: 'Recovery & Lifestyle', bullets: lifestyleBullets },
    ],
    disclaimers,
  }
}

function App() {
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [trackerChoice, setTrackerChoice] = useState<'upload' | 'manual' | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [isFetchingTracker, setIsFetchingTracker] = useState(false)
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfile>({
    age: '',
    sex: '',
    heightFeet: '',
    heightInches: '',
    weightLbs: '',
    jobType: '',
    averageSteps: '',
    sleepHours: '',
    nutritionQuality: '',
    activityLevel: '',
  })

  const [goals, setGoals] = useState<UserGoals>({
    primaryGoal: '',
    targetWeightLbs: '',
    timelineMonths: '',
    constraints: '',
  })

  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchPlanFromApi = async () => {
    try {
      setIsGenerating(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch('http://localhost:4000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, goals }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!res.ok) throw new Error(`Plan API failed with status ${res.status}`)
      const data = (await res.json()) as ActionPlan
      setPlan(data)
    } catch {
      const variant = generatePlanVariant(profile, goals)
      setPlan(variant)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateNewPlan = () => {
    setIsGenerating(true)
    setPlan(generatePlanVariant(profile, goals))
    setIsGenerating(false)
  }

  const applyImportedMetrics = (parsed: ImportedMetrics) => {
    setProfile((prev) => {
      const next = { ...prev }

      if (parsed.heightCm != null) {
        const totalInches = parsed.heightCm / 2.54
        const feet = Math.floor(totalInches / 12)
        const inches = Math.round(totalInches - feet * 12)
        next.heightFeet = String(feet)
        next.heightInches = String(inches)
      }

      if (parsed.weightKg != null) {
        const lbs = parsed.weightKg * 2.20462
        next.weightLbs = String(Math.round(lbs))
      }

      if (parsed.averageSteps != null) {
        next.averageSteps = String(Math.round(parsed.averageSteps))
      }

      if (parsed.sleepHours != null) {
        next.sleepHours = String(Math.round(parsed.sleepHours * 10) / 10)
      }

      return next
    })
  }

  const handleOnboardingChoice = (choice: 'upload' | 'manual') => {
    setHasOnboarded(true)
    setTrackerChoice(choice)
  }

  const handleMetricsFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      const text = String(reader.result ?? '')
      const trimmed = text.trim()

      let parsed: ImportedMetrics | null = null

      if (
        file.name.toLowerCase().endsWith('.json') ||
        trimmed.startsWith('{') ||
        trimmed.startsWith('[')
      ) {
        parsed = parseMetricsFromJson(text)
      } else {
        parsed = parseMetricsFromCsv(text)
      }

      if (!parsed) {
        setImportMessage(
          'I could not recognize steps, sleep, height, or weight in that file. Try a simpler CSV or JSON export.',
        )
        return
      }

      applyImportedMetrics(parsed)

      setImportMessage(
        'Imported what I could into the form below. Please double-check the numbers from your tracker.',
      )
    }

    reader.onerror = () => {
      setImportMessage(
        'There was a problem reading that file. Try again with a smaller export or a different format.',
      )
    }

    reader.readAsText(file)
  }

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    void fetchPlanFromApi()
  }

  const handleConnectFitbit = async () => {
    setImportMessage(null)
    setIsFetchingTracker(true)
    try {
      const authWindow = window.open('http://localhost:4000/auth/fitbit', '_blank', 'width=600,height=800')
      if (!authWindow) {
        setImportMessage('Popup was blocked. Please allow popups for this site and try again.')
        setIsFetchingTracker(false)
        return
      }

      // Poll until the auth window closes.
      await new Promise<void>((resolve) => {
        const interval = window.setInterval(() => {
          if (authWindow.closed) {
            window.clearInterval(interval)
            resolve()
          }
        }, 500)
      })

      const res = await fetch('http://localhost:4000/api/metrics/fitbit')
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Error fetching Fitbit metrics', errorText)
        setImportMessage('Could not fetch data from Fitbit. Make sure you completed the connection steps.')
        setIsFetchingTracker(false)
        return
      }

      const data = (await res.json()) as {
        metrics?: ImportedMetrics
        raw?: unknown
      }

      if (!data.metrics) {
        setImportMessage('Connected to Fitbit but did not receive usable metrics.')
        setIsFetchingTracker(false)
        return
      }

      applyImportedMetrics(data.metrics)
      setConnectedProvider('fitbit')
      setImportMessage(
        'Imported what I could from Fitbit into the form below. You can still edit any values before generating your plan.',
      )
    } catch (err) {
      console.error('Unexpected error connecting to Fitbit', err)
      setImportMessage('Something went wrong connecting to Fitbit. Please try again.')
    } finally {
      setIsFetchingTracker(false)
    }
  }

  if (!hasOnboarded) {
    return (
      <div className="app-root app-root-onboarding">
        <main className="app-shell app-shell-onboarding">
          <section className="panel onboarding">
            <h1>How do you want to start?</h1>
            <p className="onboarding-subtitle">
              Before we build your fitness blueprint, you can choose to bring in metrics from a fitness
              tracker or just answer a few quick questions manually.
            </p>

            <div className="onboarding-icons" aria-hidden="true">
              <span className="icon-pill">🥦</span>
              <span className="icon-pill">🏋️</span>
              <span className="icon-pill">🧘</span>
            </div>

            <div className="onboarding-options">
              <button
                type="button"
                className="onboarding-option primary"
                onClick={() => handleOnboardingChoice('upload')}
              >
                Use data from my tracker
              </button>
              <button
                type="button"
                className="onboarding-option secondary"
                onClick={() => handleOnboardingChoice('manual')}
              >
                I&apos;ll enter everything manually
              </button>
            </div>

            <p className="onboarding-note">
              You can still use the app fully either way. If you choose tracker data, you can upload a simple
              CSV or JSON export from Apple Health, Fitbit, Garmin, or any other platform, or just copy key
              numbers (steps, weight, sleep, etc.) into the form.
            </p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-root">
      <main className="app-shell">
        <header className="hero">
          <div>
            <h1>Personal Fitness Blueprint</h1>
            <p>
              Input your current lifestyle and goals. We&apos;ll turn it into a clear, realistic plan of action
              you can start today.
            </p>
            <div className="hero-icons" aria-hidden="true">
              <span className="hero-chip">🥗 Nutrition</span>
              <span className="hero-chip">🏃 Training</span>
              <span className="hero-chip">🧘 Recovery</span>
            </div>
            {trackerChoice === 'upload' && (
              <p className="tracker-banner">
                You chose to start from tracker data. For now, copy your recent weight, steps, and sleep
                averages from your device into the fields below.
              </p>
            )}
          </div>
        </header>

        <div className="layout">
          <section className="panel">
            <form onSubmit={handleGenerate} className="form-grid">
              {trackerChoice === 'upload' && (
                <div className="import-box">
                  <h2>Use data from your tracker</h2>
                  <p className="import-copy">
                    Connect a supported tracker to pull in as much information as possible (steps, sleep,
                    weight, and other metrics), or upload a CSV / JSON export manually.
                  </p>

                  <div className="tracker-buttons">
                    <button
                      type="button"
                      className="tracker-button"
                      onClick={handleConnectFitbit}
                      disabled={isFetchingTracker}
                    >
                      {isFetchingTracker && connectedProvider === 'fitbit'
                        ? 'Connecting to Fitbit...'
                        : 'Connect Fitbit'}
                    </button>
                    <button type="button" className="tracker-button tracker-button-disabled" disabled>
                      Apple Watch / Apple Health (via export)
                    </button>
                    <button type="button" className="tracker-button tracker-button-disabled" disabled>
                      Garmin (coming soon)
                    </button>
                  </div>

                  <p className="import-copy">
                    To use Apple Health or other apps today, export a file (CSV or JSON) and upload it here.
                  </p>

                  <div className="import-help">
                    <h3>How to export from Apple Health</h3>
                    <ol>
                      <li>On your iPhone, open the Apple Health app.</li>
                      <li>
                        Use an app or integration that can export your Health data as <strong>CSV</strong> or{' '}
                        <strong>JSON</strong> (for example, an “Apple Health export” app from the App Store).
                      </li>
                      <li>
                        When exporting, include at least <strong>steps</strong>, <strong>sleep</strong>,{' '}
                        <strong>weight</strong>, and <strong>height</strong> if available.
                      </li>
                      <li>Save the exported file on your device or computer.</li>
                      <li>Upload that file using the selector below and I’ll pull in what I can.</li>
                    </ol>
                  </div>

                  <input
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    onChange={handleMetricsFile}
                  />
                  {importMessage && <p className="import-message">{importMessage}</p>}
                </div>
              )}

              <h2>Your current profile</h2>
              <div className="field-row one skinny-age">
                <label>
                  <span>Age</span>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    className="age-input"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  />
                </label>
              </div>

              <div className="field-row two">
                <label>
                  <span>Sex</span>
                  <select
                    value={profile.sex}
                    onChange={(e) => setProfile({ ...profile, sex: e.target.value as UserProfile['sex'] })}
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label>
                  <span>Job type</span>
                  <select
                    value={profile.jobType}
                    onChange={(e) =>
                      setProfile({ ...profile, jobType: e.target.value as UserProfile['jobType'] })
                    }
                  >
                    <option value="">Select...</option>
                    <option value="mostly_sitting">Mostly sitting / desk</option>
                    <option value="mix">Mix of sitting and standing</option>
                    <option value="on_feet">On your feet most of the day</option>
                    <option value="manual_labor">Physically demanding / manual labor</option>
                  </select>
                </label>
              </div>

              <div className="field-row two">
                <label>
                  <span>Height</span>
                  <div className="height-row">
                    <div className="height-pair">
                      <input
                        type="number"
                        min={3}
                        max={8}
                        className="height-input"
                        value={profile.heightFeet}
                        onChange={(e) => setProfile({ ...profile, heightFeet: e.target.value })}
                      />
                      <span className="height-unit">ft</span>
                    </div>
                    <div className="height-pair">
                      <input
                        type="number"
                        min={0}
                        max={11}
                        className="height-input"
                        value={profile.heightInches}
                        onChange={(e) => setProfile({ ...profile, heightInches: e.target.value })}
                      />
                      <span className="height-unit">in</span>
                    </div>
                  </div>
                </label>
                <label>
                  <span>Weight (lb)</span>
                  <input
                    type="number"
                    min={80}
                    max={500}
                    className="compact-input"
                    value={profile.weightLbs}
                    onChange={(e) => setProfile({ ...profile, weightLbs: e.target.value })}
                  />
                </label>
              </div>

              <div className="field-row two">
                <label>
                  <span>Average steps / day</span>
                  <input
                    type="number"
                    min={0}
                    max={30000}
                    className="compact-input"
                    value={profile.averageSteps}
                    onChange={(e) => setProfile({ ...profile, averageSteps: e.target.value })}
                  />
                </label>
                <label>
                  <span>Sleep (hours / night)</span>
                  <input
                    type="number"
                    min={3}
                    max={12}
                    step={0.5}
                    className="compact-input"
                    value={profile.sleepHours}
                    onChange={(e) => setProfile({ ...profile, sleepHours: e.target.value })}
                  />
                </label>
              </div>

              <div className="field-row two">
                <label>
                  <span>Nutrition quality (overall)</span>
                  <select
                    value={profile.nutritionQuality}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        nutritionQuality: e.target.value as UserProfile['nutritionQuality'],
                      })
                    }
                  >
                    <option value="">Select...</option>
                    <option value="poor">Mostly fast food / snacks</option>
                    <option value="ok">Mixed, some healthy, some not</option>
                    <option value="good">Mostly home-cooked / whole foods</option>
                    <option value="great">Very intentional / tracked</option>
                  </select>
                </label>
                <label>
                  <span>Self-rated activity level</span>
                  <select
                    value={profile.activityLevel}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        activityLevel: e.target.value as ActivityLevel,
                      })
                    }
                  >
                    <option value="">Let the app infer</option>
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Lightly active</option>
                    <option value="moderate">Moderately active</option>
                    <option value="active">Active</option>
                    <option value="athlete">Athlete</option>
                  </select>
                </label>
              </div>

              <h2>Your goals</h2>

              <div className="field-row two">
                <label>
                  <span>Primary goal</span>
                  <select
                    value={goals.primaryGoal}
                    onChange={(e) =>
                      setGoals({
                        ...goals,
                        primaryGoal: e.target.value as UserGoals['primaryGoal'],
                      })
                    }
                  >
                    <option value="">Select...</option>
                    <option value="lose_fat">Lose body fat</option>
                    <option value="build_muscle">Build muscle / strength</option>
                    <option value="improve_health">Improve general health</option>
                    <option value="improve_endurance">Improve endurance / cardio</option>
                  </select>
                </label>
                <label>
                  <span>Target weight (lb) – optional</span>
                  <input
                    type="number"
                    min={80}
                    max={500}
                    className="compact-input"
                    value={goals.targetWeightLbs}
                    onChange={(e) => setGoals({ ...goals, targetWeightLbs: e.target.value })}
                  />
                </label>
              </div>

              <div className="field-row one skinny">
                <label>
                  <span>Rough timeline (months)</span>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    className="timeline-input compact-input"
                    value={goals.timelineMonths}
                    onChange={(e) => setGoals({ ...goals, timelineMonths: e.target.value })}
                  />
                </label>
              </div>

              <div className="field-row one">
                <label>
                  <span>
                    Constraints & context (injuries, equipment, budget, schedule, preferences)
                  </span>
                  <textarea
                    rows={3}
                    value={goals.constraints}
                    onChange={(e) => setGoals({ ...goals, constraints: e.target.value })}
                    placeholder="e.g. knee pain, no gym membership, very busy evenings, prefer mornings..."
                  />
                </label>
              </div>

              <div className="actions">
                <button type="submit">Generate my plan</button>
              </div>
            </form>
          </section>

          <section className="panel plan-panel">
            {plan ? (
              <div className="plan">
                <h2>Suggested plan of action</h2>
                <p className="plan-summary">{plan.summary}</p>

                {plan.sections.map((section) => (
                  <div key={section.title} className="plan-section">
                    <h3>{section.title}</h3>
                    <ul>
                      {section.bullets.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="disclaimers">
                  {plan.disclaimers.map((d, idx) => (
                    <p key={idx}>{d}</p>
                  ))}
                </div>

                <div className="plan-regenerate">
                  <p className="plan-regenerate-copy">
                    Want to see a slightly different take?
                  </p>
                  <button
                    type="button"
                    className="plan-regenerate-button"
                    onClick={handleGenerateNewPlan}
                    disabled={isGenerating}
                  >
                    <span className="plan-regenerate-icon" aria-hidden="true">
                      ↻
                    </span>
                    <span>{isGenerating ? 'Generating...' : 'Generate new plan'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="plan-placeholder">
                <h2>Your action plan will appear here</h2>
                <p>
                  Fill in your details on the left and click <strong>Generate my plan</strong> to see a
                  personalized breakdown of movement, nutrition, and lifestyle steps.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
