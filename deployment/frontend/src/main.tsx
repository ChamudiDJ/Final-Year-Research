import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import type { Schema, Result } from "./types";
import { DecisionDashboard } from "./DecisionDashboard";
import { SupportDirectory, UrgentHelp } from "./SupportDirectory";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "The assessment is unavailable. Please check your connection and try again.",
    );
  }
  return response.json();
}

function App() {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [error, setError] = useState("");
  const [eligible, setEligible] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    api<Schema>("/api/questionnaire")
      .then(setSchema)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step, result]);
  const completed = Object.keys(answers).length;
  const visible = schema?.features.slice(step * 5, step * 5 + 5) ?? [];
  const pageComplete = visible.every((f) => answers[f] !== undefined);
  function reset() {
    setAnswers({});
    setResult(null);
    setEligible(false);
    setStep(0);
    setError("");
    setSessionKey((key) => key + 1);
  }
  async function submit() {
    if (!schema || completed !== 20 || !eligible) {
      setError("Confirm eligibility and answer every question.");
      return;
    }
    if (Object.values(answers).every((value) => value === null)) {
      setError(
        "At least one experience response is needed for an estimate. You can still browse support without answering.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<Result>("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eligible, responses: answers }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="top">
        <a className="brand" href="/" aria-label="Research DSS home">
          <span className="brand-icon">↗</span>
          <span>
            Pathways<span className="brand-sub">RESEARCH DECISION SUPPORT</span>
          </span>
        </a>
        <a className="support-nav" href="#support">
          Find support
        </a>
        <a
          className="exit"
          href="https://www.google.com"
          referrerPolicy="no-referrer"
          onClick={reset}
        >
          Leave this page <span aria-hidden>↗</span>
        </a>
      </header>
      <main>
        <section className="intro">
          <div className="eyebrow">
            <span className="dot" /> SRI LANKAN UNIVERSITY STUDENTS
          </div>
          <h1>
            A little clarity.
            <br />
            <em>A step toward support.</em>
          </h1>
          <p>
            Understand your relationship experiences, explore your estimated
            help-seeking intention, and find a next step that suits you.
          </p>
          <div className="intro-tags">
            <span>20 questions</span>
            <span>No account needed</span>
            <span>Responses are not saved</span>
          </div>
        </section>
        <div className="layout">
          <aside>
            <div className="side-label">YOUR ASSESSMENT</div>
            <ol className="steps">
              {[
                "Relationship experiences",
                "Your experience profile",
                "Your support options",
              ].map((text, i) => (
                <li
                  key={text}
                  className={(result ? i > 0 : i === 0) ? "active" : ""}
                >
                  <span>{i + 1}</span>
                  {text}
                </li>
              ))}
            </ol>
            <div className="support-note">
              <span className="note-icon" aria-hidden>
                ✳
              </span>
              <h3>Your choice, at every step.</h3>
              <p>
                You can stop whenever you want. Professional support is an
                option whatever your result.
              </p>
              <p>
                If you feel unsafe now, contact local emergency services or
                someone you trust.
              </p>
            </div>
            <p className="privacy-note">
              Leaving this page does not clear your browser history. This app
              does not save your answers.
            </p>
          </aside>
          <section id="assessment" className="card" aria-busy={busy}>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {!schema ? (
              <div className="loading">
                <h2>
                  {error
                    ? "Assessment unavailable"
                    : "Preparing your assessment…"}
                </h2>
                <p>
                  {error
                    ? "Please try again later. Support remains available independently of this tool."
                    : "Loading the evaluated model and questionnaire."}
                </p>
                {error && (
                  <button onClick={() => location.reload()}>Try again</button>
                )}
              </div>
            ) : result ? (
              <DecisionDashboard
                result={result}
                schema={schema}
                answers={answers}
                onReset={reset}
                onReview={() => {
                  setResult(null);
                  setStep(0);
                  setError("");
                }}
              />
            ) : (
              <>
                <UrgentHelp />
                <div className="card-top">
                  <span className="eyebrow">RELATIONSHIP EXPERIENCES</span>
                  <span className="page-count">{step + 1} / 4</span>
                </div>
                <h2 ref={heading} tabIndex={-1}>
                  Space to reflect.
                </h2>
                <p className="muted">
                  Choose how often each experience occurred during the past six
                  months. No answer is preselected. You may choose not to answer
                  an item. Skips stay unscored in your DVQ-R profile; the
                  intention model uses median training values.
                </p>
                <div className="progress-label">
                  <span>
                    {completed} of 20 completed ·{" "}
                    {Object.values(answers).filter((v) => v === null).length}{" "}
                    skipped
                  </span>
                  <span>{Math.round((completed / 20) * 100)}%</span>
                </div>
                <progress value={completed} max={20} />
                {step === 0 && (
                  <label className="eligibility">
                    <input
                      type="checkbox"
                      checked={eligible}
                      onChange={(e) => setEligible(e.target.checked)}
                    />
                    <span>
                      I am 18 or over, a Sri Lankan university student in a
                      current dating relationship, and choose to continue.
                    </span>
                  </label>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!pageComplete || !eligible || busy) return;
                    if (step < 3) {
                      setStep(step + 1);
                      setError("");
                    } else void submit();
                  }}
                >
                  {visible.map((f, index) => (
                    <fieldset className="question" key={f}>
                      <legend>
                        <span className="question-number">
                          {step * 5 + index + 1 < 10 ? "0" : ""}
                          {step * 5 + index + 1}
                        </span>
                        {schema.questions[f]}
                      </legend>
                      <div className="choices">
                        {Object.entries(schema.scale).map(([value, label]) => (
                          <label
                            className={
                              answers[f] === Number(value)
                                ? "choice selected"
                                : "choice"
                            }
                            key={value}
                          >
                            <input
                              type="radio"
                              name={f}
                              value={value}
                              checked={answers[f] === Number(value)}
                              onChange={() =>
                                setAnswers((a) => ({
                                  ...a,
                                  [f]: Number(value),
                                }))
                              }
                            />
                            <span className="choice-value">{value}</span>
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                      <label className="skip">
                        <input
                          type="radio"
                          name={f}
                          checked={answers[f] === null}
                          onChange={() =>
                            setAnswers((a) => ({ ...a, [f]: null }))
                          }
                        />{" "}
                        Prefer not to answer
                      </label>
                    </fieldset>
                  ))}
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={step === 0 || busy}
                      onClick={() => {
                        setStep((s) => s - 1);
                        setError("");
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      className="primary"
                      type="submit"
                      disabled={!pageComplete || !eligible || busy}
                    >
                      {busy
                        ? "Estimating and explaining…"
                        : step < 3
                          ? "Continue →"
                          : "See my dashboard →"}
                    </button>
                  </div>
                </form>
                <p className="small footer-hint">
                  Your answers stay in this page’s memory until submitted
                  securely for estimation. Refreshing or clearing removes them
                  from the page.
                </p>
              </>
            )}
          </section>
        </div>
        {schema && <SupportDirectory key={sessionKey} schema={schema} />}
        {schema && (
          <details id="research" className="research">
            <summary>About the research and model</summary>
            <p>{schema.title}</p>
            <p>{schema.interpretation}</p>
            <p>
              H3 classes: low (1–3), neutral (4), high (5–7). Predictors:
              D01–D20 only. Model: {schema.model}. Development sample:{" "}
              {schema.development_n}; independent test sample: {schema.test_n}.
            </p>
            <div className="metric-grid">
              {Object.entries(schema.test_metrics).map(([name, value]) => (
                <div key={name}>
                  <span>{name.replaceAll("_", " ")}</span>
                  <strong>{value.toFixed(3)}</strong>
                </div>
              ))}
            </div>
            <p>
              Random Forest was selected using development cross-validation
              macro F1 (0.837), before the independent test. XGBoost had a
              higher test F1 (0.854); the held-out results were not used to
              change the selected model. Repeated response patterns were kept in
              the same split and folds.
            </p>
            <p>DVQ-R scoring: {schema.dss.scoring_policy}</p>
            <p>
              <a
                href={schema.dss.scoring_source.url}
                target="_blank"
                rel="noreferrer"
              >
                DVQ-R validation paper ↗
              </a>{" "}
              ·{" "}
              <a
                href={schema.dss.support_source.url}
                target="_blank"
                rel="noreferrer"
              >
                WHO support guidance ↗
              </a>
            </p>
            <p>
              Decision-support version: {schema.dss.version}. Descriptive
              scoring, the predictive model and transparent support rules are
              separate components. The planner preferences and university
              selection are not model predictors.
            </p>
            <p>
              Results describe the study sample and do not establish performance
              for every university or student. This tool does not estimate
              actual service use or diagnose abuse. Support guidance requires
              domain-expert evaluation.
            </p>
          </details>
        )}
      </main>
      <footer className="site-footer">
        <span>PATHWAYS · RESEARCH DSS</span>
        <span>Private reflection. Informed choices.</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
