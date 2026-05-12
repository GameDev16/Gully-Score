import { Venue } from "../models/Venue.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = {};
  if (q)
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { city: { $regex: q, $options: "i" } },
    ];
  res.json(await Venue.find(filter).limit(50));
});

export const create = asyncHandler(async (req, res) => {
  const v = await Venue.create({ ...req.body, hostId: req.user._id });
  res.status(201).json(v);
});
