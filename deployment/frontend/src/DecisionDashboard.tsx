import { useEffect, useRef, useState } from "react";
import type { Result, Schema } from "./types";
import { buildSupportPlan } from "./plan.mjs";

const needs = {
  explore: {
    label: "Understand my options first",
    text: "I would like to understand the support available before deciding whether to make an appointment.",
    action:
      "Read a service’s official information and note one question you would like to ask.",
  },
  conversation: {
    label: "Talk with a counsellor",
    text: "I would like a private conversation about relationship experiences and support options.",
    action:
      "Use your university’s official counselling contact page to ask about an appointment.",
  },
  medical: {
    label: "Discuss medical care",
    text: "I would like to speak privately with a healthcare professional about a relationship experience.",
    action:
      "Ask a hospital about medical care or Mithuru Piyasa / Natpu Nilayam. If you have a current injury or recent unwanted sexual contact, seek prompt medical advice.",
  },
  safety: {
    label: "Explore safety and specialist support",
    text: "I would like to discuss support options and a plan that respects my choices and safety.",
    action:
      "Consider a conversation with a trained service provider. If safe, identify a trusted person and a place where you could get help.",
  },
};

function NextStepPlan({ result }: { result: Result }) {
  const [need, setNeed] = useState<keyof typeof needs | "">("");
  const [checked, setChecked] = useState<string[]>([]);
  const [includeScores, setIncludeScores] = useState(false);
  const selected = need ? needs[need] : null;
  const steps = [
    ["contact", "Find an official contact or a person I trust"],
    ["privacy", "Choose a device, place and contact method that feel safe"],
    [
      "questions",
      "Ask about confidentiality, costs, language and appointment options",
    ],
    [
      "choice",
      "Decide what I want to share and whether I want someone with me",
    ],
  ];
  function download() {
    if (!selected) return;
    const text = buildSupportPlan({
      choice: selected.label,
      action: selected.action,
      opening: selected.text,
      steps: steps.map(([id, label]) => ({
        done: checked.includes(id),
        label,
      })),
      result,
      includeScores,
    });
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "my-support-plan.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section aria-labelledby="plan-heading">
      <h3 id="plan-heading">One next step, on your terms.</h3>
      <p>
        Choose what would help you now. These preferences stay in the page; they
        do not change your prediction or notify a service.
      </p>
      <fieldset className="plan-options">
        <legend>What would you like to do?</legend>
        {Object.entries(needs).map(([id, item]) => (
          <label key={id}>
            <input
              type="radio"
              name="support-need"
              value={id}
              checked={need === id}
              onChange={() => {
                setNeed(id as keyof typeof needs);
                setChecked([]);
              }}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      {selected && (
        <>
          <div className="guidance">
            <h3>Your chosen next step</h3>
            <p>{selected.action}</p>
            <a href="#support">Browse official support services ↓</a>
          </div>
          <h3>A possible way to start</h3>
          <blockquote className="conversation">
            “{selected.text} Before I share details, could you explain
            confidentiality, costs and what a first appointment involves?”
          </blockquote>
          <fieldset className="plan-checklist">
            <legend>Prepare only what feels useful</legend>
            {steps.map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={checked.includes(id)}
                  onChange={(e) =>
                    setChecked((old) =>
                      e.target.checked
                        ? [...old, id]
                        : old.filter((v) => v !== id),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <details className="save-plan">
            <summary>Keep a copy of this plan (optional)</summary>
            <p>
              A downloaded file may be visible to others using your device. Your
              score and prediction are excluded unless you choose to include
              them. Raw questionnaire answers are never included.
            </p>
            <label className="skip">
              <input
                type="checkbox"
                checked={includeScores}
                onChange={(e) => setIncludeScores(e.target.checked)}
              />
              Include my sensitive score and prediction summary
            </label>
            <button type="button" className="secondary" onClick={download}>
              Download my support plan
            </button>
          </details>
        </>
      )}
    </section>
  );
}

function DvqProfile({
  result,
  schema,
  answers,
}: {
  result: Result;
  schema: Schema;
  answers: Record<string, number | null>;
}) {
  return (
    <section aria-labelledby="dvq-heading">
      <div className="section-heading">
        <h3 id="dvq-heading">Your DVQ-R experience profile</h3>
        <span className="badge">Past six months</span>
      </div>
      <p>
        These scores describe the frequency of experiences you reported. They
        are separate from your estimated willingness to seek professional help.
      </p>
      <div className="score-summary">
        <div>
          <span>
            {result.dvq.score === null
              ? "Total score incomplete"
              : "DVQ-R total"}
          </span>
          <strong>
            {result.dvq.score === null ? "—" : result.dvq.score}
            <small> / 80</small>
          </strong>
        </div>
        <div>
          <span>Responses provided</span>
          <strong>
            {result.dvq.answered}
            <small> / 20</small>
          </strong>
        </div>
        <div>
          <span>Items reported above Never</span>
          <strong>
            {result.dvq.reported_items.length}
            <small> / {result.dvq.answered}</small>
          </strong>
        </div>
      </div>
      {result.dvq.missing > 0 && (
        <div className="incomplete-note" role="note">
          <strong>
            {result.dvq.missing}{" "}
            {result.dvq.missing === 1 ? "item was" : "items were"} skipped.
          </strong>{" "}
          Observed subtotal: {result.dvq.observed_subtotal} across{" "}
          {result.dvq.answered} answered items. The complete total could be{" "}
          {result.dvq.possible_range[0]}–{result.dvq.possible_range[1]}{" "}
          depending on the skipped responses. This is an arithmetic range, not
          an estimated score or confidence interval. Skipped answers are not
          treated as Never.
        </div>
      )}
      <div className="domain-profiles">
        {result.dvq.domains.map((d) => (
          <article className="domain-profile" key={d.id}>
            <div className="domain-title">
              <h4>{d.label}</h4>
              <strong>
                {d.score === null ? "Incomplete" : `${d.score} / 16`}
              </strong>
            </div>
            <p>{d.description}</p>
            {d.score !== null ? (
              <meter
                aria-label={`${d.label} score out of 16`}
                value={d.score}
                min={0}
                max={16}
              />
            ) : (
              <p className="incomplete-note">
                Observed subtotal {d.observed_subtotal}; {d.answered}/4
                answered. Possible complete sum {d.possible_range[0]}–
                {d.possible_range[1]}.
              </p>
            )}
            <details>
              <summary>
                View the four responses · {d.answered}/4 answered
              </summary>
              {d.items.map((f) => (
                <div className="score-item" key={f}>
                  <span>
                    {f} · {schema.questions[f]}
                  </span>
                  <strong>
                    {answers[f] === null
                      ? "Skipped"
                      : `${answers[f]} · ${schema.scale[String(answers[f])]}`}
                  </strong>
                </div>
              ))}
            </details>
          </article>
        ))}
      </div>
      <details>
        <summary>How the scores are calculated</summary>
        <p>{schema.dss.scoring_policy}</p>
        <p>
          Missing responses use training medians only inside the predictive
          model. They are never filled in for these descriptive scores. Higher
          sums mean more frequent reported experiences; they do not measure
          immediate danger or determine the support you deserve.
        </p>
        <a
          href={schema.dss.scoring_source.url}
          target="_blank"
          rel="noreferrer"
        >
          DVQ-R validation and item mapping ↗
        </a>
      </details>
      <p className="interpretation-note">
        A score of zero does not establish that a relationship is safe. No
        clinical severity or risk category is assigned by this app.
      </p>
    </section>
  );
}

export function DecisionDashboard({
  result,
  schema,
  answers,
  onReset,
  onReview,
}: {
  result: Result;
  schema: Schema;
  answers: Record<string, number | null>;
  onReset: () => void;
  onReview: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const panel = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, []);
  return (
    <div className="decision-dashboard">
      <div className="eyebrow">YOUR DECISION SUPPORT DASHBOARD</div>
      <h2 ref={title} tabIndex={-1}>
        Your experiences. Your options.
      </h2>
      <p className="muted">
        Understand your responses, explore the model’s estimate and choose
        support that suits you.
      </p>
      <div className="dashboard-nav" role="group" aria-label="Result sections">
        {[
          ["overview", "Your overview"],
          ["explanation", "Model explanation"],
          ["plan", "Your next step"],
        ].map(([id, label]) => (
          <button
            type="button"
            className="secondary"
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              requestAnimationFrame(() => panel.current?.focus());
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div ref={panel} tabIndex={-1} className="dashboard-panel">
        {tab === "overview" && (
          <>
            <DvqProfile result={result} schema={schema} answers={answers} />
            <hr />
            <section aria-labelledby="intention-heading">
              <span className="eyebrow">MACHINE LEARNING ESTIMATE</span>
              <h3 id="intention-heading">
                Professional help-seeking intention
              </h3>
              <strong className="intention-label">{result.label}</strong>
              <p>
                This estimates stated willingness to contact a counsellor,
                psychologist or psychiatrist. It does not measure actual
                help-seeking, the seriousness of violence, or your current
                safety.
              </p>
              <div className="probabilities">
                {schema.labels.map((label, i) => (
                  <div className="probability" key={label}>
                    <div>
                      <span>{label}</span>
                      <strong>
                        {(result.probabilities[i] * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div className="track">
                      <div
                        style={{ width: `${result.probabilities[i] * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="small">
                Model probabilities have uncertainty and are not a guarantee
                about any individual.{" "}
                {result.dvq.missing > 0 &&
                  `${result.dvq.missing} skipped response(s) used training medians for this estimate; completing more items may change it.`}
              </p>
              <div className="guidance">
                <h3>A possible starting point</h3>
                <p>{result.guidance}</p>
              </div>
              <p className="interpretation-note">
                Low intention does not mean low need for support. Your access to
                services never depends on a prediction.
              </p>
            </section>
            <hr />
            <section aria-labelledby="options-heading">
              <h3 id="options-heading">
                Support options linked to your responses
              </h3>
              {result.decision_support.rules.map((r) => (
                <article className="decision-rule" key={r.id}>
                  <h4>{r.title}</h4>
                  <p>{r.action}</p>
                  <details>
                    <summary>Why this option is shown</summary>
                    <p>{r.reason}</p>
                    {r.items.length > 0 && (
                      <ul>
                        {r.items.map((f) => (
                          <li key={f}>
                            {f} · {schema.questions[f]} ·{" "}
                            {schema.scale[String(answers[f])]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </article>
              ))}
              <p className="small">{result.decision_support.basis}</p>
              <div className="action-links">
                <button
                  className="primary"
                  onClick={() => {
                    setTab("plan");
                    requestAnimationFrame(() => panel.current?.focus());
                  }}
                >
                  Choose my next step →
                </button>
                <a href="#support">Browse support services ↓</a>
              </div>
            </section>
          </>
        )}
        {tab === "explanation" && (
          <section aria-labelledby="explanation-heading">
            <h3 id="explanation-heading">What influenced “{result.label}”</h3>
            <p>
              Positive contributions raise this category’s probability relative
              to the reference; negative contributions lower it. These are model
              associations, not causes or a ranking of harmful experiences.
            </p>
            <div className="contributions">
              {result.contributions.slice(0, 8).map((c) => (
                <div className="contribution" key={c.feature}>
                  <span>
                    {c.feature} ·{" "}
                    {answers[c.feature] === null
                      ? "Skipped (model used median)"
                      : schema.scale[String(answers[c.feature])]}
                    <small>{schema.questions[c.feature]}</small>
                  </span>
                  <strong className={c.value >= 0 ? "positive" : "negative"}>
                    {c.value >= 0 ? "+" : ""}
                    {(c.value * 100).toFixed(2)} pp
                  </strong>
                </div>
              ))}
            </div>
            <details>
              <summary>Explanation reference and all contributions</summary>
              <p>
                {result.reference}. Reference probability:{" "}
                {(result.reference_probability * 100).toFixed(2)}%. All
                contributions plus the reference equal the selected probability;
                displayed values are rounded. The explanation uses sampled
                permutation SHAP, so individual contributions are approximate.
              </p>
              {result.contributions.map((c) => (
                <p key={c.feature}>
                  {c.feature}: {(c.value * 100).toFixed(3)} percentage points
                </p>
              ))}
            </details>
            <a href="#research">Read model evidence and limitations ↓</a>
          </section>
        )}
        <div hidden={tab !== "plan"}>
          <NextStepPlan result={result} />
        </div>
      </div>
      <div className="actions dashboard-actions">
        <button className="secondary" onClick={onReview}>
          Review my responses
        </button>
        <button className="secondary" onClick={onReset}>
          Clear answers and start again
        </button>
      </div>
    </div>
  );
}
