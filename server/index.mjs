import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

import express from 'express'
import cors from 'cors'

import { buildPlan } from './build-plan.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = express()

const PORT = process.env.PORT || 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? true : CLIENT_ORIGIN,
    credentials: true,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/plan', async (req, res) => {
  try {
    const { profile = {}, goals = {} } = req.body || {}
    const plan = await buildPlan(profile, goals)
    res.json(plan)
  } catch (err) {
    console.error('Error generating plan', err)
    res.status(500).json({ error: 'Failed to generate plan.' })
  }
})

if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  const where = existsSync(distDir) ? 'web + API' : 'API'
  console.log(`${where} http://localhost:${PORT}`)
})
