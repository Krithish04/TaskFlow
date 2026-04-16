const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');

// GET /api/users  — Admin only: all users
router.get('/', protect, authorize('Admin', 'PM'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/assignable — PM: users who can be assigned tasks
router.get('/assignable', protect, authorize('Admin', 'PM'), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['User', 'PM'] } }).select('-password').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/stats — Admin: per-user task stats
router.get('/stats', protect, authorize('Admin'), async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $group: {
          _id: '$assignedTo',
          total:     { $sum: 1 },
          pending:   { $sum: { $cond: [{ $eq: ['$status','Pending'] }, 1, 0] } },
          inProgress:{ $sum: { $cond: [{ $eq: ['$status','In Progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status','Completed'] }, 1, 0] } }
      }}
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users  — Admin: add user
router.post('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const colors = ['#6C63FF','#1a9cb0','#3ecfcf','#f5a623','#ff5e5e','#a78bfa','#34d399'];
    const count = await User.countDocuments();
    const user = await User.create({ name, email, password, role: role || 'User', color: colors[count % colors.length] });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, color: user.color });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/users/:id — Admin only
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't remove yourself" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
