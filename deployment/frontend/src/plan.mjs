export function buildSupportPlan({
  choice,
  action,
  opening,
  steps,
  result,
  includeScores = false,
}) {
  const lines = [
    "My support plan",
    "",
    choice,
    action,
    "",
    "A possible opening for a conversation:",
    opening,
    "Before I share details, could you explain confidentiality, costs and what a first appointment involves?",
    "",
    ...steps.map(({ done, label }) => `${done ? "[x]" : "[ ]"} ${label}`),
    "",
    "Official support directory: https://help-seeking-intention-dss.vercel.app/#support",
    "For a medical emergency call 1990; for urgent police assistance call 119, if safe to call.",
  ];
  if (includeScores) {
    lines.push(
      "",
      "Sensitive assessment summary — past six months",
      `DVQ-R total: ${result.dvq.score === null ? `incomplete; observed subtotal ${result.dvq.observed_subtotal}, ${result.dvq.answered}/20 items answered` : `${result.dvq.score}/80`}`,
    );
    for (const d of result.dvq.domains)
      lines.push(
        `${d.label}: ${d.score === null ? `incomplete; observed subtotal ${d.observed_subtotal}, ${d.answered}/4 items answered` : `${d.score}/16`}`,
      );
    lines.push(
      `Estimated professional help-seeking intention: ${result.label}`,
      `Class probabilities (low / neutral / high): ${result.probabilities.map((p) => (p * 100).toFixed(1) + "%").join(" / ")}`,
      "Scores have no clinical severity cut-offs. This model estimates stated intention, not actual service use, diagnosis or immediate danger.",
    );
  }
  return lines.join("\n");
}
