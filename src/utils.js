export function callOrReturn(x, ...args) {
  return typeof x === 'function' ? x(...args) : x
}

/**
 * @template {{ [key: string | number | symbol]: any }} O
 * @template {(v: O[keyof O], k: keyof O, o: O) => any} F
 *
 * @param {O} o
 * @param {F} f
 * @returns {{ [key in keyof O]: ReturnType<F> }}
 */
export function mapValues(o, f) {
  // @ts-ignore
  return Object.fromEntries(
    Object.entries(o).map(([k, v]) => [k, f(v, k, o)])
  )
}
