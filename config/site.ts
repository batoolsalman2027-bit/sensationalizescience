/**
 * Site-wide marketing content (home page, about page). All copy lives here so
 * it's easy to edit without touching components. Placeholder content is marked.
 */

export const SITE = {
  name: "Sensationalize Science",
  tagline: "Research, Reimagined as Video",
};

export const HERO = {
  headline: ["scientific papers,", "Reimagined as Video"],
  subheadline:
    "Upload a research paper and create a clear, animated, narrated short-form video in minutes.",
  primaryCta: { label: "Create Your First Video", href: "/create" },
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
    title: "Save hours of scripting and editing",
    body: "Go from PDF to a finished, narrated video in minutes, not days.",
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

export const HOW_IT_WORKS = [
  { step: 1, title: "Upload your paper", body: "Drop in a PDF or paste an abstract." },
  { step: 2, title: "Review the AI-generated script", body: "Check the narration for accuracy and tone." },
  { step: 3, title: "Customize the storyboard and voice", body: "Adjust scenes, visuals, and the voiceover." },
  { step: 4, title: "Export and publish", body: "Download or send straight to your platforms." },
];

export const CORE_FEATURES = [
  { icon: "FileText", title: "Scientific script generation", body: "Accurate, readable narration grounded in your paper." },
  { icon: "Sparkles", title: "Research-specific animations", body: "Visuals that reflect the actual science, not stock clips." },
  { icon: "Mic", title: "Natural voiceovers", body: "Clear AI narration that sounds human." },
  { icon: "Captions", title: "Automatic captions", body: "Word-synced captions ready for silent autoplay." },
  {
    icon: "Share2",
    title: "Social Media",
    body: "Connected to multiple social media to post directly, no wait",
  },
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
  cta: { label: "Create a Video", href: "/create" },
};

export const ABOUT = {
  mission:
    "Make world-class science understandable — and watchable — for everyone, not just other experts.",
  problem:
    "Most research never reaches beyond a small circle of specialists. Findings that could inform, inspire, or help people stay locked inside PDFs. Turning a paper into engaging video today takes skills and hours most scientists don't have.",
  vision:
    "A world where every important finding has a clear, accurate, platform-ready video — created in minutes by the people who did the work.",
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
