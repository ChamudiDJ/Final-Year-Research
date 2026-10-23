export function send(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

export function method(req, res, expected) {
  if (req.method !== expected) {
    res.setHeader("Allow", expected);
    send(res, 405, { detail: "Method not allowed." });
    return false;
  }
  return true;
}
