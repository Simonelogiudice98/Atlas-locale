type Context = { params: Promise<{ path?: string[] }> };

async function proxy(request: Request, context: Context) {
  const { path = [] } = await context.params;
  const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const valid = path.length === 0 || (id.test(path[0]) && (path.length === 1 || (path.length === 2 && path[1] === "messages")));
  if (!valid) return Response.json({ error: { message: "Percorso non valido." } }, { status: 400 });
  try {
    const backend = process.env.BACKEND_URL;
    if (!backend) throw new Error("BACKEND_URL missing");
    const url = `${backend.replace(/\/$/, "")}/api/conversations${path.length ? `/${path.join("/")}` : ""}${new URL(request.url).search}`;
    const response = await fetch(url, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: request.method === "POST" ? await request.text() : undefined,
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
    return Response.json({ error: { message: "Non è possibile raggiungere il backend." } }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as DELETE };
