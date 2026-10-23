import { assess, loadBundle, validateResponses } from "../lib/model.mjs";
import { method, send } from "../lib/http.mjs";

export default function handler(req, res) {
  if (!method(req, res, "POST")) return;
  let bundle;
  try {
    bundle = loadBundle();
  } catch {
    send(res, 503, { detail: "The evaluated model is not available yet." });
    return;
  }
  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (
      !payload ||
      Array.isArray(payload) ||
      typeof payload !== "object" ||
      Object.keys(payload).length !== 2 ||
      payload.eligible !== true ||
      !Object.hasOwn(payload, "responses")
    ) {
      throw new Error(
        "Confirm eligibility and provide only the questionnaire responses.",
      );
    }
    validateResponses(payload.responses, bundle.forest.features);
  } catch (error) {
    send(res, 422, {
      detail:
        error instanceof Error ? error.message : "Invalid assessment input.",
    });
    return;
  }
  try {
    send(res, 200, assess(bundle.forest, bundle.schema, payload.responses));
  } catch {
    send(res, 500, {
      detail:
        "The assessment is temporarily unavailable. Please try again later.",
    });
  }
}
