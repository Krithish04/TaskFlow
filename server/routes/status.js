// server/routes/status.js
// Register in index.js: app.use('/api/status', require('./routes/status'))

const express = require('express')
const router  = express.Router()
const User    = require('../models/User')
const { protect } = require('../middleware/auth')

// ── PATCH /api/status — update own status ────────────────────────────────────
router.patch('/', protect, async (req, res) => {
  try {
    const { status, leaveUntil } = req.body
    const allowed = ['Online', 'Offline', 'Away', 'On Leave']
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const user = await User.findById(req.user._id)

    // If currently On Leave and leave hasn't expired — block change
    if (
      user.status === 'On Leave' &&
      user.leaveUntil &&
      new Date() < new Date(user.leaveUntil) &&
      status !== 'On Leave'
    ) {
      return res.status(403).json({
        message: `You are on leave until ${new Date(user.leaveUntil).toLocaleDateString()}. Status cannot be changed.`,
        leaveUntil: user.leaveUntil,
      })
    }

    user.status   = status
    user.lastSeen = new Date()

    // Set or clear leaveUntil
    if (status === 'On Leave' && leaveUntil) {
      user.leaveUntil = new Date(leaveUntil)
    } else if (status !== 'On Leave') {
      user.leaveUntil = null
    }

    await user.save()
    res.json({
      success: true,
      status:     user.status,
      leaveUntil: user.leaveUntil,
      lastSeen:   user.lastSeen,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── PATCH /api/status/heartbeat — called every 60s while tab is open ─────────
// Keeps user Online and updates lastSeen. Server-side job checks lastSeen
// to flip idle users to Away.
router.patch('/heartbeat', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    // Don't override On Leave
    if (user.status === 'On Leave') {
      return res.json({ success: true, status: user.status })
    }

    user.lastSeen = new Date()
    if (user.status === 'Offline' || user.status === 'Away') {
      user.status = 'Online'
    }
    await user.save()
    res.json({ success: true, status: user.status })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── GET /api/status/team — get status of all users (PM/Admin) ────────────────
router.get('/team', protect, async (req, res) => {
  try {
    const users = await User.find({}).select('name email role color status leaveUntil lastSeen')
    res.json({ success: true, data: users })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Idle detection job — call this from your server startup ──────────────────
// Marks users as Away if lastSeen > 10 minutes ago and they're Online
const IDLE_MINUTES = 10
const markIdleUsers = async () => {
  try {
    const cutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000)
    await User.updateMany(
      {
        status:   'Online',
        lastSeen: { $lt: cutoff },
      },
      { $set: { status: 'Away' } }
    )
  } catch (err) {
    console.error('Idle job error:', err.message)
  }
}

// Export job so index.js can schedule it
module.exports = { router, markIdleUsers }
