"use client";

import {
  ASPECT_RATIOS,
  VOICES,
  type AspectRatioId,
} from "@/config/render-options";

type Props = {
  voiceId: string;
  aspectRatio: AspectRatioId;
  disabled?: boolean;
  onVoiceChange: (voiceId: string) => void;
  onAspectChange: (aspect: AspectRatioId) => void;
};

/** Voice + aspect ratio pickers shown after script generation. */
export default function RenderOptionsPicker({
  voiceId,
  aspectRatio,
  disabled,
  onVoiceChange,
  onAspectChange,
}: Props) {
  return (
    <div className="render-options">
      <div className="render-options-group">
        <div className="render-options-label">Narration voice</div>
        <div className="render-options-grid">
          {VOICES.map((voice) => {
            const active = voice.id === voiceId;
            return (
              <button
                key={voice.id}
                type="button"
                className={`render-option-btn${active ? " is-active" : ""}`}
                disabled={disabled}
                onClick={() => onVoiceChange(voice.id)}
              >
                <span className="render-option-title">{voice.label}</span>
                <span className="render-option-hint">{voice.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="render-options-group">
        <div className="render-options-label">Aspect ratio</div>
        <div className="render-options-grid render-options-grid-aspect">
          {ASPECT_RATIOS.map((ar) => {
            const active = ar.id === aspectRatio;
            return (
              <button
                key={ar.id}
                type="button"
                className={`render-option-btn${active ? " is-active" : ""}`}
                disabled={disabled}
                onClick={() => onAspectChange(ar.id)}
              >
                <span className="aspect-preview" data-ratio={ar.id} aria-hidden />
                <span className="render-option-title">{ar.label}</span>
                <span className="render-option-hint">
                  {ar.id} · {ar.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
