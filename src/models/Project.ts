import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ProjectStatus = "active" | "archived" | "completed";

export interface IProject extends Document {
  name: string;
  description: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  status: ProjectStatus;
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
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ members: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

