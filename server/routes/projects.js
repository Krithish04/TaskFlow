const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// ─── Helper: check if requesting user is a participant ───────────────────────
const isParticipant = (project, userId) => {
  const id = userId.toString();
  const members = project.members.map((m) => m.toString());
  const leader = project.teamLeader?.toString();
  const pm = project.projectManager.toString();
  return members.includes(id) || leader === id || pm === id;
};

// ─── GET /api/projects ────────────────────────────────────────────────────────
// Admin → all projects
// PM   → projects they manage
// User → projects they are a member of
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "PM") {
      query.projectManager = req.user._id;
    } else if (req.user.role === "User") {
      query.$or = [
        { members: req.user._id },
        { teamLeader: req.user._id },
      ];
    }
    // admin gets everything (empty query)

    const projects = await Project.find(query)
      .populate("projectManager", "name email avatar")
      .populate("teamLeader", "name email avatar")
      .populate("members", "name email avatar")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("projectManager", "name email avatar")
      .populate("teamLeader", "name email avatar")
      .populate("members", "name email avatar")
      .populate("tasks");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Access control: admin can see all; others must be participants
    if (req.user.role !== "Admin" && !isParticipant(project, req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorised to view this project" });
    }

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/projects ───────────────────────────────────────────────────────
// Only PM or Admin can create
router.post("/", protect, authorize("PM", "Admin"), async (req, res) => {
  try {
    const { name, description, deadline, teamLeader, members } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    // Validate teamLeader exists and has role 'User'
    if (teamLeader) {
      const leader = await User.findById(teamLeader);
      if (!leader || leader.role !== "User") {
        return res.status(400).json({ success: false, message: "Team leader must be a valid team member" });
      }
    }

    // Validate all members exist and have role 'User'
    if (members && members.length) {
      const users = await User.find({ _id: { $in: members }, role: "User" });
      if (users.length !== members.length) {
        return res.status(400).json({ success: false, message: "Some members are invalid or not team members" });
      }
    }

    const project = await Project.create({
      name,
      description,
      deadline,
      teamLeader: teamLeader || null,
      members: members || [],
      projectManager: req.user._id,
      createdBy: req.user._id,
    });

    const populated = await Project.findById(project._id)
      .populate("projectManager", "name email avatar")
      .populate("teamLeader", "name email avatar")
      .populate("members", "name email avatar");

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────
// PM who owns it, or Admin
router.put("/:id", protect, authorize("PM", "Admin"), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (req.user.role === "PM" && project.projectManager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorised to edit this project" });
    }

    const { name, description, deadline, status, teamLeader, members } = req.body;

    if (teamLeader) {
      const leader = await User.findById(teamLeader);
      if (!leader || leader.role !== "User") {
        return res.status(400).json({ success: false, message: "Team leader must be a valid team member" });
      }
    }

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, deadline, status, teamLeader: teamLeader || null, members: members || [] },
      { new: true, runValidators: true }
    )
      .populate("projectManager", "name email avatar")
      .populate("teamLeader", "name email avatar")
      .populate("members", "name email avatar");

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
router.delete("/:id", protect, authorize("PM", "Admin"), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (req.user.role === "PM" && project.projectManager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorised to delete this project" });
    }

    await project.deleteOne();
    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/projects/:id/members ───────────────────────────────────────────
// Add / remove a single member
router.post("/:id/members", protect, authorize("PM", "Admin"), async (req, res) => {
  try {
    const { userId, action } = req.body; // action: 'add' | 'remove'
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    if (req.user.role === "PM" && project.projectManager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorised" });
    }

    if (action === "add") {
      if (!project.members.includes(userId)) project.members.push(userId);
    } else if (action === "remove") {
      project.members = project.members.filter((m) => m.toString() !== userId);
      if (project.teamLeader?.toString() === userId) project.teamLeader = null;
    }

    await project.save();
    const updated = await Project.findById(project._id)
      .populate("projectManager", "name email avatar")
      .populate("teamLeader", "name email avatar")
      .populate("members", "name email avatar");

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;