import { DSS_CONFIG } from "../lib/dss.mjs";
import { method, send } from "../lib/http.mjs";

export default function handler(req, res) {
  if (!method(req, res, "GET")) return;
  send(res, 200, DSS_CONFIG);
}
