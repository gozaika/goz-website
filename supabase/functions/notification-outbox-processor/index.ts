import { jsonResponse } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (!["POST", "GET"].includes(request.method)) {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  return jsonResponse(
    {
      ok: false,
      error: "notification-outbox-processor is deprecated. Deploy and invoke notification-outbox-worker for Slice 6 delivery.",
    },
    410,
  );
});
