import mongoose from "mongoose";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}
