export function logInfo(msg: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", msg, ...meta }));
}

export function logError(msg: string, meta: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ level: "error", msg, ...meta }));
}
