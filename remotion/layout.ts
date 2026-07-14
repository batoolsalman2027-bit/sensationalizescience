import { useVideoConfig } from "remotion";

export type FrameOrientation = "vertical" | "landscape" | "square";

export function useFrameOrientation(): FrameOrientation {
  const { width, height } = useVideoConfig();
  const ratio = height / width;
  if (ratio > 1.2) return "vertical";
  if (ratio < 0.85) return "landscape";
  return "square";
}
