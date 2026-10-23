import { loadBundle } from "../lib/model.mjs";
import { method, send } from "../lib/http.mjs";
import { DSS_CONFIG } from "../lib/dss.mjs";

export default function handler(req, res) {
  if (!method(req, res, "GET")) return;
  try {
    const { schema } = loadBundle();
    const keys = [
      "title",
      "features",
      "questions",
      "labels",
      "scale",
      "reference",
      "model",
      "test_metrics",
      "development_n",
      "test_n",
      "interpretation",
    ];
    send(res, 200, {
      ...Object.fromEntries(keys.map((key) => [key, schema[key]])),
      dss: DSS_CONFIG,
    });
  } catch {
    send(res, 503, { detail: "The evaluated model is not available yet." });
  }
}
