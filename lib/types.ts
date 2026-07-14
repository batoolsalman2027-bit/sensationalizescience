// Shared types across the paper -> video pipeline.

/** A single narrated beat of the summary video. */
export interface Scene {
  /** 1-based order of the scene. */
  index: number;
  /** Short on-screen title/caption for this beat. */
  title: string;
  /** The narration text spoken for this scene. */
  narration: string;
  /** Optional cue describing what should appear visually (descriptive text, not used for rendering yet). */
  visualCue?: string;
  /** Icon key (from remotion/icons.ts's vocabulary) used for this scene's motion-graphics visual. */
  icon: string;
  /** Illustrated scene backdrop key (from remotion/scenes's vocabulary), e.g. "lab-bench". Used as fallback when AI image gen is unavailable. */
  setting: string;
  /** Concrete visual description of the ideal illustration for this scene, fed to the image model. */
  imagePrompt: string;
  /** A DIFFERENT shot/angle of the same beat, used for a mid-scene hard-cut (pattern interruption). */
  imagePromptB: string;
  /** Short subject noun this scene is "about" (e.g. "brain", "cell", "algorithm"). */
  subject: string;
  /** 3-6 concrete terms actually named in the paper for this beat (organism, molecule, technique, structure). Grounds the image prompt so illustrations aren't generic/invented. Also drawn correctly as on-screen Remotion labels. */
  keyTerms: string[];
}

/** The structured script produced by Claude from the paper text. */
export interface VideoScript {
  paperTitle: string;
  /** Authors as shown on the paper, e.g. "Smith et al." or a short author list. */
  authors: string;
  /** Journal or venue name when available. */
  journal: string;
  /** DOI string when available (with or without https://doi.org/). */
  doi: string;
  /** One-sentence hook / TL;DR used as a subtitle in the app UI. */
  hook: string;
  /** 2-4 word curiosity-gap teaser flashed on screen after the title card (not spoken). */
  coldOpen: string;
  /** 2-4 sentence lay-audience primer about the field / disease / protein before the technical beats. */
  background: string;
  /** Illustration prompt for the background primer beat. */
  backgroundImagePrompt: string;
  scenes: Scene[];
  /** Full narration concatenated (background + scenes). */
  fullNarration: string;
}

/** Status of an in-flight video render job. */
export type JobStatus = "pending" | "processing" | "done" | "error";

export interface VideoJob {
  id: string;
  status: JobStatus;
  /** Final video URL when done. */
  videoUrl?: string;
  error?: string;
  createdAt: number;
}
