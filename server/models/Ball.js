import mongoose from "mongoose";

const BallSchema = new mongoose.Schema(
  {
    overId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Over",
      required: true,
      index: true,
    },
    inningsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Innings",
      required: true,
      index: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    overNumber: Number,
    ballNumber: Number,
    batterId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    runsScored: { type: Number, default: 0 },
    isExtra: { type: Boolean, default: false },
    extraType: {
      type: String,
      enum: ["wide", "no-ball", "leg-bye", "bye", "penalty", null],
    },
    extraRuns: { type: Number, default: 0 },
    isLegalDelivery: { type: Boolean, default: true },
    isWicket: { type: Boolean, default: false },
    wicket: {
      type: {
        type: String,
        enum: [
          "bowled",
          "caught",
          "lbw",
          "run-out",
          "stumped",
          "hit-wicket",
          "obstructing-field",
          "handled-ball",
          "timed-out",
          "retired-hurt",
        ],
      },
      dismissedPlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player",
      },
      fielder1Id: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      fielder2Id: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      bowlerCredited: { type: Boolean, default: false },
    },
    isBoundary: { type: Boolean, default: false },
    boundaryType: { type: String, enum: ["4", "6", null] },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Ball = mongoose.model("Ball", BallSchema);
