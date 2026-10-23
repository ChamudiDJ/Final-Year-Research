import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import health from "../api/health.mjs";
import questionnaire from "../api/questionnaire.mjs";
import predict from "../api/predict.mjs";
import support from "../api/support.mjs";
import { send } from "../lib/http.mjs";

const root = resolve("deployment/frontend/dist");
const routes = {
  "/api/health": health,
  "/api/questionnaire": questionnaire,
  "/api/predict": predict,
  "/api/support": support,
};
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (routes[path]) {
    let body = "";
    for await (const part of req) {
      body += part;
      if (body.length > 8192) {
        send(res, 413, { detail: "Request too large." });
        return;
      }
    }
    req.body = body || undefined;
    routes[path](req, res);
    return;
  }
  try {
    const target = resolve(
      root,
      "." + decodeURIComponent(path === "/" ? "/index.html" : path),
    );
    if (!target.startsWith(root + sep)) {
      send(res, 404, { detail: "Not found." });
      return;
    }
    res.setHeader(
      "Content-Type",
      types[extname(target)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(await readFile(target));
  } catch {
    send(res, 404, { detail: "Not found." });
  }
}).listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
  console.log("Research DSS: http://127.0.0.1:" + (process.env.PORT || 3000)),
);
