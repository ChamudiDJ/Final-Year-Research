import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let cached;

export function loadBundle() {
  if (!cached) {
    const folder =
      process.env.MODEL_DIR || resolve(process.cwd(), "deployment/models");
    const forest = JSON.parse(
      readFileSync(resolve(folder, "h3_forest.json"), "utf8"),
    );
    const schema = JSON.parse(
      readFileSync(resolve(folder, "schema.json"), "utf8"),
    );
    if (
      forest.format !== "sklearn-random-forest-v1" ||
      forest.features.length !== 20 ||
      JSON.stringify(forest.features) !== JSON.stringify(schema.features) ||
      JSON.stringify(forest.classes) !== "[0,1,2]" ||
      !forest.trees.length ||
      forest.imputer.length !== 20 ||
      forest.imputer.some((v) => !Number.isFinite(v))
    ) {
      throw new Error("Invalid evaluated model bundle.");
    }
    cached = { forest, schema };
  }
  return cached;
}

export function validateResponses(responses, features) {
  if (
    !responses ||
    typeof responses !== "object" ||
    Array.isArray(responses) ||
    Object.keys(responses).length !== features.length ||
    !features.every((f) => Object.hasOwn(responses, f))
  ) {
    throw new Error("Answer all 20 questions; use only D01-D20.");
  }
  const row = features.map((f) => responses[f]);
  if (row.every((v) => v === null))
    throw new Error(
      "At least one experience response is needed for an estimate.",
    );
  if (
    row.some(
      (v) =>
        v !== null &&
        (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 4),
    )
  ) {
    throw new Error(
      "Each response must be a whole number from 0 to 4, or an explicit nonresponse.",
    );
  }
  return row;
}

export function predictProbability(forest, row) {
  // sklearn's tree predictor converts validated inputs to float32 before traversal.
  const input = row.map((v, i) =>
    Math.fround(v === null ? forest.imputer[i] : v),
  );
  const result = [0, 0, 0];
  for (const tree of forest.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      node =
        input[tree.feature[node]] <= tree.threshold[node]
          ? tree.left[node]
          : tree.right[node];
    }
    const values = tree.value[node];
    const total = values[0] + values[1] + values[2];
    for (let k = 0; k < 3; k++) result[k] += values[k] / total;
  }
  return result.map((v) => v / forest.trees.length);
}

function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function explainProbability(forest, row, permutations = 5) {
  const n = forest.features.length;
  const random = randomGenerator(42);
  const contributions = Array.from({ length: n }, () => [0, 0, 0]);
  const base = [0, 0, 0];
  for (let level = 0; level <= 4; level++) {
    const reference = predictProbability(forest, Array(n).fill(level));
    for (let k = 0; k < 3; k++) base[k] += reference[k] / 5;
  }
  // Average marginal contributions over sampled orders and their reverse orders.
  // Each path starts at a synthetic reference and ends at the submitted response.
  for (let repeat = 0; repeat < permutations; repeat++) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const direction of [order, [...order].reverse()]) {
      for (let level = 0; level <= 4; level++) {
        const state = Array(n).fill(level);
        let previous = predictProbability(forest, state);
        for (const feature of direction) {
          state[feature] = row[feature];
          const next = predictProbability(forest, state);
          for (let k = 0; k < 3; k++) {
            contributions[feature][k] +=
              (next[k] - previous[k]) / (permutations * 2 * 5);
          }
          previous = next;
        }
      }
    }
  }
  const probabilities = predictProbability(forest, row);
  for (let k = 0; k < 3; k++) {
    const reconstructed =
      base[k] + contributions.reduce((sum, values) => sum + values[k], 0);
    if (Math.abs(reconstructed - probabilities[k]) > 1e-8)
      throw new Error("Explanation consistency check failed.");
  }
  return { base, contributions };
}

export function guidance(category) {
  return [
    "If professional support feels difficult to approach, you can first ask your university counselling service about confidentiality, cost, and appointment options. You decide whether and when to contact them.",
    "If you are unsure about professional support, you can ask your university counselling service what a first appointment involves before deciding.",
    "If you would like professional support, you can contact your university counselling service or a qualified mental-health professional to discuss appointment options.",
  ][category];
}

export function assess(forest, schema, responses) {
  const row = validateResponses(responses, forest.features);
  const probabilities = predictProbability(forest, row);
  const category = probabilities.indexOf(Math.max(...probabilities));
  const explanation = explainProbability(forest, row);
  return {
    category,
    label: schema.labels[category],
    probabilities,
    guidance: guidance(category),
    reference_probability: explanation.base[category],
    reference: schema.reference,
    explanation_method:
      "Permutation SHAP with five antithetic permutation pairs",
    contributions: forest.features
      .map((feature, i) => ({
        feature,
        value: explanation.contributions[i][category],
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  };
}
