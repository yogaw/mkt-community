interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex w-full gap-1 rounded-full border border-edge bg-panel p-1 sm:w-auto"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={
              active
                ? "flex-1 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink sm:flex-none"
                : "flex-1 rounded-full px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:flex-none"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
