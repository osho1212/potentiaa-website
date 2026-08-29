"use client";

/**
 * The Potentiaa main logo mark - rendering the exact user PNG image file.
 */
export default function LogoMark({
  className,
  title = "Potentiaa",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <img
      src="/assets/img/logo-mark.png"
      alt={title}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
