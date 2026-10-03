import type { MetadataRoute } from "next";

import { SITE_URL } from "@/components/landing/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }];
}
