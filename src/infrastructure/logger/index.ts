// Logger terstruktur sederhana — satu baris per event, level + konteks JSON.
// Cukup untuk server lokal; tidak menarik dependensi logging eksternal.

type Level = "info" | "warn" | "error";

function emit(level: Level, msg: string, ctx?: Record<string, unknown>): void {
  const line = {
    time: new Date().toISOString(),
    level,
    msg,
    ...(ctx ?? {}),
  };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
};
