const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');

// GET /api/tasks — role-aware list
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'User') query.assignedTo = req.user._id;
    // Admin & PM see all

    const { status, priority, assignedTo, search } = req.query;
    if (status)     query.status   = status;
    if (priority)   query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search)     query.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email color role')
      .populate('createdBy',  'name email color role')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/stats — task counts by status
router.get('/stats', protect, async (req, res) => {
  try {
    let matchStage = {};
    if (req.user.role === 'User') matchStage.assignedTo = req.user._id;

    const stats = await Task.aggregate([
      { $match: matchStage },
      { $group: {
          _id: '$status',
          count: { $sum: 1 }
      }}
    ]);

    const result = { Pending: 0, 'In Progress': 0, Completed: 0, total: 0 };
    stats.forEach(s => { result[s._id] = s.count; result.total += s.count; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email color role')
      .populate('createdBy',  'name email color role');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks — Admin or PM
router.post('/', protect, authorize('Admin', 'PM'), async (req, res) => {
  try {
    const { title, description, assignedTo, priority, status, dueDate, tags } = req.body;
    const task = await Task.create({
      title, description, assignedTo, priority, status, dueDate, tags,
      createdBy: req.user._id
    });
    const populated = await task.populate([
      { path: 'assignedTo', select: 'name email color role' },
      { path: 'createdBy',  select: 'name email color role' }
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/tasks/:id — Admin/PM full edit; User can only update status
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role === 'User') {
      // Users can only update their own task status
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      task.status = req.body.status || task.status;
    } else {
      const { title, description, assignedTo, priority, status, dueDate, tags } = req.body;
      if (title)       task.title       = title;
      if (description !== undefined) task.description = description;
      if (assignedTo)  task.assignedTo  = assignedTo;
      if (priority)    task.priority    = priority;
      if (status)      task.status      = status;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (tags)        task.tags        = tags;
    }

    await task.save();
    const updated = await Task.findById(task._id)
      .populate('assignedTo', 'name email color role')
      .populate('createdBy',  'name email color role');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id — Admin or PM
router.delete('/:id', protect, authorize('Admin', 'PM'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    // Also delete comments
    await require('../models/Comment').deleteMany({ task: req.params.id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
