const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Task = require("../models/Task");
const { protect } = require("../middleware/auth");
const Project = require("../models/Project");

// GET /api/comments/:taskId
router.get("/:taskId", protect, async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate("author", "name email color role")
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/comments/:taskId
router.post("/:taskId", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Only assigned user, creator, Admin, PM can comment
    const isAllowed =
      req.user.role === "Admin" ||
      req.user.role === "PM" ||
      task.assignedTo.toString() === req.user._id.toString() ||
      task.createdBy.toString() === req.user._id.toString();

    if (!isAllowed)
      return res.status(403).json({ message: "Not authorized to comment" });

    const comment = await Comment.create({
      task: req.params.taskId,
      author: req.user._id,
      text: req.body.text,
    });
    const populated = await comment.populate("author", "name email color role");
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/comments/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (
      comment.author.toString() !== req.user._id.toString() &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/comments/project/:projectId
router.get("/project/:projectId", protect, async (req, res) => {
  try {
    const comments = await Comment.find({ project: req.params.projectId })
      .populate("author", "name email color role")
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/comments/project/:projectId
router.post("/project/:projectId", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Authorization: Admin, PM, Team Leader, or Members can comment
    const isAllowed =
      req.user.role === "Admin" ||
      req.user.role === "PM" ||
      project.teamLeader.toString() === req.user._id.toString() ||
      project.members.includes(req.user._id);

    if (!isAllowed) return res.status(403).json({ message: "Not authorized" });

    const comment = await Comment.create({
      project: req.params.projectId,
      author: req.user._id,
      text: req.body.text,
    });
    const populated = await comment.populate("author", "name email color role");
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
module.exports = router;
