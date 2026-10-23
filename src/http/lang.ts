import type { Context } from "hono";
import type { UiLanguage } from "../providers/registry.js";

/**
 * Bahasa per-request dari query `lang` (saklar bahasa UI: "id" | "en").
 * Nilai lain / tidak ada -> undefined (provider memakai bahasa dari config/env).
 */
export function langParam(c: Context): UiLanguage | undefined {
  const raw = c.req.query("lang");
  return raw === "id" || raw === "en" ? raw : undefined;
}
