export const SCORING_SOURCE = {
  title: "Rodríguez-Díaz et al. — DVQ-R validation and Appendix A",
  url: "https://doi.org/10.1016/j.ijchp.2016.09.001",
};

// D01–D20 follow the retained items in Appendix A, in their original order.
export const DVQ_DOMAINS = [
  {
    id: "coercion",
    label: "Coercion",
    items: ["D01", "D05", "D13", "D17"],
    description: "Pressure, control and interference with personal boundaries.",
  },
  {
    id: "sexual",
    label: "Sexual violence",
    items: ["D02", "D06", "D14", "D18"],
    description:
      "Unwanted sexual contact or pressure to participate in sexual acts.",
  },
  {
    id: "physical",
    label: "Physical violence",
    items: ["D03", "D07", "D10", "D11"],
    description: "Physical force, assault or harm involving objects.",
  },
  {
    id: "detachment",
    label: "Detachment",
    items: ["D04", "D08", "D15", "D16"],
    description:
      "Disregard of feelings, responsibilities or connection in the relationship.",
  },
  {
    id: "humiliation",
    label: "Humiliation",
    items: ["D09", "D12", "D19", "D20"],
    description:
      "Belittling, ridicule or insults directed at you or your beliefs.",
  },
];

export const SUPPORT_SERVICES = [
  {
    id: "ambulance",
    category: "urgent",
    name: "1990 Suwa Seriya",
    phone: "1990",
    audience: "Anyone with a medical emergency",
    description: "Free, island-wide pre-hospital emergency ambulance care.",
    access:
      "Call for a medical emergency; this is not a routine appointment service.",
    source: "https://www.1990.lk/",
    sourceLabel: "1990 Suwa Seriya Foundation",
  },
  {
    id: "police-emergency",
    category: "urgent",
    name: "Police emergency",
    phone: "119",
    audience: "Anyone needing urgent police assistance",
    description: "Emergency assistance from Sri Lanka Police.",
    access:
      "Use if you need immediate police assistance and it is safe to call.",
    source: "https://www.police.lk/?p=14206",
    sourceLabel: "Sri Lanka Police",
  },
  {
    id: "hospital",
    category: "medical",
    name: "Mithuru Piyasa / Natpu Nilayam",
    audience: "People seeking support for gender-based violence",
    description:
      "Hospital-based services for medical care, emotional support and referral.",
    access:
      "Ask your nearest government hospital about its centre or an appropriate referral. Availability varies by hospital.",
    source:
      "https://fhb.health.gov.lk/resources/gender-based-violance-care-centers-mithuru-piyasa-natpu-nilayam-facilitator-manual-for-tra",
    sourceLabel: "Family Health Bureau, Ministry of Health",
  },
  {
    id: "women",
    category: "women",
    name: "Women’s helpline",
    phone: "1938",
    audience: "Women seeking assistance",
    description:
      "The Ministry of Women and Child Affairs lists 1938 as its women’s helpline.",
    access:
      "Ask about available support and referral options. Confirm the service’s hours and confidentiality arrangements directly.",
    source: "https://www.childwomenmin.gov.lk/public/contact/en",
    sourceLabel: "Ministry of Women and Child Affairs",
  },
  {
    id: "women-police",
    category: "reporting",
    name: "Bureau for the Prevention of Abuse of Children and Women",
    phone: "109",
    audience: "Women and children seeking police assistance",
    description: "A police channel for assistance and complaints about abuse.",
    access:
      "Contacting police is your choice. This app does not file a report or notify anyone.",
    source: "https://www.police.lk/?p=14206",
    sourceLabel: "Sri Lanka Police",
  },
];

export const CAMPUS_SERVICES = [
  {
    id: "colombo",
    name: "University of Colombo",
    unit: "Student Counselling Office",
    url: "https://cmb.ac.lk/sco",
  },
  {
    id: "moratuwa",
    name: "University of Moratuwa",
    unit: "Student Counselling Unit",
    url: "https://uom.lk/scu/student-counsellors",
  },
  {
    id: "peradeniya",
    name: "University of Peradeniya",
    unit: "Counselling and Psychological Support Unit",
    url: "https://site.pdn.ac.lk/centers/capsu/about.php",
  },
  {
    id: "sjp",
    name: "University of Sri Jayewardenepura",
    unit: "University Medical Centre counselling appointments",
    url: "https://medical.sjp.ac.lk/students-help-desk/",
  },
];

export const SUPPORT_SOURCE = {
  title:
    "WHO — Health care for women subjected to intimate partner violence or sexual violence",
  url: "https://www.who.int/publications/i/item/WHO-RHR-14.26",
};

export const DSS_CONFIG = {
  version: "dvq-dss-v1",
  domains: DVQ_DOMAINS,
  scoring_source: SCORING_SOURCE,
  support_source: SUPPORT_SOURCE,
  services: SUPPORT_SERVICES,
  campuses: CAMPUS_SERVICES,
  scoring_policy:
    "Sum observed responses scored 0–4. Total: 0–80; each four-item category: 0–16. No reverse scoring. A score is complete only when every item in that score is answered. No clinical severity thresholds are applied.",
};

function observedScore(responses, items) {
  const observed = items.map((f) => responses[f]).filter((v) => v !== null);
  const subtotal = observed.reduce((sum, v) => sum + v, 0);
  const missing = items.length - observed.length;
  return {
    score: missing ? null : subtotal,
    observed_subtotal: subtotal,
    answered: observed.length,
    missing,
    item_count: items.length,
    maximum: items.length * 4,
    observed_maximum: observed.length * 4,
    possible_range: [subtotal, subtotal + missing * 4],
    reported_items: items.filter(
      (f) => responses[f] !== null && responses[f] > 0,
    ),
  };
}

// Call after validateResponses. Missing values are never imputed for DVQ-R scores.
export function scoreDvq(responses) {
  const domains = DVQ_DOMAINS.map((domain) => ({
    ...domain,
    ...observedScore(responses, domain.items),
  }));
  return {
    ...observedScore(
      responses,
      DVQ_DOMAINS.flatMap((domain) => domain.items),
    ),
    domains,
    period: "past six months",
    method: "Observed item sums; no imputation, prorating or severity cut-offs",
  };
}

export function decisionSupport(dvq) {
  const reported = (id) => dvq.domains.find((d) => d.id === id).reported_items;
  const rules = [];
  const medicalItems = [...reported("physical"), ...reported("sexual")];
  if (medicalItems.length)
    rules.push({
      id: "observed-physical-or-sexual",
      title: "Medical and specialist support is available",
      reason:
        "At least one physical or sexual experience was reported above Never. A six-month response does not tell us whether you are in danger now.",
      items: medicalItems,
      action:
        "You can speak with a healthcare professional or ask a hospital about Mithuru Piyasa / Natpu Nilayam. If there is a current injury or recent unwanted sexual contact, seek prompt medical advice.",
      service_ids: ["hospital"],
    });
  if (reported("coercion").length)
    rules.push({
      id: "observed-coercion",
      title: "Consider support with safety and boundaries",
      reason: "At least one coercion item was reported above Never.",
      items: reported("coercion"),
      action:
        "If it feels safe, consider a private conversation with a counsellor or trusted person about the support you want and a plan that suits you.",
      service_ids: ["campus", "hospital"],
    });
  rules.push({
    id: "support-for-everyone",
    title: "You can choose support at any score",
    reason:
      "Support options are available regardless of your DVQ-R score or estimated help-seeking intention.",
    items: [],
    action:
      "You can ask a counsellor what an appointment involves before deciding. You do not have to disclose every detail, contact police, or make a decision about your relationship here.",
    service_ids: ["campus", "hospital", "women", "women-police"],
  });
  return {
    version: DSS_CONFIG.version,
    rules,
    basis:
      "Transparent application rules based on observed responses; not a clinical risk assessment or a learned treatment recommendation. Urgent help is always available independently of these rules.",
  };
}
