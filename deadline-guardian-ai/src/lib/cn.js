/**
 * Tiny className joiner. Accepts strings, arrays, and falsy values.
 * Keeps component markup readable without pulling in a dependency.
 */
export function cn(...inputs) {
  return inputs
    .flat(Infinity)
    .filter(Boolean)
    .join(' ')
    .trim();
}
