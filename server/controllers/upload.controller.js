import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadBufferToCloudinary } from "../middleware/upload.js";

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  // If Cloudinary is configured, use it
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    const result = await uploadBufferToCloudinary(req.file.buffer, "pitchday");
    return res.json({ url: result.secure_url, publicId: result.public_id });
  }

  // Dev fallback: return base64 data URL (works without Cloudinary)
  const base64 = req.file.buffer.toString("base64");
  return res.json({ url: `data:${req.file.mimetype};base64,${base64}` });
});
