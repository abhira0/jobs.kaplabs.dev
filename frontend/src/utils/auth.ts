import { cookies } from "next/headers";
import { getDb } from "@/utils/mongodb";
import crypto from "crypto";

const SESSION_COOKIE = "sid";

export function hashPassword(password: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateToken(size = 32): string {
  return crypto.randomBytes(size).toString("base64url");
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db.collection("sessions").findOne({ token });
  if (!session) return null;
  const now = new Date();
  if (session.expires_at && new Date(session.expires_at) < now) return null;
  const user = await db.collection("users").findOne({ _id: session.user_id });
  return { session, user };
}

export async function setSessionCookie(token: string, maxAgeDays = 30) {
  const cookieStore = await cookies();
  const maxAge = maxAgeDays * 24 * 60 * 60;
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}


