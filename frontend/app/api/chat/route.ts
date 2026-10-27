export async function POST(request: Request) {
  const body = await request.json();
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: request.signal,
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return Response.json(
      { error: { code: "BACKEND_UNAVAILABLE", message: "Non è possibile raggiungere il backend." } },
      { status: 502 },
    );
  }
}
