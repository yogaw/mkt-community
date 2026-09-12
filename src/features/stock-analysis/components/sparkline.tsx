import { cn } from "@/lib/cn";

const WIDTH = 96;
const HEIGHT = 28;

/** A shape, not a chart: no axes, no labels, no interaction. */
export function Sparkline({ values, rising }: { values: number[]; rising: boolean }) {
  if (values.length < 2) {
    return <span className="block h-7 w-24" aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * WIDTH;
      const y = span === 0 ? HEIGHT / 2 : HEIGHT - ((value - min) / span) * HEIGHT;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-7 w-24"
    >
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={cn(rising ? "stroke-accent" : "stroke-down")}
      />
    </svg>
  );
}
