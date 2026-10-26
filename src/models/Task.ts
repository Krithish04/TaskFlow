import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface ITask extends Document {
  project: Types.ObjectId;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: Types.ObjectId | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  order: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    number: {
      type: Number,
      required: [true, "Task number is required"],
      min: 1,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done"],
      default: "todo",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      required: true,
      index: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
    order: {
      type: Number,
      required: [true, "Task order position is required"],
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user reference is required"],
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ project: 1, number: 1 }, { unique: true });
TaskSchema.index({ project: 1, status: 1, order: 1 });
TaskSchema.index({ assignee: 1, dueDate: 1 });
TaskSchema.index({ project: 1, completedAt: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
