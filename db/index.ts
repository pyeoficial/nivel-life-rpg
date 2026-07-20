import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

declare global {
  // Set at the Worker entry point before Vinext handles each request.
  // The binding is platform-owned and never exposed to the browser.
  var __NIVEL_DB: D1Database | undefined;
}

export function getDb() {
  if (!globalThis.__NIVEL_DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return drizzle(globalThis.__NIVEL_DB, { schema });
}
