import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { Scene } from "./Scene";
import { ColdOpen } from "./ColdOpen";
import { TitleCard } from "./TitleCard";
import { theme } from "./theme";

export type WordTiming = { word: string; start: number; end: number };

export type ExplainerScene = {
  index: number;
  title: string;
  narration: string;
  icon: string;
  /** Exact paper terms for on-screen Remotion labels. */
  keyTerms?: string[];
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
  /** 2-4 word curiosity-gap teaser flashed after the title card. */
  coldOpen?: string;
  paperTitle?: string;
  authors?: string;
  journal?: string;
  doi?: string;
  /** Silent citation card length (default 2s @ 30fps). */
  titleCardFrames?: number;
};

/** Root composition: title card, then narrated scenes (background + 4-act paper). */
export function Explainer({
  scenes,
  coldOpen,
  paperTitle,
  authors,
  journal,
  doi,
  titleCardFrames = 60,
}: ExplainerProps) {
  const showTitleCard = Boolean(paperTitle);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Series>
        {showTitleCard ? (
          <Series.Sequence durationInFrames={titleCardFrames}>
            <TitleCard
              paperTitle={paperTitle as string}
              authors={authors}
              journal={journal}
              doi={doi}
            />
          </Series.Sequence>
        ) : null}
        {scenes.map((scene, i) => (
          <Series.Sequence
            key={`${scene.index}-${i}`}
            durationInFrames={scene.durationInFrames}
          >
            <Scene
              title={scene.title}
              narration={scene.narration}
              icon={scene.icon}
              keyTerms={scene.keyTerms}
              setting={scene.setting}
              imageStaticPath={scene.imageStaticPath}
              imageStaticPathB={scene.imageStaticPathB}
              captions={scene.captions}
              badge={
                scene.index > 0
                  ? `${scene.index} / 4`
                  : undefined
              }
              motionSeed={scene.index || i + 1}
            />
            <Audio src={staticFile(scene.audioStaticPath)} />
          </Series.Sequence>
        ))}
      </Series>

      {coldOpen ? (
        <ColdOpen
          text={coldOpen}
          startFrame={showTitleCard ? titleCardFrames : 0}
        />
      ) : null}
    </AbsoluteFill>
  );
}
