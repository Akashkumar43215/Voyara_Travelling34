// Small helpers shared by the animated parts of the site.

/** True when the visitor's device asks for less motion. Animations are skipped for them. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** Cloudinary photos are stored at 900px wide for cards. Ask for a wide version for big banners. */
export const wideImage = (url, width = 1920) =>
  typeof url === "string" ? url.replace(/w_\d+/, `w_${width}`) : url;

/** Picks items by slug in the order given, then tops up from the rest so there are always `count`. */
export const pickBySlug = (items, slugs, count) => {
  const bySlug = new Map(items.map((i) => [i.slug, i]));
  const chosen = slugs.map((s) => bySlug.get(s)).filter(Boolean);
  const rest = items.filter((i) => !chosen.includes(i));

  return [...chosen, ...rest].slice(0, count);
};
