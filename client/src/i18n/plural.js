// Picks the singular or plural text, then fills {n}:
//
//   plural(tx, rooms, "{n} Room", "{n} Rooms")
//
// English needs two sentences. Odia and Hindi usually write both the same way, so their
// dictionaries can hold the same words for both keys.
export const plural = (tx, n, one, many) => tx(Number(n) === 1 ? one : many, { n });

// "Puri, Odisha, India": the parts of a place line are translated one by one
export const placeLine = (tx, text) =>
  String(text || "")
    .split(", ")
    .map((part) => tx(part))
    .join(", ");
