import mongoose from "mongoose";

const OverSchema = new mongoose.Schema(
  {
    inningsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Innings",
      required: true,
      index: true,
    },
    overNumber: Number,
    bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    balls: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ball" }],
    runsInOver: { type: Number, default: 0 },
    wicketsInOver: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    isMaiden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Over = mongoose.model("Over", OverSchema);
