/**
 * Site-wide marketing content (home page, about page). All copy lives here so
 * it's easy to edit without touching components. Placeholder content is marked.
 */

export const SITE = {
  name: "Sensationalize Science",
  tagline: "Research, Reimagined as Video",
};

/**
 * Standard production turnaround. Single source of truth — reference this
 * anywhere delivery time is quoted so the promise can be changed in one place.
 */
export const TURNAROUND = {
  businessDays: "3–5",
  label: "3–5 business days",
};

export const HERO = {
  headline: ["scientific papers,", "Reimagined as Video"],
  subheadline:
    "Turn your lab's research into publication-quality video. Upload your paper, identify the findings that matter most, and collaborate with our AI-assisted scientific production workflow.",
  primaryCta: { label: "Start a Project", href: "/create" },
  secondaryCta: { label: "Watch Demos", href: "/gallery" },
};

export const TRUSTED_BY = [
  "Northwestern",
  "Cell Reports",
  "Broad Institute",
  "Nature Comms",
  "Genentech",
  "MIT Media Lab",
]; // PLACEHOLDER logos — replace with real partner names/marks.

export const WHY_IT_MATTERS = [
  {
    icon: "Users",
    title: "Reach audiences beyond academia",
    body: "Meet people where they scroll — TikTok, Reels, Shorts, and LinkedIn.",
  },
  {
    icon: "Clock",
    title: "Save weeks of production work",
    body: `Hand off scripting, visuals, and editing. Your video lands in ${TURNAROUND.label}.`,
  },
  {
    icon: "Lightbulb",
    title: "Explain complex findings clearly",
    body: "Plain-language scripts and visuals that make hard science land.",
  },
  {
    icon: "Share2",
    title: "Create platform-ready science content",
    body: "Vertical, captioned, and formatted for every major platform.",
  },
];

/**
 * The six stages of the production workflow, rendered as the homepage process
 * diagram (components/ProductionWorkflow.tsx). `icon` keys are lucide-react
 * component names resolved in that component's ICONS map.
 */
export interface WorkflowStage {
  step: number;
  icon: string;
  title: string;
  points: string[];
}

export const PRODUCTION_WORKFLOW: WorkflowStage[] = [
  {
    step: 1,
    icon: "FileUp",
    title: "Upload your research",
    points: [
      "Submit the full paper as a PDF",
      "Include lab branding if you have it",
      "Accepts preprints, accepted manuscripts, and published papers",
      "Your paper stays confidential, nothing published or shared without your approval",
    ],
  },
  {
    step: 2,
    icon: "SlidersHorizontal",
    title: "Set your preferences",
    points: [
      "Choose the intended audience and video length",
      "Pick tone, visual style, format, and distribution channel",
    ],
  },
  {
    step: 3,
    icon: "Microscope",
    title: "Scientific content review",
    points: [
      "The paper is analyzed and shaped into a proposed script that you can preview",
      "The most relevant findings and figures are selected",
      "No invented text, structures, or data appear on screen",
    ],
  },
  {
    step: 4,
    icon: "Clapperboard",
    title: "AI-assisted video production",
    points: [
      "Figures are extracted, ranked, and matched to the claims they support",
      "Scenes and animations are produced with Kling, Runway, and Remotion",
      "Narration is voiced with ElevenLabs",
    ],
  },
  {
    step: 5,
    icon: "MessagesSquare",
    title: "Lab review and approval",
    points: [
      "Your draft arrives inside the platform",
      "Request edits for an optional revision round, included with each video",
      "Nothing ships until your lab approves it",
    ],
  },
  {
    step: 6,
    icon: "PackageCheck",
    title: `Delivery in ${TURNAROUND.businessDays} business days`,
    points: [
      "Versions suited to journals and institutional communications",
      "Source files delivered alongside the final cut",
    ],
  },
];

export const CORE_FEATURES = [
  { icon: "FileText", title: "Scientific script generation", body: "Accurate, readable narration grounded in your paper." },
  { icon: "Sparkles", title: "Research-specific animations", body: "Visuals that reflect the actual science." },
  { icon: "Mic", title: "Natural voiceovers", body: "Clear AI narration that sounds human." },
  { icon: "Captions", title: "Automatic captions", body: "Word-synced captions ready for silent autoplay." },
  {
    icon: "Share2",
    title: "Social Media",
    body: "Connected to multiple social media to post directly, no wait.",
  },
  { icon: "Quote", title: "Citation-first", body: "Every video opens with the full citation: title, authors, DOI." },
  { icon: "Image", title: "Figures straight from your paper", body: "Your actual figures extracted and rebuilt for video." },
  { icon: "UserCheck", title: "Expert review before delivery", body: "A team with a scientific background, performs rigorous quality checks every video." },
];

export const BUILT_FOR = [
  { icon: "Microscope", title: "Researchers", body: "Share your work with the world." },
  { icon: "FlaskConical", title: "Labs", body: "Grow your lab's visibility." },
  { icon: "GraduationCap", title: "Universities", body: "Communicate research at scale." },
  { icon: "BookOpen", title: "Scientific journals", body: "Give every paper a video abstract." },
  { icon: "Building2", title: "Biotech companies", body: "Explain R&D to any audience." },
  { icon: "Clapperboard", title: "Science creators", body: "Publish faster, post more often." },
];

export const ACCURACY_POINTS = [
  "Review and edit the generated script line by line",
  "Approve or swap every visual and animation",
  "Check citations and source references",
  "Fix terminology and technical wording",
  "Adjust narration, pacing, and emphasis before export",
];

// PLACEHOLDER testimonials — replace with real, approved quotes.
export const TESTIMONIALS = [
  {
    quote:
      "We turned a dense methods paper into a 40-second video our whole department shared. This is placeholder testimonial copy.",
    name: "Placeholder Name",
    role: "Principal Investigator, Placeholder University",
  },
  {
    quote:
      "Our journal now ships a video abstract with every issue. Engagement went up noticeably. This is placeholder testimonial copy.",
    name: "Placeholder Name",
    role: "Managing Editor, Placeholder Journal",
  },
  {
    quote:
      "I post a new paper explainer every week without a video editor. This is placeholder testimonial copy.",
    name: "Placeholder Name",
    role: "Science Creator, Placeholder Channel",
  },
];

export const FINAL_CTA = {
  headline: "Your Research Deserves a Larger Audience",
  cta: { label: "Start a Project", href: "/create" },
};

export const ABOUT = {
  mission:
    "Make world-class science understandable — and watchable — for everyone, not just other experts.",
  problem:
    "Most research never reaches beyond a small circle of specialists. Findings that could inform, inspire, or help people stay locked inside PDFs. Turning a paper into engaging video today takes skills and hours most scientists don't have.",
  vision:
    "A world where every important finding has a clear, accurate, publication-quality video — produced with the people who did the work, and approved by them before it ships.",
  // PLACEHOLDER founding story — replace with the real story.
  story:
    "Sensationalize Science started when a group of researchers and builders kept watching great papers disappear into obscurity. This is placeholder founding-story copy to be replaced.",
  // PLACEHOLDER team — replace with real team members.
  team: [
    { name: "Placeholder Founder", role: "Co-founder & CEO" },
    { name: "Placeholder Founder", role: "Co-founder & CTO" },
    { name: "Placeholder Lead", role: "Head of Science" },
    { name: "Placeholder Lead", role: "Head of Design" },
  ],
};
