import { routeSymbol } from './routeMap.js'
/** @import { Route, RouteActiveOptions, RouteMatch } from './types.ts' */

/**
 * Finds the nearest requested route in the current root-to-leaf match.
 *
 * @template {Route} R
 * @param {{ params: object, route: Route } | null} locationMatch
 * @param {R[]} routes
 * @returns {RouteMatch<R> | null}
 */
export function pickMatchedRoute(locationMatch, routes) {
  if (!locationMatch) return null

  const requestedRoutes = new Set(routes.map((route, index) => {
    if (!route) throw new Error(`Route missing at index ${index}`)
    return route
  }))

  const route = findRequestedRoute(locationMatch.route, requestedRoutes)
  return route
    ? /** @type {RouteMatch<R>} */ ({ params: locationMatch.params, route })
    : null
}

/**
 * @template {Route} R
 * @param {{ params: object, route: Route } | null} locationMatch
 * @param {R} route
 * @param {RouteActiveOptions<R>} [options]
 */
export function routeIsActive(locationMatch, route, { exact = false, params = undefined } = {}) {
  if (!locationMatch) return false

  const matchesRoute = exact
    ? locationMatch.route === route
    : Boolean(pickMatchedRoute(locationMatch, [route]))

  return matchesRoute && (!params || objectIncludes(locationMatch.params, params))
}

/**
 * @template {Route} R
 * @param {Route} route
 * @param {Set<R>} requestedRoutes
 * @returns {R | null}
 */
function findRequestedRoute(route, requestedRoutes) {
  if (requestedRoutes.has(/** @type {R} */ (route))) return /** @type {R} */ (route)

  const parent = route[routeSymbol].parent
  return parent ? findRequestedRoute(parent, requestedRoutes) : null
}

function objectIncludes(value, subset) {
  return Object.entries(subset).every(([key, expected]) => value[key] === expected)
}
