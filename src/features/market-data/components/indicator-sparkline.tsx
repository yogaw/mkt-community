import { cn } from "@/lib/cn";

const WIDTH = 120;
const HEIGHT = 32;

/**
 * A trend shape, not a chart: no axes, no labels, no interaction. Its only job
 * is to say whether the last quarter drifted up or down, beside a number that
 * gives the precise value.
 */
export function IndicatorSparkline({
  values,
  rising,
  className,
}: {
  values: number[];
  rising: boolean;
  className?: string;
}) {
  const path = sparkPath(values, WIDTH, HEIGHT);
  if (!path) {
    return null;
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-8 w-full", className)}
    >
      <path
        d={`${path} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`}
        className={rising ? "fill-accent/10" : "fill-down/10"}
        stroke="none"
      />
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={rising ? "stroke-accent" : "stroke-down"}
      />
    </svg>
  );
}

/** Trend shape over a fixed viewBox; a flat series renders as a centre line. */
function sparkPath(values: number[], width: number, height: number): string {
  if (values.length < 2) {
    return "";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
