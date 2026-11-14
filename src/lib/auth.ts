import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { db } from "./db";

const COOKIE = "pp_session";
const CHILD_COOKIE = "pp_child";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET doit contenir au moins 32 caractères.");
    return new TextEncoder().encode("dev-secret-dev-secret-dev-secret-dev-secret");
  }
  return new TextEncoder().encode(s);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}
export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE);
  c.delete(CHILD_COOKIE);
}

export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return await db.user.findUnique({ where: { id: payload.sub }, include: { subscription: true, children: { orderBy: { createdAt: "asc" } } } });
  } catch {
    return null;
  }
});

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/connexion");
  return u;
}

const STAFF: Role[] = ["ADMIN", "EDITOR", "MODERATOR", "SUPPORT"];
export const isStaff = (r: Role) => STAFF.includes(r);
// Matrice d'autorisations du back-office.
export const PERMS: Record<string, Role[]> = {
  content: ["ADMIN", "EDITOR"],
  moderation: ["ADMIN", "MODERATOR"],
  users: ["ADMIN", "SUPPORT"],
  billing: ["ADMIN"],
  rules: ["ADMIN"],
  stats: ["ADMIN", "SUPPORT", "EDITOR", "MODERATOR"],
};
export const can = (role: Role, perm: keyof typeof PERMS | string) => (PERMS[perm] ?? ["ADMIN"]).includes(role);
export async function requirePerm(perm: string) {
  const u = await requireUser();
  if (!can(u.role, perm)) redirect("/app");
  return u;
}

// Enfant actif : toujours vérifié comme appartenant au parent connecté.
export async function getActiveChild() {
  const u = await requireUser();
  if (u.children.length === 0) redirect("/app/onboarding");
  const id = (await cookies()).get(CHILD_COOKIE)?.value;
  return { user: u, child: u.children.find((c) => c.id === id) ?? u.children[0] };
}
export async function setActiveChild(id: string) {
  (await cookies()).set(CHILD_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
}
export async function ownChild(childId: string) {
  const u = await requireUser();
  const c = u.children.find((x) => x.id === childId);
  if (!c) throw new Error("Profil introuvable.");
  return { user: u, child: c };
}
export async function audit(userId: string | null, action: string, detail?: string) {
  await db.auditLog.create({ data: { userId, action, detail } }).catch(() => {});
}
export async function track(name: string) {
  const day = new Date(new Date().toISOString().slice(0, 10));
  await db.usageEvent.upsert({ where: { name_day: { name, day } }, update: { count: { increment: 1 } }, create: { name, day } }).catch(() => {});
}
