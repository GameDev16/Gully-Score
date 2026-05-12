import mongoose from "mongoose";

const TeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    shortName: { type: String, maxlength: 4, uppercase: true },
    logoUrl: String,
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    homeColor: { type: String, default: "#1A7A4A" },
    awayColor: { type: String, default: "#F5F0E8" },
  },
  { timestamps: true },
);

TeamSchema.index({ name: "text", shortName: "text" });

export const Team = mongoose.model("Team", TeamSchema);
