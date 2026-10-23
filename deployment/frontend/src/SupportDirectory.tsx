import { useState } from "react";
import type { Schema, Service } from "./types";

export function UrgentHelp() {
  return (
    <div className="urgent-help" role="note">
      <strong>Need urgent help now?</strong>
      <span>You can get help without completing this assessment.</span>
      <div>
        <a href="tel:1990">Medical emergency · 1990</a>
        <a href="tel:119">Police emergency · 119</a>
      </div>
      <small>
        If it is safe to call. Calls can appear in your phone history.
      </small>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="service-card">
      <span className="service-audience">{service.audience}</span>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <p className="small">{service.access}</p>
      <div className="service-actions">
        {service.phone && (
          <a className="contact-link" href={`tel:${service.phone}`}>
            Call {service.phone}
          </a>
        )}
        <a href={service.source} target="_blank" rel="noreferrer">
          Official service information ↗
        </a>
      </div>
      <small>Source: {service.sourceLabel}</small>
    </article>
  );
}

export function SupportDirectory({ schema }: { schema: Schema }) {
  const [filter, setFilter] = useState("all");
  const [campus, setCampus] = useState("");
  const campusService = schema.dss.campuses.find((c) => c.id === campus);
  const filters = [
    ["all", "All support"],
    ["counselling", "University counselling"],
    ["medical", "Medical care"],
    ["women", "Women’s support"],
    ["reporting", "Police assistance"],
  ];
  return (
    <section
      id="support"
      className="support-section"
      aria-labelledby="support-heading"
      tabIndex={-1}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR CHOICE OF SUPPORT</span>
          <h2 id="support-heading">You do not have to do this alone.</h2>
        </div>
        <a href="#assessment">Back to your assessment ↑</a>
      </div>
      <p>
        Choose the kind of help you want. Every service stays available at every
        score. This directory does not send your answers, book appointments, or
        contact anyone.
      </p>
      <UrgentHelp />
      <div
        className="filter-buttons"
        role="group"
        aria-label="Filter support services"
      >
        {filters.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="secondary"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="service-grid">
        {(filter === "all" || filter === "counselling") && (
          <article className="service-card campus-card">
            <span className="service-audience">
              Students seeking a conversation
            </span>
            <h3>Your university counselling service</h3>
            <p>
              You can ask what a first appointment involves, who provides
              counselling, what it costs, and the limits of confidentiality
              before sharing details.
            </p>
            <label htmlFor="campus-choice">
              Find an official university contact page
            </label>
            <select
              id="campus-choice"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
            >
              <option value="">Choose a university (optional)</option>
              {schema.dss.campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="other">My university is not listed</option>
            </select>
            {campusService ? (
              <div className="campus-result">
                <strong>{campusService.unit}</strong>
                <a href={campusService.url} target="_blank" rel="noreferrer">
                  Open {campusService.name} contact page ↗
                </a>
              </div>
            ) : (
              <p className="small">
                If yours is not listed, use your university’s official website
                to find its counselling office or medical centre. Listed
                services may have faculty or student eligibility requirements;
                check the contact page.
              </p>
            )}
            <small>
              Your university choice stays in this page and is not used by the
              model.
            </small>
          </article>
        )}
        {schema.dss.services
          .filter(
            (s) =>
              s.category !== "urgent" &&
              (filter === "all" || s.category === filter),
          )
          .map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
      </div>
      <p className="small">
        Service details are linked to official sources. Confirm opening hours,
        access, costs, language options and confidentiality directly. Use a
        device and contact method that feel safe for you; external websites and
        calls may leave a history.
      </p>
    </section>
  );
}
