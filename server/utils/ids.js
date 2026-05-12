import { customAlphabet } from "nanoid";
const alpha = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const genShortCode = customAlphabet(alpha, 6);
export const genMatchKey = customAlphabet(alpha, 8);
