import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFile extends Document {
  project: Types.ObjectId;
  uploader: Types.ObjectId;
  name: string;
  mime: string;
  size: number;
  storageId: Types.ObjectId;
  taskId?: Types.ObjectId | null;
  messageId?: Types.ObjectId | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    uploader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader reference is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    mime: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, "File size in bytes is required"],
      min: [1, "File size must be greater than 0"],
    },
    storageId: {
      type: Schema.Types.ObjectId,
      required: [true, "GridFS storage ID is required"],
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    messageId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

FileSchema.index({ project: 1, deletedAt: 1, createdAt: -1 });

export const File: Model<IFile> =
  mongoose.models.File || mongoose.model<IFile>("File", FileSchema);
