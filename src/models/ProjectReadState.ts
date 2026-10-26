import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IProjectReadState extends Document {
  user: Types.ObjectId;
  project: Types.ObjectId;
  lastReadAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectReadStateSchema = new Schema<IProjectReadState>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so there is exactly one read state per user per project
ProjectReadStateSchema.index({ user: 1, project: 1 }, { unique: true });
ProjectReadStateSchema.index({ project: 1, lastReadAt: -1 });

export const ProjectReadState: Model<IProjectReadState> =
  mongoose.models.ProjectReadState ||
  mongoose.model<IProjectReadState>("ProjectReadState", ProjectReadStateSchema);
