import cn from "~/utils/cn";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// Height of one digit on a wheel
const STEP = 20;

interface Props {
  value: number;
  className?: string;
}

/** Two wheels of digits that roll to the value, like an odometer. */
const IslandCounter = ({ value, className }: Props) => {
  const digits = String(Math.min(Math.max(value, 0), 99)).padStart(2, "0");

  return (
    <span className={cn("inline-flex shrink-0 gap-0.5", className)}>
      <span className="sr-only">{value}</span>
      {[0, 1].map((wheel) => (
        <span
          key={wheel}
          aria-hidden
          className="block h-5 w-[13px] overflow-hidden rounded-[4px] border border-neutral-50/30 text-center text-[11.5px] tabular-nums"
        >
          <span
            className="block transition-transform duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
            style={{
              transform: `translateY(${-Number(digits[wheel]) * STEP}px)`,
            }}
          >
            {DIGITS.map((digit) => (
              <b key={digit} className="block h-5 font-medium leading-[18px]">
                {digit}
              </b>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
};

export default IslandCounter;
