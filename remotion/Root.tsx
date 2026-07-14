import { Composition, registerRoot } from "remotion";
import type { AnyZodObject } from "remotion";
import { Explainer, ExplainerProps } from "./Explainer";
import { resolveAspectRatio } from "../config/render-options";

export const FPS = 30;
// Default Vertical 9:16 for TikTok / Reels / Shorts (overridden by calculateMetadata).
export const WIDTH = 1080;
export const HEIGHT = 1920;

const defaultProps: ExplainerProps = {
  scenes: [],
  paperTitle: "",
  titleCardFrames: 60,
  aspectRatio: "9:16",
};

function RootComponent() {
  return (
    <Composition<AnyZodObject, ExplainerProps>
      id="Explainer"
      component={Explainer}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={FPS * 5}
      defaultProps={defaultProps}
      calculateMetadata={async ({
        props,
      }: {
        props: ExplainerProps;
      }) => {
        const dims = resolveAspectRatio(props.aspectRatio);
        const titleFrames =
          props.paperTitle && (props.titleCardFrames ?? 60)
            ? props.titleCardFrames ?? 60
            : 0;
        const total =
          titleFrames +
          props.scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
        return {
          durationInFrames: Math.max(total, FPS),
          width: dims.width,
          height: dims.height,
        };
      }}
    />
  );
}

registerRoot(RootComponent);
