import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { Scene } from "./Scene";
import { ColdOpen } from "./ColdOpen";
import { theme } from "./theme";

export type WordTiming = { word: string; start: number; end: number };

export type ExplainerScene = {
  index: number;
  title: string;
  narration: string;
  icon: string;
  /** Short subject noun for this beat; labels the talking mascot. */
  subject?: string;
  /** Illustrated scene backdrop key (see remotion/scenes). Fallback when no image. */
  setting: string;
  /** AI-generated illustration path (shot A). Undefined -> fall back to setting. */
  imageStaticPath?: string;
  /** Second illustration (shot B) for a mid-scene hard-cut. */
  imageStaticPathB?: string;
  /** Path relative to the bundle's public dir, e.g. "audio/scene-1.mp3". */
  audioStaticPath: string;
  /** Per-word narration timing (seconds) for synced captions. */
  captions?: WordTiming[];
  durationInFrames: number;
};

export type ExplainerProps = {
  scenes: ExplainerScene[];
  /** 2-4 word curiosity-gap teaser flashed over the first ~0.6s. */
  coldOpen?: string;
};

/** Root composition: one sequence per scene (fixed 4-act paper structure). */
export function Explainer({ scenes, coldOpen }: ExplainerProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence
            key={scene.index}
            durationInFrames={scene.durationInFrames}
          >
            <Scene
              title={scene.title}
              narration={scene.narration}
              icon={scene.icon}
              subject={scene.subject}
              setting={scene.setting}
              imageStaticPath={scene.imageStaticPath}
              imageStaticPathB={scene.imageStaticPathB}
              captions={scene.captions}
              badge={`${scene.index} / ${scenes.length}`}
              motionSeed={scene.index}
            />
            <Audio src={staticFile(scene.audioStaticPath)} />
          </Series.Sequence>
        ))}
      </Series>

      {/* curiosity-gap flash card over the very start (narration plays underneath) */}
      {coldOpen ? <ColdOpen text={coldOpen} /> : null}
    </AbsoluteFill>
  );
}
