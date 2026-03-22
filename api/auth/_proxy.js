// Shared proxy helper — forwards request to Render server
const RENDER = "https://hail-app.onrender.com";

module.exports = async function proxy(req, res, path) {
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  try {
    const headers = { "Content-Type": "application/json" };
    if (req.headers.cookie) headers["cookie"] = req.headers.cookie;

    const upstream = await fetch(`${RENDER}/api/auth/${path}`, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD"
        ? JSON.stringify(req.body)
        : undefined,
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.setHeader("set-cookie", setCookie);

    const text = await upstream.text();
    try { res.status(upstream.status).json(JSON.parse(text)); }
    catch { res.status(upstream.status).send(text); }
  } catch (err) {
    console.error("proxy error:", err.message);
    res.status(502).json({ error: err.message });
  }
};
