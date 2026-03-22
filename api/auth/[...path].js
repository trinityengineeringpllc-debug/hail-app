// Proxy all /api/auth/* requests to Render server
const RENDER_URL = "https://hail-app.onrender.com";

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Reconstruct the full path: /api/auth/login, /api/auth/signup, etc.
  const pathSegments = req.query.path || [];
  const subPath = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments;
  const targetUrl = `${RENDER_URL}/api/auth/${subPath}`;

  try {
    const headers = { "Content-Type": "application/json" };
    if (req.headers.cookie) headers["cookie"] = req.headers.cookie;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD"
        ? JSON.stringify(req.body)
        : undefined,
    });

    // Forward Set-Cookie headers from Render to browser
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.setHeader("set-cookie", setCookie);

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      res.status(upstream.status).send(text);
      return;
    }

    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Auth proxy error:", err.message);
    res.status(502).json({ error: err.message || "Auth proxy failed" });
  }
};
