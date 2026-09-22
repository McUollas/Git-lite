// Tauri rigetta gli errori dei comandi come Error JS: String(e) diventa
// "Error: <messaggio>". Qui estraiamo solo il messaggio originale di git.
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function formatRelativeDate(raw: string): string {
  const [datePart, timePart] = raw.split(" ");
  if (!datePart) return raw;
  const [d, m, y] = datePart.split("/").map(Number);
  if (!d || !m || !y) return raw;

  const commitDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (commitDate.getTime() === today.getTime()) return `Oggi ${timePart ?? ""}`.trim();
  if (commitDate.getTime() === yesterday.getTime()) return `Ieri ${timePart ?? ""}`.trim();
  return timePart ? `${datePart} ${timePart}` : datePart;
}
