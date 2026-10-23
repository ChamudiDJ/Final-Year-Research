import { performance } from "node:perf_hooks";
import { loadBundle, assess } from "../lib/model.mjs";

const { forest, schema } = loadBundle();
const responses = Object.fromEntries(forest.features.map((f) => [f, 2]));
assess(forest, schema, responses);
const runs = [];
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  assess(forest, schema, responses);
  runs.push(performance.now() - start);
}
const ordered = [...runs].sort((a, b) => a - b);
const quantile = (p) => {
  const position = (ordered.length - 1) * p;
  const lower = Math.floor(position);
  return (
    ordered[lower] +
    (ordered[Math.ceil(position)] - ordered[lower]) * (position - lower)
  );
};
console.log(
  JSON.stringify({
    runs: 30,
    p50_ms: quantile(0.5),
    p95_ms: quantile(0.95),
    mean_ms: runs.reduce((a, b) => a + b, 0) / runs.length,
    scope:
      "Node inference and permutation SHAP; excludes network, browser and hosting cold start",
  }),
);
