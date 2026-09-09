import type { MetadataRoute } from "next";
import { getOrigin } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api"] }],
    sitemap: `${getOrigin()}/sitemap.xml`,
  };
}
