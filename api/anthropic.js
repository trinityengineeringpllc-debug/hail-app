// Proxy to Render server which handles JWT auth + Anthropic API call
async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const upstream = await fetch("https://hail-app-bj5x.onrender.com/api/anthropic", {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      res.status(502).json({ error: { message: `Unexpected response: ${text.slice(0, 200)}` } });
      return;
    }

    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message || "Proxy error" } });
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 300 };
