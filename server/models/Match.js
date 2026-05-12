import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema(
  {
    matchKey: { type: String, unique: true, uppercase: true, index: true },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      index: true,
    },
    title: { type: String, required: true },
    format: {
      type: String,
      enum: ["T10", "T20", "ODI", "Test", "Custom"],
      default: "T20",
    },
    overs: { type: Number, default: 20 },
    teamA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    teamB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
    date: Date,
    time: String,
    status: {
      type: String,
      enum: [
        "upcoming",
        "toss",
        "live",
        "innings-break",
        "completed",
        "abandoned",
        "rain-delay",
      ],
      default: "upcoming",
      index: true,
    },
    tossWonBy: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    tossDecision: { type: String, enum: ["bat", "field"] },
    currentInningsNumber: { type: Number, default: 1 },
    innings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Innings" }],
    result: {
      winner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      resultText: String,
      margin: Number,
      marginType: {
        type: String,
        enum: ["runs", "wickets", "tie", "no-result"],
      },
    },
    scorerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    umpire1: String,
    umpire2: String,
    thirdUmpire: String,
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isPublic: { type: Boolean, default: true },
    powerplayOvers: { type: Number, default: 6 },
    notes: String,
  },
  { timestamps: true },
);

MatchSchema.index({ title: "text" });

export const Match = mongoose.model("Match", MatchSchema);
