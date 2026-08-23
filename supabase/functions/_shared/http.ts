const BASE_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export function corsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("Origin");
  if (!origin) return { ...BASE_HEADERS };

  const allowedOrigins = new Set(
    (Deno.env.get("ALLOWED_ORIGINS") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!allowedOrigins.has(origin)) return null;
  return {
    ...BASE_HEADERS,
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
  };
}

export function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200
): Response {
  const headers = corsHeaders(req);
  if (!headers) {
    return new Response(JSON.stringify({ error: "Origem não permitida" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function preflightResponse(req: Request): Response {
  const headers = corsHeaders(req);
  if (!headers) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers });
}
