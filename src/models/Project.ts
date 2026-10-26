import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ProjectStatus = "active" | "archived" | "completed";

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

export function generateProjectKey(
  name: string,
  existingKeys?: Set<string> | string[]
): string {
  const set = existingKeys instanceof Set ? existingKeys : new Set(existingKeys || []);

  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  let candidate = "";

  if (words.length >= 2) {
    candidate = words
      .map((w) => w[0])
      .slice(0, 5)
      .join("");
  } else if (words.length === 1) {
    const single = words[0];
    if (single.length >= 2) {
      candidate = single.slice(0, Math.min(single.length, 4));
    } else {
      candidate = single + "P";
    }
  }

  // Ensure only A-Z
  candidate = candidate.replace(/[^A-Z]/g, "");

  if (candidate.length < 2) {
    candidate = (candidate + "PR").slice(0, 2);
  } else if (candidate.length > 5) {
    candidate = candidate.slice(0, 5);
  }

  let finalKey = candidate;
  let counter = 1;
  while (set.has(finalKey)) {
    const charSuffix = String.fromCharCode(65 + ((counter - 1) % 26));
    const base = candidate.slice(0, Math.min(candidate.length, 4));
    finalKey = (base + charSuffix).slice(0, 5);
    counter++;
    if (counter > 50) {
      finalKey = "PRJ" + String.fromCharCode(65 + (counter % 26));
      break;
    }
  }

  return finalKey;
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
