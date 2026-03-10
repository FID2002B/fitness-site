import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const PORT = process.env.PORT || 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// In-memory token store for demo purposes only.
// For real use, persist per-user tokens in a database.
const fitbitTokens = {
  accessToken: null,
  refreshToken: null,
  userId: null,
}

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/auth/fitbit', (req, res) => {
  const clientId = process.env.FITBIT_CLIENT_ID
  const redirectUri = process.env.FITBIT_REDIRECT_URI

  if (!clientId || !redirectUri) {
    res.status(500).json({
      error: 'Fitbit OAuth is not configured. Set FITBIT_CLIENT_ID and FITBIT_REDIRECT_URI.',
    })
    return
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: [
      'activity',
      'heartrate',
      'location',
      'nutrition',
      'profile',
      'settings',
      'sleep',
      'social',
      'weight',
    ].join(' '),
    redirect_uri: redirectUri,
  })

  const url = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`
  res.redirect(url)
})

app.get('/auth/fitbit/callback', async (req, res) => {
  const code = req.query.code
  const clientId = process.env.FITBIT_CLIENT_ID
  const clientSecret = process.env.FITBIT_CLIENT_SECRET
  const redirectUri = process.env.FITBIT_REDIRECT_URI

  if (!code || !clientId || !clientSecret || !redirectUri) {
    res
      .status(400)
      .send(
        'Missing code or Fitbit configuration. Ensure FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, and FITBIT_REDIRECT_URI are set.',
      )
    return
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenRes = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: String(code),
      }),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error('Fitbit token exchange failed', tokenRes.status, text)
      res.status(500).send('Fitbit token exchange failed.')
      return
    }

    const tokenJson = await tokenRes.json()

    fitbitTokens.accessToken = tokenJson.access_token
    fitbitTokens.refreshToken = tokenJson.refresh_token
    fitbitTokens.userId = tokenJson.user_id

    res.send(
      '<html><body><script>window.close();</script><p>Fitbit connected. You can close this window.</p></body></html>',
    )
  } catch (err) {
    console.error('Fitbit callback error', err)
    res.status(500).send('Unexpected error handling Fitbit callback.')
  }
})

async function fetchFitbitJson(path) {
  if (!fitbitTokens.accessToken) {
    throw new Error('Not connected to Fitbit')
  }

  const res = await fetch(`https://api.fitbit.com${path}`, {
    headers: {
      Authorization: `Bearer ${fitbitTokens.accessToken}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Fitbit API error', res.status, text)
    throw new Error(`Fitbit API error: ${res.status}`)
  }

  return res.json()
}

app.get('/api/metrics/fitbit', async (req, res) => {
  if (!fitbitTokens.accessToken) {
    res.status(400).json({ error: 'Fitbit is not connected yet.' })
    return
  }

  try {
    const today = new Date().toISOString().slice(0, 10)
    const period = '30d'

    const [profile, activities, weight, sleep] = await Promise.all([
      fetchFitbitJson('/1/user/-/profile.json'),
      fetchFitbitJson(`/1/user/-/activities/steps/date/${today}/${period}.json`),
      fetchFitbitJson(`/1/user/-/body/weight/date/${today}/${period}.json`),
      fetchFitbitJson(`/1.2/user/-/sleep/date/${today}.json`),
    ])

    let heightCm = null
    if (profile.user && profile.user.height) {
      if (profile.user.heightUnit === 'METRIC' || profile.user.measurementSystem === 'METRIC') {
        heightCm = Number(profile.user.height)
      } else {
        const inches = Number(profile.user.height)
        if (Number.isFinite(inches)) {
          heightCm = inches * 2.54
        }
      }
    }

    let weightKg = null
    if (Array.isArray(weight.weight) && weight.weight.length > 0) {
      const latest = weight.weight[weight.weight.length - 1]
      if (latest.weight != null) {
        weightKg = Number(latest.weight)
      }
    }

    let averageSteps = null
    if (Array.isArray(activities['activities-steps'])) {
      const stepsArr = activities['activities-steps']
        .map((d) => Number(d.value))
        .filter((v) => Number.isFinite(v))
      if (stepsArr.length) {
        const sum = stepsArr.reduce((acc, v) => acc + v, 0)
        averageSteps = sum / stepsArr.length
      }
    }

    let sleepHours = null
    if (Array.isArray(sleep.sleep) && sleep.sleep.length > 0) {
      const durationsMinutes = sleep.sleep
        .map((s) => Number(s.duration) / 60000)
        .filter((v) => Number.isFinite(v) && v > 0)
      if (durationsMinutes.length) {
        const sumMinutes = durationsMinutes.reduce((acc, v) => acc + v, 0)
        sleepHours = sumMinutes / 60 / durationsMinutes.length
      }
    }

    const payload = {
      metrics: {
        heightCm,
        weightKg,
        averageSteps,
        sleepHours,
      },
      raw: {
        profile,
        activities,
        weight,
        sleep,
      },
      fetchedAt: new Date().toISOString(),
    }

    try {
      await fs.promises.writeFile(
        path.join(dataDir, 'fitbit-latest.json'),
        JSON.stringify(payload, null, 2),
        'utf8',
      )
    } catch (writeErr) {
      console.error('Failed to persist Fitbit payload to disk', writeErr)
    }

    res.json(payload)
  } catch (err) {
    console.error('Error fetching Fitbit metrics', err)
    res.status(500).json({ error: 'Failed to fetch Fitbit metrics.' })
  }
})

app.get('/api/metrics/fitbit/raw', async (req, res) => {
  try {
    const filePath = path.join(dataDir, 'fitbit-latest.json')
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'No Fitbit data has been saved yet.' })
      return
    }
    const contents = await fs.promises.readFile(filePath, 'utf8')
    res.setHeader('Content-Type', 'application/json')
    res.send(contents)
  } catch (err) {
    console.error('Error reading persisted Fitbit payload', err)
    res.status(500).json({ error: 'Failed to read saved Fitbit data.' })
  }
})

function generatePlanFromProfile(profile, goals) {
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
      summary = 'You are slightly above the typical BMI range; focus on sustainable fat loss and daily movement.'
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

app.post('/api/plan', (req, res) => {
  try {
    const { profile = {}, goals = {} } = req.body || {}
    const plan = generatePlanFromProfile(profile, goals)
    res.json(plan)
  } catch (err) {
    console.error('Error generating plan', err)
    res.status(500).json({ error: 'Failed to generate plan.' })
  }
})

app.listen(PORT, () => {
  console.log(`Tracker backend listening on http://localhost:${PORT}`)
})

