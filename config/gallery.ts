/**
 * Gallery data. All entries are PLACEHOLDERS — swap in real papers, sources,
 * and video URLs. `videoUrl` can point at a rendered file in /public/renders.
 */

export const DISCIPLINES = [
  "Neuroscience",
  "Genetics",
  "Immunology",
  "Climate",
  "Physics",
  "Oncology",
  "Ecology",
  "AI & ML",
] as const;

export const VIDEO_STYLES = [
  "Explainer",
  "Data Story",
  "Animated Diagram",
  "Talking Host",
  "Cinematic",
] as const;

export interface GalleryItem {
  id: string;
  paperTitle: string;
  source: string; // journal or source
  field: string; // discipline
  style: string; // video style
  duration: string; // e.g. "0:38"
  videoUrl?: string;
  keyFindings: string[];
  script: string;
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "synaptic-spine-stability",
    paperTitle: "Functional synaptic connectivity shapes spine stability in the hippocampus",
    source: "Nature Communications",
    field: "Neuroscience",
    style: "Talking Host",
    duration: "0:38",
    keyFindings: [
      "Strong synapses grow larger and survive longer",
      "Weak spines vanish within days",
      "Total dendritic input stays remarkably stable",
    ],
    script:
      "Your brain stores memories at synapses — tiny connections between neurons. But synapses constantly appear and vanish. So how do memories last? (placeholder script excerpt)",
  },
  {
    id: "crispr-base-editing",
    paperTitle: "Precision base editing corrects a disease-causing mutation in vivo",
    source: "Cell",
    field: "Genetics",
    style: "Animated Diagram",
    duration: "0:44",
    keyFindings: [
      "A single base was rewritten without cutting DNA",
      "Correction persisted for months",
      "Off-target edits stayed low",
    ],
    script: "Placeholder generated script for the base-editing explainer.",
  },
  {
    id: "t-cell-exhaustion",
    paperTitle: "Reversing T-cell exhaustion restores anti-tumor immunity",
    source: "Immunity",
    field: "Immunology",
    style: "Explainer",
    duration: "0:41",
    keyFindings: [
      "Exhausted T-cells were reprogrammed",
      "Tumor growth slowed significantly",
      "Effect combined well with existing therapy",
    ],
    script: "Placeholder generated script for the T-cell explainer.",
  },
  {
    id: "ocean-carbon-sink",
    paperTitle: "The Southern Ocean is absorbing more carbon than models predicted",
    source: "Science",
    field: "Climate",
    style: "Data Story",
    duration: "0:36",
    keyFindings: [
      "New measurements revised uptake upward",
      "Seasonal swings were larger than expected",
      "Models need recalibration",
    ],
    script: "Placeholder generated script for the ocean carbon explainer.",
  },
  {
    id: "quantum-error-correction",
    paperTitle: "A logical qubit stays coherent below the error-correction threshold",
    source: "Nature",
    field: "Physics",
    style: "Cinematic",
    duration: "0:47",
    keyFindings: [
      "Errors dropped as the code scaled up",
      "The logical qubit outlived its parts",
      "A milestone toward fault tolerance",
    ],
    script: "Placeholder generated script for the quantum explainer.",
  },
  {
    id: "tumor-microbiome",
    paperTitle: "The tumor microbiome influences response to chemotherapy",
    source: "Cell Reports",
    field: "Oncology",
    style: "Explainer",
    duration: "0:40",
    keyFindings: [
      "Bacteria inside tumors altered drug activity",
      "Certain species predicted response",
      "A possible new therapeutic target",
    ],
    script: "Placeholder generated script for the tumor microbiome explainer.",
  },
];

/** Production settings shown on a detail page (placeholder defaults). */
export const DEFAULT_PRODUCTION_SETTINGS = {
  format: "1080 x 1920 (9:16)",
  voice: "Rachel (American, natural)",
  captions: "Word-synced, on",
  narrationSpeed: "1.5x",
  scenes: "4",
};
