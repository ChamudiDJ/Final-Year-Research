import test from "node:test";
import assert from "node:assert/strict";
import {
  DVQ_DOMAINS,
  scoreDvq,
  decisionSupport,
  DSS_CONFIG,
} from "../lib/dss.mjs";
import { assess, loadBundle } from "../lib/model.mjs";
import questionnaire from "../api/questionnaire.mjs";
import support from "../api/support.mjs";
import { buildSupportPlan } from "../deployment/frontend/src/plan.mjs";

const features = Array.from(
  { length: 20 },
  (_, i) => `D${String(i + 1).padStart(2, "0")}`,
);
const answers = (value = 0) =>
  Object.fromEntries(features.map((f) => [f, value]));

test("DVQ-R mapping covers exactly 20 unique items and the five retained domains", () => {
  assert.deepEqual(DVQ_DOMAINS.flatMap((d) => d.items).sort(), features);
  assert.deepEqual(
    Object.fromEntries(DVQ_DOMAINS.map((d) => [d.id, d.items])),
    {
      coercion: ["D01", "D05", "D13", "D17"],
      sexual: ["D02", "D06", "D14", "D18"],
      physical: ["D03", "D07", "D10", "D11"],
      detachment: ["D04", "D08", "D15", "D16"],
      humiliation: ["D09", "D12", "D19", "D20"],
    },
  );
});

test("complete scores sum raw frequencies without reversing or severity thresholds", () => {
  for (let level = 0; level <= 4; level++) {
    const result = scoreDvq(answers(level));
    assert.equal(result.score, level * 20);
    assert.equal(result.maximum, 80);
    assert.equal(result.missing, 0);
    assert.equal(result.answered, 20);
    assert.equal(
      result.domains.reduce((sum, d) => sum + d.score, 0),
      result.score,
    );
    assert.ok(
      result.domains.every((d) => d.score === level * 4 && d.maximum === 16),
    );
    assert.deepEqual(result.possible_range, [level * 20, level * 20]);
    assert.equal(result.reported_items.length, level ? 20 : 0);
  }
  for (const feature of features) {
    const result = scoreDvq({ ...answers(), [feature]: 3 });
    assert.equal(result.score, 3);
    assert.equal(result.domains.filter((d) => d.score === 3).length, 1);
  }
});

test("skipped items never become zero or training medians in descriptive scores", () => {
  const result = scoreDvq({ ...answers(2), D01: null, D05: null });
  assert.equal(result.score, null);
  assert.equal(result.observed_subtotal, 36);
  assert.deepEqual(result.possible_range, [36, 44]);
  const coercion = result.domains.find((d) => d.id === "coercion");
  assert.equal(coercion.score, null);
  assert.equal(coercion.observed_subtotal, 4);
  assert.deepEqual(coercion.possible_range, [4, 12]);
  assert.equal(result.domains.find((d) => d.id === "physical").score, 8);
  const empty = scoreDvq(answers(null));
  assert.equal(empty.score, null);
  assert.equal(empty.answered, 0);
  assert.deepEqual(empty.possible_range, [0, 80]);
});

test("decision rules use observed evidence and support stays available at every score", () => {
  const baseline = decisionSupport(scoreDvq(answers()));
  assert.deepEqual(
    baseline.rules.map((r) => r.id),
    ["support-for-everyone"],
  );
  for (const level of [1, 4]) {
    const result = decisionSupport(
      scoreDvq({ ...answers(), D03: level, D13: level }),
    );
    assert.deepEqual(result.rules[0].items, ["D03"]);
    assert.deepEqual(result.rules[1].items, ["D13"]);
    assert.ok(result.rules.some((r) => r.id === "support-for-everyone"));
  }
  const skipped = decisionSupport(
    scoreDvq({ ...answers(), D03: null, D02: null }),
  );
  assert.equal(skipped.rules.length, 1);
  const knownIds = new Set(["campus", ...DSS_CONFIG.services.map((s) => s.id)]);
  assert.ok(
    decisionSupport(scoreDvq(answers(4))).rules.every((r) =>
      r.service_ids.every((id) => knownIds.has(id)),
    ),
  );
});

test("DSS additions preserve evaluated predictions and explanation completeness", () => {
  const { forest, schema } = loadBundle();
  const result = assess(forest, schema, { ...answers(), D01: null });
  assert.equal(result.dvq.score, null);
  assert.equal(result.dvq.answered, 19);
  assert.equal(result.decision_support.version, "dvq-dss-v1");
  assert.ok(
    Math.abs(
      result.reference_probability +
        result.contributions.reduce((s, c) => s + c.value, 0) -
        result.probabilities[result.category],
    ) < 1e-8,
  );
});

test("public questionnaire supplies the versioned service and scoring sources", () => {
  const response = {
    setHeader() {},
    end(body) {
      this.body = JSON.parse(body);
    },
  };
  questionnaire({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.dss.version, "dvq-dss-v1");
  assert.equal(response.body.dss.domains.length, 5);
  assert.equal(
    response.body.dss.services.find((s) => s.id === "ambulance").phone,
    "1990",
  );
  assert.equal(
    response.body.dss.services.find((s) => s.id === "police-emergency").phone,
    "119",
  );
  assert.ok(
    response.body.dss.services.every(
      (s) => new URL(s.source).protocol === "https:",
    ),
  );
  assert.ok(
    response.body.dss.campuses.every(
      (c) => new URL(c.url).protocol === "https:",
    ),
  );
});

test("downloaded plans exclude sensitive results by default and raw answers always", () => {
  const { forest, schema } = loadBundle();
  const result = assess(forest, schema, { ...answers(1), D01: null });
  const input = {
    choice: "Understand my options",
    action: "Read official information",
    opening: "I would like support",
    steps: [{ done: true, label: "Ask about confidentiality" }],
    result,
  };
  const ordinary = buildSupportPlan(input);
  assert.ok(ordinary.includes("[x] Ask about confidentiality"));
  assert.ok(!ordinary.includes("DVQ-R"));
  assert.ok(!ordinary.includes(result.label));
  const sensitive = buildSupportPlan({ ...input, includeScores: true });
  assert.ok(sensitive.includes("incomplete; observed subtotal 19, 19/20"));
  assert.ok(sensitive.includes(result.label));
  assert.ok(!sensitive.includes("D01"));
  assert.ok(!sensitive.includes(schema.questions.D01));
});

test("standalone support endpoint does not require model files or assessment responses", () => {
  const response = {
    setHeader() {},
    end(body) {
      this.body = JSON.parse(body);
    },
  };
  support({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.version, "dvq-dss-v1");
  assert.equal(response.body.services.length, 5);
  const wrongMethod = {
    setHeader() {},
    end(body) {
      this.body = JSON.parse(body);
    },
  };
  support({ method: "POST" }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
});
