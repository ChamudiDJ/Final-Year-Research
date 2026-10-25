# Pathways

### Understand your experiences. Explore your support options.

Pathways is an explainable decision-support web application for Sri Lankan university students. It brings relationship-experience profiles, professional help-seeking intention estimates, and relevant support options together in one clear journey that puts students in control.

**[Explore the live application](https://help-seeking-intention-dss.vercel.app/)**

## Key features

- **Personal experience dashboard** — DVQ-R total and category scores, with clear handling of skipped responses.
- **Explainable machine learning** — a trained Random Forest estimates professional help-seeking intention and shows how responses contribute to the estimate.
- **Support at every step** — browse support services and official university contacts without completing an assessment.
- **Your next step** — choose a voluntary support plan, explore conversation prompts, and download an optional preparation checklist.
- **Private, simple access** — no account required; the application keeps no saved assessment history and clears the current assessment on refresh.
- **Responsive experience** — a consistent interface across desktop and mobile screen sizes.

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Node.js serverless API |
| Machine learning | Python, scikit-learn, XGBoost, SHAP |
| Research workflow | Jupyter notebooks compatible with Google Colab |
| Hosting | Vercel |

## Run locally

Use Node.js 22 and run these commands from the repository root:

```sh
npm ci
npm --prefix deployment/frontend ci
npm run build
npm run dev
```

Open **http://127.0.0.1:3000**. Run `npm test` to execute the automated tests.

## Project structure

- `notebooks/` — model development, analysis, and evaluation workflows.
- `deployment/` — frontend and exported model assets.
- `api/` and `lib/` — prediction endpoints and application logic.
- `tests/` — automated application checks.
- `evaluation/` — retained evaluation evidence.

Developed by **Chamudi Jayasinghe**.
