import mongoose from "mongoose";

const VenueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: String,
    state: String,
    country: String,
    pitchType: {
      type: String,
      enum: ["flat", "turning", "seaming", "bouncy"],
      default: "flat",
    },
    capacity: Number,
    googleMapsUrl: String,
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true },
);

VenueSchema.index({ name: "text", city: "text" });

export const Venue = mongoose.model("Venue", VenueSchema);
