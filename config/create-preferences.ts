/**
 * Preferences collected on /create before a production request is submitted.
 * Stored with each request so the operator can match the delivered video.
 */

export const SCIENTIFIC_FIELDS = [
  "Agriculture",
  "Artificial Intelligence",
  "Astronomy",
  "Biochemistry",
  "Biomedical Engineering",
  "Biomedical Imaging",
  "Cardiology",
  "Cell Biology",
  "Chemical Engineering",
  "Chemistry",
  "Civil Engineering",
  "Climate Science",
  "Computer Science",
  "Developmental Biology",
  "Earth Science",
  "Ecology",
  "Economics",
  "Electrical Engineering",
  "Environmental Science",
  "Evolutionary Biology",
  "Genetics",
  "Immunology",
  "Materials Science",
  "Mathematics",
  "Mechanical Engineering",
  "Medicine",
  "Microbiology",
  "Molecular Biology",
  "Neuroscience",
  "Oceanography",
  "Oncology",
  "Orthopedics",
  "Other",
  "Pharmacology",
  "Physics",
  "Psychology",
  "Public Health",
  "Quantum Physics",
  "Robotics",
  "Social Sciences",
  "Surgery",
  "Virology",
] as const;

export type ScientificField = (typeof SCIENTIFIC_FIELDS)[number];

export const VIDEO_LENGTHS = [
  { id: "60", label: "60 sec", seconds: 60 },
  { id: "90", label: "90 sec", seconds: 90 },
  { id: "120", label: "2 min", seconds: 120 },
  { id: "180", label: "3 min", seconds: 180 },
] as const;

export type VideoLengthId = (typeof VIDEO_LENGTHS)[number]["id"];

export const NARRATION_VOICES = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
] as const;

export type NarrationVoiceId = (typeof NARRATION_VOICES)[number]["id"];

export const OUTPUT_ASPECTS = [
  { id: "16:9", label: "16:9", hint: "Landscape: journals, talks, websites" },
  { id: "9:16", label: "9:16", hint: "Vertical: social and mobile" },
  { id: "1:1", label: "1:1", hint: "Square: feeds and posters" },
] as const;

export type OutputAspectId = (typeof OUTPUT_ASPECTS)[number]["id"];

export const BRANDING_OPTIONS = [
  { id: "none", label: "No Branding" },
  { id: "lab_logo", label: "Lab Logo" },
  { id: "university", label: "University Branding" },
] as const;

export type BrandingId = (typeof BRANDING_OPTIONS)[number]["id"];

export type CreatePreferences = {
  scientificField: ScientificField | "";
  scientificFieldOther: string;
  videoLength: VideoLengthId | "";
  narrationVoice: NarrationVoiceId | "";
  aspectRatio: OutputAspectId | "";
  branding: BrandingId | "";
  contactEmail: string;
};

export function emptyPreferences(): CreatePreferences {
  return {
    scientificField: "",
    scientificFieldOther: "",
    videoLength: "",
    narrationVoice: "",
    aspectRatio: "",
    branding: "",
    contactEmail: "",
  };
}

export function resolveScientificField(prefs: CreatePreferences): string {
  if (prefs.scientificField === "Other") {
    return prefs.scientificFieldOther.trim() || "Other";
  }
  return prefs.scientificField;
}

export function brandingNeedsLogo(branding: BrandingId | ""): boolean {
  return branding === "lab_logo" || branding === "university";
}
