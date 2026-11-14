import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const guides = await db.guide.findMany({ where: { published: true, isFree: true }, select: { slug: true } });
  return [...["", "/guides", "/cadeau", "/inscription"].map((p) => ({ url: base + p })), ...guides.map((g) => ({ url: `${base}/guides/${g.slug}` }))];
}
