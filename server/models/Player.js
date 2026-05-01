import mongoose from "mongoose";

const BattingCareerSchema = new mongoose.Schema(
  {
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
  },
  { _id: false },
);

const BowlingCareerSchema = new mongoose.Schema(
  {
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    bestFigures: {
      wickets: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
    },
    fourWickets: { type: Number, default: 0 },
    fiveWickets: { type: Number, default: 0 },
  },
  { _id: false },
);

const PlayerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dateOfBirth: Date,
    role: {
      type: String,
      enum: ["batsman", "bowler", "allrounder", "wicketkeeper"],
      default: "batsman",
    },
    battingStyle: {
      type: String,
      enum: ["right-hand", "left-hand"],
      default: "right-hand",
    },
    bowlingStyle: {
      type: String,
      enum: [
        "right-arm-fast",
        "left-arm-fast",
        "right-arm-spin",
        "left-arm-spin",
        "none",
      ],
      default: "none",
    },
    avatar: String,
    jerseyNumber: Number,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", index: true },
    career_stats: {
      matches: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      batting: { type: BattingCareerSchema, default: () => ({}) },
      bowling: { type: BowlingCareerSchema, default: () => ({}) },
    },
  },
  { timestamps: true },
);

PlayerSchema.index({ name: "text" });

export const Player = mongoose.model("Player", PlayerSchema);
