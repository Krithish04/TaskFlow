const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Optional task link
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  // ADD THIS: Optional project link
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', CommentSchema);