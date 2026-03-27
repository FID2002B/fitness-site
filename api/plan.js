import { buildPlan } from '../server/build-plan.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.end('Method Not Allowed')
    return
  }

  try {
    const body = req.body || {}
    const { profile = {}, goals = {} } = body
    const plan = await buildPlan(profile, goals)
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
