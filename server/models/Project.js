const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed"],
      default: "active",
    },
    deadline: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The PM who owns this project
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // One team leader per project
    teamLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Regular team members (employees)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Tasks linked to this project
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
  },
  { timestamps: true }
);

// Virtual: all people who can see this project
projectSchema.virtual("allParticipants").get(function () {
  const participants = [...this.members.map((m) => m.toString())];
  if (this.teamLeader) participants.push(this.teamLeader.toString());
  if (this.projectManager) participants.push(this.projectManager.toString());
  return [...new Set(participants)];
});

module.exports = mongoose.model("Project", projectSchema);