/**
 * Neural backdrop: neurons, axons, synaptic terminals, and chemical-signal
 * vesicles. Decorative only — fixed, non-interactive, low opacity.
 */

type Pt = [number, number];

function Neuron({
  cx,
  cy,
  r = 8,
  dendrites,
  axon,
  pulseDelay = 0,
}: {
  cx: number;
  cy: number;
  r?: number;
  dendrites: Pt[];
  axon?: { to: Pt; mid?: Pt };
  pulseDelay?: number;
}) {
  const axonPath = axon
    ? axon.mid
      ? `M ${cx} ${cy} Q ${axon.mid[0]} ${axon.mid[1]} ${axon.to[0]} ${axon.to[1]}`
      : `M ${cx} ${cy} L ${axon.to[0]} ${axon.to[1]}`
    : "";

  return (
    <g className="neuron">
      {dendrites.map(([x, y], i) => (
        <path
          key={`d${i}`}
          className="dendrite"
          d={`M ${cx} ${cy} Q ${(cx + x) / 2 + (i % 2 ? 10 : -10)} ${(cy + y) / 2} ${x} ${y}`}
          fill="none"
        />
      ))}
      {dendrites.map(([x, y], i) => (
        <circle key={`t${i}`} className="terminal" cx={x} cy={y} r={2.1} />
      ))}

      {axon && (
        <>
          <path className="axon" d={axonPath} fill="none" />
          <circle className="bouton" cx={axon.to[0]} cy={axon.to[1]} r={4} />
          <circle className="synapse-glow" cx={axon.to[0]} cy={axon.to[1]} r={10} />
          <circle className="signal-pulse" r={3}>
            <animateMotion
              dur={`${3.8 + pulseDelay}s`}
              begin={`${pulseDelay}s`}
              repeatCount="indefinite"
              path={axonPath}
            />
          </circle>
          {[0, 1, 2].map((n) => {
            const ox = (n - 1) * 7;
            const oy = 6 + n * 3;
            return (
              <circle
                key={`v${n}`}
                className="vesicle"
                cx={axon.to[0]}
                cy={axon.to[1]}
                r={1.6 + n * 0.2}
              >
                <animate
                  attributeName="cx"
                  values={`${axon.to[0]};${axon.to[0] + ox}`}
                  dur={`${2.4 + n * 0.35}s`}
                  begin={`${pulseDelay + 0.6 + n * 0.25}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`${axon.to[1]};${axon.to[1] + oy}`}
                  dur={`${2.4 + n * 0.35}s`}
                  begin={`${pulseDelay + 0.6 + n * 0.25}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;0.85;0"
                  dur={`${2.4 + n * 0.35}s`}
                  begin={`${pulseDelay + 0.6 + n * 0.25}s`}
                  repeatCount="indefinite"
                />
              </circle>
            );
          })}
        </>
      )}

      <circle className="soma-ring" cx={cx} cy={cy} r={r + 5} />
      <circle className="soma" cx={cx} cy={cy} r={r} />
      <circle className="soma-core" cx={cx} cy={cy} r={r * 0.36} />
    </g>
  );
}

function NeuralField({
  className,
  variant,
}: {
  className: string;
  variant: "tr" | "bl" | "mid" | "tl" | "br";
}) {
  if (variant === "tr") {
    return (
      <svg className={className} viewBox="0 0 640 480" fill="none" aria-hidden="true">
        <Neuron
          cx={380}
          cy={90}
          r={10}
          pulseDelay={0}
          dendrites={[
            [320, 28], [350, 16], [430, 24], [480, 60], [460, 140], [330, 150],
          ]}
          axon={{ to: [200, 210], mid: [280, 100] }}
        />
        <Neuron
          cx={170}
          cy={230}
          r={8}
          pulseDelay={1.1}
          dendrites={[
            [110, 180], [80, 240], [130, 300], [220, 290], [230, 190],
          ]}
          axon={{ to: [310, 310], mid: [230, 290] }}
        />
        <Neuron
          cx={480}
          cy={250}
          r={7}
          pulseDelay={2.0}
          dendrites={[
            [530, 200], [570, 260], [520, 320], [430, 310],
          ]}
          axon={{ to: [360, 180], mid: [440, 200] }}
        />
        <Neuron
          cx={300}
          cy={360}
          r={6.5}
          pulseDelay={0.7}
          dendrites={[
            [250, 400], [320, 420], [360, 370], [270, 330],
          ]}
          axon={{ to: [420, 300], mid: [350, 340] }}
        />
        <Neuron
          cx={540}
          cy={120}
          r={5.5}
          pulseDelay={1.6}
          dendrites={[
            [580, 80], [600, 130], [560, 170],
          ]}
          axon={{ to: [450, 180], mid: [510, 160] }}
        />
        <Neuron
          cx={90}
          cy={120}
          r={6}
          pulseDelay={2.5}
          dendrites={[
            [40, 80], [30, 140], [70, 180], [130, 90],
          ]}
          axon={{ to: [200, 80], mid: [140, 70] }}
        />
      </svg>
    );
  }

  if (variant === "bl") {
    return (
      <svg className={className} viewBox="0 0 560 420" fill="none" aria-hidden="true">
        <Neuron
          cx={120}
          cy={200}
          r={9}
          pulseDelay={0.4}
          dendrites={[
            [40, 140], [20, 200], [50, 280], [130, 300], [190, 250], [180, 130],
          ]}
          axon={{ to: [320, 100], mid: [230, 220] }}
        />
        <Neuron
          cx={340}
          cy={80}
          r={7.5}
          pulseDelay={1.5}
          dendrites={[
            [300, 30], [370, 18], [420, 55], [400, 130],
          ]}
          axon={{ to: [260, 230], mid: [340, 170] }}
        />
        <Neuron
          cx={240}
          cy={280}
          r={6}
          pulseDelay={2.3}
          dendrites={[
            [200, 320], [270, 330], [290, 270],
          ]}
          axon={{ to: [360, 320], mid: [300, 310] }}
        />
        <Neuron
          cx={420}
          cy={260}
          r={7}
          pulseDelay={0.9}
          dendrites={[
            [470, 220], [500, 280], [460, 330], [380, 310],
          ]}
          axon={{ to: [300, 180], mid: [380, 200] }}
        />
        <Neuron
          cx={80}
          cy={80}
          r={5.5}
          pulseDelay={1.8}
          dendrites={[
            [30, 50], [40, 110], [100, 40],
          ]}
          axon={{ to: [180, 140], mid: [120, 120] }}
        />
        <Neuron
          cx={480}
          cy={140}
          r={5}
          pulseDelay={2.8}
          dendrites={[
            [520, 100], [540, 150], [500, 190],
          ]}
          axon={{ to: [400, 200], mid: [460, 180] }}
        />
      </svg>
    );
  }

  if (variant === "tl") {
    return (
      <svg className={className} viewBox="0 0 420 320" fill="none" aria-hidden="true">
        <Neuron
          cx={100}
          cy={100}
          r={7}
          pulseDelay={0.6}
          dendrites={[
            [50, 50], [40, 110], [80, 160], [150, 80],
          ]}
          axon={{ to: [240, 160], mid: [160, 140] }}
        />
        <Neuron
          cx={260}
          cy={170}
          r={6}
          pulseDelay={1.4}
          dendrites={[
            [220, 130], [300, 140], [290, 220], [230, 220],
          ]}
          axon={{ to: [340, 80], mid: [320, 140] }}
        />
        <Neuron
          cx={180}
          cy={250}
          r={5}
          pulseDelay={2.2}
          dendrites={[
            [140, 280], [200, 290], [220, 250],
          ]}
          axon={{ to: [100, 200], mid: [140, 220] }}
        />
        <Neuron
          cx={340}
          cy={60}
          r={5.5}
          pulseDelay={0.3}
          dendrites={[
            [380, 30], [390, 80], [350, 110],
          ]}
        />
      </svg>
    );
  }

  if (variant === "br") {
    return (
      <svg className={className} viewBox="0 0 420 320" fill="none" aria-hidden="true">
        <Neuron
          cx={300}
          cy={200}
          r={7}
          pulseDelay={1.0}
          dendrites={[
            [350, 150], [380, 210], [340, 270], [250, 250],
          ]}
          axon={{ to: [160, 120], mid: [240, 180] }}
        />
        <Neuron
          cx={140}
          cy={100}
          r={6}
          pulseDelay={1.9}
          dendrites={[
            [90, 60], [80, 120], [130, 150], [180, 70],
          ]}
          axon={{ to: [220, 200], mid: [160, 170] }}
        />
        <Neuron
          cx={220}
          cy={260}
          r={5}
          pulseDelay={0.5}
          dendrites={[
            [180, 290], [250, 300], [270, 250],
          ]}
          axon={{ to: [320, 180], mid: [280, 230] }}
        />
        <Neuron
          cx={80}
          cy={220}
          r={5.5}
          pulseDelay={2.6}
          dendrites={[
            [40, 190], [30, 240], [70, 270],
          ]}
        />
      </svg>
    );
  }

  // mid
  return (
    <svg className={className} viewBox="0 0 720 340" fill="none" aria-hidden="true">
      <Neuron
        cx={140}
        cy={160}
        r={7}
        pulseDelay={0.8}
        dendrites={[
          [80, 110], [70, 170], [110, 220], [190, 210],
        ]}
        axon={{ to: [300, 100], mid: [220, 180] }}
      />
      <Neuron
        cx={320}
        cy={90}
        r={6}
        pulseDelay={1.7}
        dendrites={[
          [290, 45], [360, 40], [380, 100],
        ]}
        axon={{ to: [450, 180], mid: [380, 150] }}
      />
      <Neuron
        cx={480}
        cy={190}
        r={7}
        pulseDelay={0.2}
        dendrites={[
          [440, 230], [500, 250], [540, 190], [520, 140],
        ]}
        axon={{ to: [580, 100], mid: [540, 140] }}
      />
      <Neuron
        cx={600}
        cy={120}
        r={5.5}
        pulseDelay={2.1}
        dendrites={[
          [640, 80], [660, 130], [620, 170],
        ]}
      />
      <Neuron
        cx={250}
        cy={250}
        r={5}
        pulseDelay={1.3}
        dendrites={[
          [210, 280], [270, 290], [290, 240],
        ]}
        axon={{ to: [380, 260], mid: [310, 270] }}
      />
      <Neuron
        cx={520}
        cy={280}
        r={5}
        pulseDelay={2.7}
        dendrites={[
          [480, 310], [550, 320], [570, 270],
        ]}
        axon={{ to: [420, 220], mid: [480, 240] }}
      />
    </svg>
  );
}

export default function ScienceBackground() {
  return (
    <div className="science-bg" aria-hidden="true">
      <div className="synapse-dots" />
      <div className="glow-a" />
      <div className="glow-b" />
      <NeuralField className="mesh mesh-tr" variant="tr" />
      <NeuralField className="mesh mesh-bl" variant="bl" />
      <NeuralField className="mesh mesh-mid" variant="mid" />
      <NeuralField className="mesh mesh-tl" variant="tl" />
      <NeuralField className="mesh mesh-br" variant="br" />
    </div>
  );
}
