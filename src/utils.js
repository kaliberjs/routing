export function callOrReturn(x, ...args) {
  return typeof x === 'function' ? x(...args) : x
}

/**
 * @template {{}} A
 * @template {(v: A[keyof A], k: keyof A, x: A) => B} B
 *
 * @param {A} x
 * @param {B} f
 *
 * @returns {{ [k: keyof x]: B }}
 */
export function mapValues(x, f) {
  return Object.entries(x)
    .map(([k, v]) => [k, f(v, k, x)])
    .reduce((result, [k, v]) => ({ ...result, [k]: v }), {})
}

export function throwError(e) { throw new Error(e) }
