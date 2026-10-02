/**
 * Star rating display.
 *
 * The stars are decorative; the accessible name carries the actual value, so a
 * screen reader hears "4.3 out of 5" rather than five star characters.
 */
export function RatingStars({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const rounded = Math.round(rating * 2) / 2;
  const textSize = size === "lg" ? "text-lg" : "text-sm";

  return (
    <span
      className={`inline-flex items-center ${textSize} leading-none text-amber-accent-dark`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = rounded >= star ? "full" : rounded >= star - 0.5 ? "half" : "empty";
        return (
          <span key={star} aria-hidden="true" className="relative">
            <span className="text-ink-200">★</span>
            {fill !== "empty" && (
              <span
                className="absolute inset-0 overflow-hidden text-amber-accent-dark"
                style={{ width: fill === "half" ? "50%" : "100%" }}
              >
                ★
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
