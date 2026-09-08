// ELEVENLABS_API_KEY is supplied by Netlify's Production Functions environment.
export default async (req: Request) => {
  const headers = { "Cache-Control": "no-store" };
  const fail = (status: number, error: string) => Response.json({ error }, { status, headers });
  if (req.method !== "POST") return fail(405, "Método não permitido.");
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return fail(403, "Origem não permitida.");
  if (!req.headers.get("content-type")?.startsWith("application/json")) return fail(415, "Envie JSON.");
  if (Number(req.headers.get("content-length")) > 20000) return fail(413, "Texto muito longo.");
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 20000) return fail(413, "Texto muito longo.");
    input = JSON.parse(raw);
  } catch { return fail(400, "Pedido inválido."); }
  if (typeof input?.text !== "string" || !input.text.trim() || input.text.length > 3000) {
    return fail(400, "Envie entre 1 e 3000 caracteres.");
  }
  const key = Netlify.env.get("ELEVENLABS_API_KEY");
  if (!key) return fail(503, "A voz ainda não está configurada.");
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/3UAsdDB4HXr9UpqBVXOh?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({ text: input.text.trim(), model_id: "eleven_multilingual_v2" }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(45000)])
    });
    if (!response.ok) {
      await response.body?.cancel();
      return fail(response.status === 429 ? 429 : 502, "A voz está indisponível neste momento. Tente novamente.");
    }
    return new Response(response.body, { headers: { ...headers, "Content-Type": "audio/mpeg" } });
  } catch { return fail(502, "Não foi possível carregar a voz. Tente novamente."); }
};

export const config = {
  path: "/api/bibliotecario-voice",
  rateLimit: { windowLimit: 15, windowSize: 60, aggregateBy: "ip", action: "rate_limit" }
};
