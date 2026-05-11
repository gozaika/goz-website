export const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

export function safeLog(message: string, meta: Record<string, string | number | boolean | null> = {}): void {
  console.log(JSON.stringify({ message, meta, timestamp: new Date().toISOString() }));
}

