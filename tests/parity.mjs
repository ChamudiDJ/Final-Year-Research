import { readFileSync } from "node:fs";
import { loadBundle, predictProbability } from "../lib/model.mjs";

const { forest } = loadBundle();
const cases = JSON.parse(readFileSync(process.argv[2], "utf8"));
let maximumError = 0;
let identicalClasses = true;
for (const item of cases) {
  const actual = predictProbability(forest, item.responses);
  for (let k = 0; k < 3; k++)
    maximumError = Math.max(
      maximumError,
      Math.abs(actual[k] - item.expected[k]),
    );
  identicalClasses &&=
    actual.indexOf(Math.max(...actual)) ===
    item.expected.indexOf(Math.max(...item.expected));
}
const result = {
  records: cases.length,
  maximum_probability_error: maximumError,
  identical_classes: identicalClasses,
  passed: maximumError < 1e-7 && identicalClasses,
};
console.log(JSON.stringify(result));
if (!result.passed) process.exitCode = 1;
