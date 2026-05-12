import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["host", "scorer", "admin"], default: "host" },
    avatar: String,
    phone: String,
    lastLogin: Date,
    hosted_tournaments: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
    ],
    scoring_assignments: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Match" },
    ],
  },
  { timestamps: true },
);

UserSchema.index({ name: "text", email: "text" });

export const User = mongoose.model("User", UserSchema);
