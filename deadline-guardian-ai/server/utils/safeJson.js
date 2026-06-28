/*
 * safeJson - tolerant JSON helpers for the secure AI backend.
 *
 * SECURE ARCHITECTURE: Frontend -> Backend API Route -> Gemini.
 * This module lives on the SERVER. It parses model output defensively so a
 * malformed Gemini reply can never crash the request handler.
 */

/**
 * Tolerantly parse a model JSON reply. Strategy:
 *   1. Strip any ```json / ``` code fences and surrounding whitespace.
 *   2. Try a direct JSON.parse (the happy path - Gemini returned clean JSON).
 *   3. If that fails, extract the outermost {...} or [...] block from any
 *      surrounding prose and parse that.
 *   4. If everything fails, return the provided fallback (never throws).
 *
 * @param {string} text       Raw text returned by the model.
 * @param {*}      fallback   Value to return when parsing is impossible.
 */
export function safeParseJSON(text, fallback = null) {
  if (typeof text !== 'string') return fallback;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 1) Happy path: the model returned clean JSON.
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to extraction */
  }

  // 2) Recovery: pull the first {...} / [...] block out of mixed text.
  const first = cleaned.search(/[{[]/);
  const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** True for a non-null, non-array object. */
export function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Backfill missing top-level fields of a parsed object from a fallback shape so
 * the response always matches the contract the UI expects.
 */
export function withFallbackShape(parsed, fallbackData) {
  if (isPlainObject(parsed) && isPlainObject(fallbackData)) {
    return { ...fallbackData, ...parsed };
  }
  return parsed;
}
