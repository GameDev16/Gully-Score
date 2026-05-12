import mongoose from "mongoose";
import "dotenv/config";
import { User } from "../models/User.js";
import { connectDB } from "../config/db.js";

async function fetchUsers() {
  try {
    await connectDB();
    const users = await User.find({}, { name: 1, email: 1, role: 1 });
    console.log('\n==================================================');
    console.log('                 REGISTERED USERS                 ');
    console.log('==================================================\n');
    
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.table(users.map(u => ({
        Name: u.name,
        Email: u.email,
        Role: u.role || 'user',
        ID: u._id.toString()
      })));
    }
    console.log('\n==================================================\n');
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
fetchUsers();
