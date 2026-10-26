import mongoose, { Schema, Document, Model, Types } from "mongoose";

export { generateProjectKey, type ProjectStatus } from "@/lib/project-utils";
import { type ProjectStatus } from "@/lib/project-utils";

export const PROJECT_COLORS = [
  "blue",
  "indigo",
  "violet",
  "pink",
  "red",
  "orange",
  "emerald",
  "teal",
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];

export interface IProject extends Document {
  name: string;
  description: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  status: ProjectStatus;
  color: ProjectColor;
  key: string;
  nextTaskNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project owner is required"],
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["active", "archived", "completed"],
      default: "active",
      index: true,
    },
    color: {
      type: String,
      enum: PROJECT_COLORS,
      default: "blue",
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 5,
      match: [/^[A-Z]{2,5}$/, "Project key must be 2 to 5 uppercase letters"],
      default: "TF",
    },
    nextTaskNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ members: 1 });
ProjectSchema.index({ key: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
