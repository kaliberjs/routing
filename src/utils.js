export function callOrReturn(x, ...args) {
  return typeof x === 'function' ? x(...args) : x
}

/**
 * @template {{ [k: string]: any }} A
 * @template {(v: A[keyof A & string], k: keyof A & string, x: A) => any} B
 *
 * @param {A} x
 * @param {B} f
 *
 * @returns {{ [P in keyof x]: ReturnType<B> }}
 */
export function mapValues(x, f) {
  // @ts-ignore
  return Object.entries(x)
    // eslint-disable-next-line no-return-assign
    .reduce((result, [k, v]) => (result[k] = f(v, k, x), result), {})
}

export function throwError(e) { throw new Error(e) }
