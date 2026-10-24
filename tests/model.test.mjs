import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadBundle,
  validateResponses,
  predictProbability,
  explainProbability,
  assess,
} from "../lib/model.mjs";
import predict from "../api/predict.mjs";
import health from "../api/health.mjs";
import questionnaire from "../api/questionnaire.mjs";

const features = Array.from(
  { length: 20 },
  (_, i) => `D${String(i + 1).padStart(2, "0")}`,
);

test("invalid responses are rejected", () => {
  for (const value of [-1, 5, 1.5, undefined, NaN, Infinity, true, "2"]) {
    assert.throws(() =>
      validateResponses(
        Object.fromEntries(features.map((f) => [f, value])),
        features,
      ),
    );
  }
  assert.throws(() => validateResponses({}, features));
  assert.throws(() =>
    validateResponses(
      Object.fromEntries(features.map((f) => [f, null])),
      features,
    ),
  );
  assert.throws(() =>
    validateResponses(
      { ...Object.fromEntries(features.map((f) => [f, 0])), H3: 7 },
      features,
    ),
  );
});

test("exported model matches sklearn on synthetic parity cases", () => {
  const { forest } = loadBundle();
  const cases = JSON.parse(
    readFileSync("deployment/models/parity_cases.json", "utf8"),
  );
  assert.ok(cases.length >= 200);
  for (const item of cases) {
    const actual = predictProbability(forest, item.responses);
    item.expected.forEach((p, k) => assert.ok(Math.abs(p - actual[k]) < 1e-7));
  }
});

test("boundary and missing responses produce valid explainable estimates", () => {
  const { forest, schema } = loadBundle();
  for (const level of [0, 1, 2, 3, 4]) {
    const responses = Object.fromEntries(features.map((f) => [f, level]));
    if (level === 2) responses.D01 = null;
    const result = assess(forest, schema, responses);
    assert.equal(result.probabilities.length, 3);
    assert.ok(result.probabilities.every((p) => p >= 0 && p <= 1));
    assert.ok(
      Math.abs(result.probabilities.reduce((s, p) => s + p, 0) - 1) < 1e-8,
    );
    assert.equal(result.contributions.length, 20);
    assert.ok(result.guidance);
    const sum =
      result.reference_probability +
      result.contributions.reduce((s, c) => s + c.value, 0);
    assert.ok(Math.abs(sum - result.probabilities[result.category]) < 1e-8);
    assert.deepEqual(result, assess(forest, schema, responses));
  }
});

function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(value) {
      this.body = JSON.parse(value);
    },
  };
}

test("API serves schema and health with evaluated model only", () => {
  for (const handler of [health, questionnaire]) {
    const res = response();
    handler({ method: "GET" }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["Cache-Control"], "no-store");
  }
  const res = response();
  questionnaire({ method: "GET" }, res);
  assert.deepEqual(res.body.features, features);
});

test("API validates eligibility, methods, missing answers and extra fields", () => {
  const answers = Object.fromEntries(features.map((f) => [f, 0]));
  const invalid = [
    { eligible: false, responses: answers },
    { eligible: "true", responses: answers },
    { eligible: true, responses: {} },
    { eligible: true, responses: answers, name: "unnecessary" },
    { eligible: true, responses: { ...answers, H3: 7 } },
  ];
  for (const body of invalid) {
    const res = response();
    predict({ method: "POST", body }, res);
    assert.equal(res.statusCode, 422);
  }
  const wrongMethod = response();
  predict({ method: "GET" }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
  const valid = response();
  predict(
    { method: "POST", body: { eligible: true, responses: answers } },
    valid,
  );
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.headers["Cache-Control"], "no-store");
});

test("malformed JSON errors do not echo submitted content", () => {
  const res = response();
  predict({ method: "POST", body: "SYNTHETIC-PRIVATE-MARKER" }, res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.detail, "Provide valid JSON questionnaire responses.");
  assert.ok(!JSON.stringify(res.body).includes("SYNTHETIC"));
});
