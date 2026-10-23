export type Service = {
  id: string;
  category: string;
  name: string;
  phone?: string;
  audience: string;
  description: string;
  access: string;
  source: string;
  sourceLabel: string;
};
export type Domain = {
  id: string;
  label: string;
  items: string[];
  description: string;
};
export type Score = {
  score: number | null;
  observed_subtotal: number;
  answered: number;
  missing: number;
  item_count: number;
  maximum: number;
  observed_maximum: number;
  possible_range: [number, number];
  reported_items: string[];
};
export type Schema = {
  title: string;
  features: string[];
  questions: Record<string, string>;
  labels: string[];
  scale: Record<string, string>;
  model: string;
  development_n: number;
  test_n: number;
  test_metrics: Record<string, number>;
  interpretation: string;
  dss: {
    version: string;
    domains: Domain[];
    scoring_policy: string;
    scoring_source: { title: string; url: string };
    support_source: { title: string; url: string };
    services: Service[];
    campuses: { id: string; name: string; unit: string; url: string }[];
  };
};
export type Result = {
  category: number;
  label: string;
  probabilities: number[];
  guidance: string;
  reference_probability: number;
  reference: string;
  contributions: { feature: string; value: number }[];
  dvq: Score & { domains: (Domain & Score)[]; period: string; method: string };
  decision_support: {
    version: string;
    basis: string;
    rules: {
      id: string;
      title: string;
      reason: string;
      items: string[];
      action: string;
      service_ids: string[];
    }[];
  };
};
