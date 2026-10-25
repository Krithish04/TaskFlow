import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IComment extends Document {
  task: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task reference is required"],
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
      required: [true, "Comment body is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

CommentSchema.index({ task: 1, createdAt: 1 });

export const Comment: Model<IComment> =
  mongoose.models.Comment ||
  mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
