// (Use MMKV / AsyncStorage later; this is clean Phase-1 baseline)

export type WindowLog = any;
export type SessionSummary = any;

// -------------------------
// In-memory stores (Phase-1)
// -------------------------
let windowLogs: WindowLog[] = [];
let sessionSummary: SessionSummary | null = null;

// -------------------------
// Window-level logging
// -------------------------
export function storeWindowLog(log: WindowLog) {
  windowLogs.push(log);
}

// -------------------------
// Session-level logging
// -------------------------
export function storeSessionSummary(summary: SessionSummary) {
  sessionSummary = summary;
}

// -------------------------
// Debug accessors
// -------------------------
export async function getWindowLogs(): Promise<WindowLog[]> {
  return windowLogs;
}

export async function getSessionSummaries(): Promise<SessionSummary | null> {
  return sessionSummary;
}

// -------------------------
// Dev-only reset
// -------------------------
export async function clearLogs() {
  windowLogs = [];
  sessionSummary = null;
}
