import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const COOKIE = "df_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "digitalforge-dev-secret-change-in-production",
);

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.id || !payload.email || !payload.role) return null;
    return {
      id: Number(payload.id),
      email: String(payload.email),
      name: String(payload.name || ""),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const rows = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  const user = rows[0];
  if (!user || user.deletedAt) return null;
  return user;
}

export function isStaff(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  if (host && !origin.includes(host)) {
    throw new Error("Invalid origin");
  }
}
