import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMessage extends Document {
  project: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  attachments: Types.ObjectId[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author reference is required"],
      index: true,
    },
    body: {
      type: String,
      default: "",
      maxlength: [4000, "Message body cannot exceed 4000 characters"],
      trim: true,
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: "File",
      },
    ],
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

// Compound index for querying chronological messages with `after`
MessageSchema.index({ project: 1, deletedAt: 1, createdAt: 1 });
MessageSchema.index({ project: 1, createdAt: -1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
