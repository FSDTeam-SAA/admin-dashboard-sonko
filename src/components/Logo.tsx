/** Sunu Pay logo. Colour version on light, white version on dark (no box behind it). */
export function Logo({ className, width }: { className: string; width: number }) {
  const base = import.meta.env.BASE_URL;
  return (
    <>
      <img className={`${className} logo-on-light`} src={`${base}logo-full.png`} alt="Sunu Pay" width={width} height={Math.round(width * 0.157)} />
      <img className={`${className} logo-on-dark`} src={`${base}logo-white.svg`} alt="" aria-hidden="true" width={width} height={Math.round(width * 0.163)} />
    </>
  );
}
