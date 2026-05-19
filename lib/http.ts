export async function safeJson(res: Response) {
  const raw = await res.text();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return { error: raw.slice(0, 500) || `HTTP ${res.status}` }; }
}
