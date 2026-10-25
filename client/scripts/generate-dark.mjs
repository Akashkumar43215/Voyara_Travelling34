// Builds src/dark-auto.css from the light-mode stylesheets.
//
// It reads every rule that sets a light background, a dark text colour or a light border and
// writes a matching rule under :root[data-theme="dark"] with the colour swapped for a dark-mode
// equivalent. Anything this cannot decide is tuned by hand in src/dark.css (which loads after).
//
// Run:  npm run dark      (from client/)   Re-run it after changing colours in the light CSS.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "..", "src");

// Light-mode files, in the order main.jsx loads them. dark.css and dark-auto.css are not inputs.
const FILES = ["styles.css", "premium.css", "booking.css", "mmt.css", "hotels.css", "hotels-near.css", "addons.css", "about-contact.css", "admin.css", "admin-manage.css", "reviews-extra.css", "i18n.css", "assistant.css", "unified.css", "responsive.css", "animations.css"];

const DARK = {
  card: "#141c2e",
  surface: "#1a2438",
  border: "#2a3650",
  blueTint: "#12304f",
  cyanTint: "#0e3340",
  greenTint: "#0f2e22",
  amberTint: "#3a2a0c",
  redTint: "#3a1518",
  purpleTint: "#2a1f4a",
  blueBorder: "#1f3b5c",
};

// ---------- colour helpers ----------
const NAMED = { white: "#ffffff", black: "#000000" };

const parseColor = (token) => {
  const t = token.trim().toLowerCase();
  if (NAMED[t]) return parseColor(NAMED[t]);

  let m = t.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }

  m = t.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }

  return null;
};

const toHex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

const analyse = ({ r, g, b }) => {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const chroma = max - min;
  const L = (max + min) / 2;
  let hue = 0;

  if (chroma > 0) {
    const R = r / 255, G = g / 255, B = b / 255;
    if (max === R) hue = ((G - B) / chroma) % 6;
    else if (max === G) hue = (B - R) / chroma + 2;
    else hue = (R - G) / chroma + 4;
    hue = (hue * 60 + 360) % 360;
  }

  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

  return { chroma, L, hue, lum };
};

const tintFor = (hue) => {
  if (hue >= 180 && hue < 260) return DARK.blueTint;
  if (hue >= 150 && hue < 180) return DARK.cyanTint;
  if (hue >= 80 && hue < 150) return DARK.greenTint;
  if (hue >= 20 && hue < 80) return DARK.amberTint;
  if (hue >= 260 && hue < 330) return DARK.purpleTint;
  return DARK.redTint;
};

const isPale = ({ L, chroma }) => L >= 0.88 || (L >= 0.8 && chroma < 0.12);

// A light surface becomes a dark one.
const mapBackground = (c) => {
  if (c.a < 0.5) return null;
  const a = analyse(c);
  if (!isPale(a)) return null;

  const base = a.chroma < 0.045 ? (a.L >= 0.985 ? DARK.card : DARK.surface) : tintFor(a.hue);
  return c.a < 1 ? withAlpha(base, c.a) : base;
};

const withAlpha = (hex, alpha) => {
  const c = parseColor(hex);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
};

// A dark text colour becomes a light one. Light and mid-tone text (white on blue banners, slate on
// the dark footer) already reads on a dark page, so it is left alone.
const mapText = (c) => {
  if (c.a < 0.5) return null;
  const { lum, chroma, hue, L } = analyse(c);
  if (lum >= 0.2) return null;

  // slate greys (#334155, #475569) have a blue cast but are still "grey text", not blue text
  const saturation = chroma / (1 - Math.abs(2 * L - 1) || 1);
  const greyish = chroma < 0.12 || (hue >= 180 && hue < 260 && saturation < 0.4);

  if (greyish) {
    if (lum < 0.03) return "#e8edf5";
    if (lum < 0.12) return "#bcc6d8";
    return "#a3afc4";
  }

  // coloured text: lighten it so it reads on navy
  if (hue >= 180 && hue < 260) return lum < 0.06 ? "#e8edf5" : "#7cc0ff";
  if (hue >= 80 && hue < 180) return "#5fd38d";
  if (hue >= 20 && hue < 80) return "#ffb86b";
  if (hue >= 260 && hue < 330) return "#b79bff";
  return "#ff8a8a";
};

// A light border becomes a subtle dark one.
const mapBorder = (c) => {
  if (c.a < 0.5) return null;
  const a = analyse(c);
  if (a.L < 0.78) return null;
  if (a.chroma < 0.06) return DARK.border;
  if (a.hue >= 180 && a.hue < 260) return DARK.blueBorder;
  return DARK.border;
};

// ---------- value rewriting ----------
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;

const HAS_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?:white|black)\b/;

const rewriteColors = (value, mapper) => {
  let changed = false;
  const out = value.replace(COLOR_RE, (tok) => {
    const c = parseColor(tok);
    if (!c) return tok;
    const next = mapper(c);
    if (!next) return tok;
    changed = true;
    return next;
  });
  return changed ? out : null;
};

const isAllPale = (value) =>
  (value.match(COLOR_RE) || []).every((tok) => {
    const c = parseColor(tok);
    return !c || c.a < 0.5 || isPale(analyse(c));
  });

const BG_PROPS = new Set(["background", "background-color"]);
const TEXT_PROPS = new Set(["color", "-webkit-text-fill-color", "caret-color"]);
const BORDER_RE = /^(border|border-(top|right|bottom|left|color|top-color|right-color|bottom-color|left-color)|outline|outline-color|column-rule)$/;

const rewriteDecl = (prop, value) => {
  if (!HAS_COLOR.test(value)) return null;

  if (BG_PROPS.has(prop)) return rewriteColors(value, mapBackground);
  if (TEXT_PROPS.has(prop)) return rewriteColors(value, mapText);
  if (BORDER_RE.test(prop)) return rewriteColors(value, mapBorder);
  return null;
};

// ---------- tiny CSS parser (rules, nested @media/@supports) ----------
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const splitTop = (text, sep) => {
  const parts = [];
  let depth = 0, cur = "", quote = null;

  for (const ch of text) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === sep && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }

  if (cur.trim()) parts.push(cur);
  return parts;
};

const parseBlock = (css) => {
  const nodes = [];
  let i = 0;

  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;

    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;

    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }

    const body = css.slice(open + 1, j - 1);
    i = j;

    if (head.startsWith("@")) {
      if (/^@(media|supports|layer)/.test(head)) nodes.push({ at: head, children: parseBlock(body) });
      // @keyframes, @font-face, @import and others are skipped
    } else {
      nodes.push({ selector: head, body });
    }
  }

  return nodes;
};

const PREFIX = ':root[data-theme="dark"]';

const prefixSelector = (sel) => {
  const parts = splitTop(sel, ",").map((s) => s.trim()).filter(Boolean);
  const out = [];

  for (const p of parts) {
    if (/^(:root|html)\b/.test(p)) continue; // tokens and the document element are set by hand
    if (p.includes(":root") || p.includes("html")) continue;
    out.push(`${PREFIX} ${p}`);
  }

  return out;
};

const emitted = new Set(); // selector|property pairs a dark rule was already written for

const buildRule = (node, context = "") => {
  const selectors = prefixSelector(node.selector);
  if (!selectors.length) return "";

  const lines = [];

  // A rule that paints its own coloured or gradient background (orange tags, blue buttons) keeps
  // its text colour: that text was chosen for that background, not for the page.
  const decls = splitTop(node.body, ";").map((d) => {
    const idx = d.indexOf(":");
    return idx === -1 ? null : [d.slice(0, idx).trim().toLowerCase(), d.slice(idx + 1).trim()];
  });
  const keepsOwnBackground = decls.some(([prop, value] = []) => {
    if (!prop || !BG_PROPS.has(prop)) return false;
    if (/gradient\(/.test(value) && !isAllPale(value)) return true;
    return (value.match(COLOR_RE) || []).some((tok) => {
      const c = parseColor(tok);
      return c && c.a >= 0.5 && !isPale(analyse(c)) && analyse(c).L > 0.12;
    });
  });

  for (const decl of splitTop(node.body, ";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;

    const prop = decl.slice(0, idx).trim().toLowerCase();
    let value = decl.slice(idx + 1).trim();
    const important = /!important\s*$/.test(value);
    if (important) value = value.replace(/!important\s*$/, "").trim();

    if (keepsOwnBackground && TEXT_PROPS.has(prop)) continue;

    const next = rewriteDecl(prop, value);
    const watched = BG_PROPS.has(prop) || TEXT_PROPS.has(prop) || BORDER_RE.test(prop);

    if (next) {
      lines.push(`  ${prop}: ${next}${important ? " !important" : ""};`);
      for (const sel of selectors) emitted.add(`${context}|${sel}|${prop}`);
    } else if (watched && selectors.some((sel) => emitted.has(`${context}|${sel}|${prop}`))) {
      // an earlier file got a dark version of this property; this later light rule replaces it with a
      // value that needs no change (a theme variable or a dark colour), so say so again to keep the order
      lines.push(`  ${prop}: ${value}${important ? " !important" : ""};`);
    }
  }

  if (!lines.length) return "";
  return `${selectors.join(",\n")} {\n${lines.join("\n")}\n}\n`;
};

const buildNodes = (nodes, context = "") => {
  let out = "";

  for (const n of nodes) {
    if (n.at) {
      const inner = buildNodes(n.children, `${context}${n.at}`);
      if (inner.trim()) out += `${n.at} {\n${inner.split("\n").map((l) => (l ? "  " + l : l)).join("\n")}}\n`;
    } else {
      out += buildRule(n, context);
    }
  }

  return out;
};

// ---------- run ----------
let css = `/* AUTO-GENERATED by scripts/generate-dark.mjs. Do not edit by hand: change src/dark.css instead.
   Dark-mode versions of every light colour in the other stylesheets. */\n\n`;
let rules = 0;

for (const file of FILES) {
  const text = stripComments(fs.readFileSync(path.join(src, file), "utf8"));
  const body = buildNodes(parseBlock(text));
  rules += (body.match(/\{/g) || []).length;
  css += `/* ---- ${file} ---- */\n${body}\n`;
}

fs.writeFileSync(path.join(src, "dark-auto.css"), css);
console.log(`dark-auto.css written: ${rules} blocks, ${(css.length / 1024).toFixed(0)} KB`);
