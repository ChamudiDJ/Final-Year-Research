import { loadBundle } from "../lib/model.mjs";
import { method, send } from "../lib/http.mjs";

export default function handler(req, res) {
  if (!method(req, res, "GET")) return;
  try {
    loadBundle();
    send(res, 200, { status: "ok" });
  } catch {
    send(res, 503, { detail: "The evaluated model is not available yet." });
  }
}
