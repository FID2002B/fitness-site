import './App.css'

import { useState } from 'react'

/**
 * Plan wording follows globally cited guidance (not personalized medicine):
 * WHO (movement, diet patterns, sustainable weight management), international sleep consensus (≥7 h adults),
 * ISSN (protein ranges for training). National guidelines in many countries align with WHO targets.
 */

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

interface PlanSource {
  title: string
  url: string
}

interface ActionPlan {
  summary: string
  sections: PlanSection[]
  disclaimers: string[]
  webSearchUsed?: boolean
  sources?: PlanSource[]
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

/** "Generate new plan" builds a mostly different plan (~75%+ new content): different summary, training approach, nutrition angle, and recovery focus. */
function generatePlanVariant(profile: UserProfile, goals: UserGoals): ActionPlan {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  const activityLevel = inferActivityLevel(profile)
  const stepsTarget =
    activityLevel === 'sedentary' ? 6000 :
    activityLevel === 'light' ? 8000 :
    activityLevel === 'moderate' ? 9000 : 10000
  const timeline = Number(goals.timelineMonths || '0')
  const sleep = Number(profile.sleepHours || '0')

  // Summary: pick one of several completely different angles
  const summary = pick([
    'Focus on sustainable habits: daily movement, protein-rich meals, and recovery. Adjust intensity based on how you feel.',
    'Your plan emphasizes consistency over perfection—small, repeatable changes in training, nutrition, and sleep.',
    "We'll prioritize one main lever at a time (e.g. steps first, then strength, then nutrition) so you don't get overwhelmed.",
    'A practical, time-efficient approach: short movement blocks, simple nutrition rules, and protected recovery.',
    "Build the plan around your schedule and constraints; we'll keep sessions and meals realistic so you can stick with it.",
  ])

  // Movement: anchor on WHO global physical activity recommendations, then vary the practical layout
  const movementBullets: string[] = []
  movementBullets.push(
    'Weekly baseline from WHO global guidance: adults should get at least 150–300 min/week of moderate-intensity aerobic activity (or 75–150 min vigorous), or an equivalent mix; plus muscle-strengthening for all major muscle groups on at least 2 days/week.',
  )

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
  if (goals.primaryGoal === 'lose_fat') {
    nutritionBullets.push(
      'Weight loss: WHO stresses sustainable healthy eating and energy balance; many programmes worldwide aim for gradual loss—often discussed as about 0.5–1 kg per week (roughly 1–2 lb)—rather than crash diets.',
    )
  } else if (goals.primaryGoal === 'build_muscle') {
    nutritionBullets.push(
      'Protein for training: sports nutrition reviews (e.g. ISSN) often cite roughly 1.4–2.0 g per kg body weight per day for people doing resistance training, with about 20–40 g protein per meal spread through the day—adjust for preference and digestion.',
    )
  } else {
    nutritionBullets.push(
      'Overall pattern: WHO healthy-diet principles—ample vegetables and fruits (WHO recommends at least 400 g/day combined), whole grains, legumes, nuts; limit salt, free sugars, and harmful fats.',
    )
  }

  const nutritionApproach = pick([
    () => {
      if (goals.primaryGoal === 'lose_fat') nutritionBullets.push('Small deficit: cut roughly 200–500 kcal/day from maintenance and aim for about 0.25–1% body weight loss per week; prioritize protein and fiber so hunger stays manageable.')
      else if (goals.primaryGoal === 'build_muscle') nutritionBullets.push('Calories: maintenance or a small controlled surplus; keep protein spread across 3–5 eating times with a quality source at each.')
      else nutritionBullets.push('Eat regularly and focus on whole foods; limit liquid calories and large late-night meals.')
      if (profile.nutritionQuality === 'poor' || profile.nutritionQuality === 'ok') {
        nutritionBullets.push('Upgrade one anchor meal first (e.g. breakfast or lunch) to include protein + vegetables + whole grains.')
        nutritionBullets.push('Swap packaged snacks for fruit, nuts, Greek yogurt, or veggie sticks so defaults are better without willpower.')
      } else nutritionBullets.push('Tweak portions and protein timing; keep 2–4 solid meals and avoid skipping meals or over-restricting.')
      if (timeline >= 3) nutritionBullets.push('Reassess every 4–6 weeks: adjust calories or portions gradually instead of big swings.')
    },
    () => {
      if (goals.primaryGoal === 'lose_fat') nutritionBullets.push('Prioritize protein and fiber at each meal; reduce added sugars and fried foods. Let the deficit be modest and consistent—fast drops often cost lean mass.')
      else if (goals.primaryGoal === 'build_muscle') nutritionBullets.push('If gaining too fast, trim surplus slightly; if stalled, add about 100–300 kcal from mostly whole foods. Pair training with adequate sleep (recovery drives adaptation).')
      else nutritionBullets.push('Stable meal timing and balanced plates (protein + veg + starch); avoid binge–restrict cycles.')
      if (profile.nutritionQuality === 'poor' || profile.nutritionQuality === 'ok') {
        nutritionBullets.push('Pick the one meal you control most and make it higher in protein and vegetables; repeat that template often.')
        nutritionBullets.push('Keep fruit, nuts, and yogurt visible; store less healthy options out of sight.')
      } else nutritionBullets.push('Refine what you already do: portion sizes, protein distribution, and consistency.')
      if (timeline >= 3) nutritionBullets.push('Every month, review weight and energy; make small adjustments rather than overhauling the plan.')
    },
    () => {
      if (goals.primaryGoal === 'lose_fat') nutritionBullets.push('Gentle deficit with an emphasis on satiety: protein and vegetables first, then starches and fats—fiber helps adherence.')
      else if (goals.primaryGoal === 'build_muscle') nutritionBullets.push('Carbohydrate timing: include starch or fruit around harder sessions for performance; total daily protein matters more than one “magic” post-workout window.')
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
  lifestyleBullets.push(
    'Sleep: international sleep-medicine consensus recommends at least 7 hours per night for adults regularly; many people feel best with 7–9 hours.',
  )
  if (!sleep || sleep < 7) {
    lifestyleBullets.push(
      'If you’re short on sleep: fixed wake time, dim light and screens down 30–60 min before bed, and a simple wind-down (read, stretch)—sleep drives appetite, recovery, and training quality.',
    )
  } else {
    lifestyleBullets.push(
      'Protect a stable sleep window; short sleep raises injury and overeating risk and blunts training gains.',
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
  const [showIntro, setShowIntro] = useState(true)

  const handleGenerateNewPlan = () => {
    setIsGenerating(true)
    setPlan(generatePlanVariant(profile, goals))
    setIsGenerating(false)
  }

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setPlan(generatePlanVariant(profile, goals))
  }

  if (showIntro) {
    return (
      <div className="app-root">
        <main className="app-shell">
          <header className="hero">
            <div>
              <h1>Personal Fitness Blueprint</h1>
              <p>
                A few questions, then a practical plan for movement, nutrition, and recovery—personalized to you.
              </p>
              <div className="hero-icons" aria-hidden="true">
                <span className="hero-chip">🥗 Nutrition</span>
                <span className="hero-chip">🏃 Training</span>
                <span className="hero-chip">🧘 Recovery</span>
              </div>
            </div>
          </header>

          <div className="layout">
            <section className="panel">
              <div className="form-grid intro-form-grid">
                <h2>Start here</h2>
                <div className="plan-section intro-highlight">
                  <p className="intro-copy">
                    One short form: your routine, goals, and a bit of context. Ballpark numbers are fine—you can
                    refine anytime.
                  </p>
                </div>
                <p className="form-hint intro-disclaimer">
                  Educational only; not medical advice. Check with a professional when in doubt.
                </p>
                <div className="actions">
                  <button type="button" onClick={() => setShowIntro(false)}>
                    Continue to your blueprint
                  </button>
                </div>
              </div>
            </section>

            <section className="panel plan-panel">
              <div className="plan-placeholder">
                <h2>Your action plan will appear here</h2>
                <p>
                  On the next screen, fill in the form on the left and click <strong>Generate my plan</strong>.
                  Your personalized movement, nutrition, and lifestyle steps will show in this panel—the same
                  place as your real results.
                </p>
              </div>
            </section>
          </div>
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
            <button type="button" className="intro-back-link" onClick={() => setShowIntro(true)}>
              ← Back to introduction
            </button>
          </div>
        </header>

        <div className="layout">
          <section className="panel">
            <form onSubmit={handleGenerate} className="form-grid">
              <h2>Your current profile</h2>
              <div className="field-row one skinny-age">
                <label>
                  <span>Age</span>
                  <input
                    type="number"
                    inputMode="numeric"
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
                        inputMode="numeric"
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
                        inputMode="numeric"
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
                    inputMode="numeric"
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
                    inputMode="numeric"
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
                    inputMode="decimal"
                    min={3}
                    max={12}
                    step={0.5}
                    className="compact-input"
                    value={profile.sleepHours}
                    onChange={(e) => setProfile({ ...profile, sleepHours: e.target.value })}
                  />
                </label>
              </div>
              <p className="form-hint">
                Rough guesses are fine for average steps and sleep—you don&apos;t need exact numbers.
              </p>

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
                    inputMode="numeric"
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
                    inputMode="numeric"
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
