/*
  Principles
  - Artibrary keys:
    - The structure should reflect path structure.
    - The names of the keys do not need to be the related to the actual paths, they are for the
      developers.
    - Paths change over time and should not result in changing the code.
    - Multiple paths can be attached to a single item (localization).
  - Central location of path related information (title, data, ...)
  - Allow segmentation (sub-objects available to sub-components)
  - Should be compatible with component thinking
*/
import { pick, interpolate, callOrReturn } from './matching'

export const routeSymbol = Symbol('routeSymbol')

export function asRouteMap(map) { return addParentPaths(normalize(map)) }

export function pickFromRouteMap(pathname, [routeMap, defaultHandler], ...overrides) {
  if (!routeMap[_]) throw new Error('Please wrap normalize your routeMap using the `asRouteMap` function')
  const routes = routeToRoutes(routeMap, defaultHandler, overrides)
  return pick(pathname, ...Object.entries(routes))

  function routeToRoutes(route, defaultHandler, overrides, base = '') {
    const { children, route: { path } } = splitChildren(route)
    if (path) {
      const [override, handler] = overrides.find(([x]) => x === route) || []
      const absolutePath = makePathAbsolute(path, base)
      return {
        [absolutePath]: params => callOrReturn(
          override ? handler : defaultHandler,
          { ...params, route }
        ),
        ...routeChildrenToRoutes(children, absolutePath),
      }
    }  else return routeChildrenToRoutes(children, base)

    function routeChildrenToRoutes(children, base) {
      return Object.values(children).reduce(
        (result, child) => ({ ...result, ...routeToRoutes(child, defaultHandler, overrides, base) }),
        {}
      )
    }
  }
}

export function extractPathFromRoute(route) {
  if (!route.hasOwnProperty(_)) throw new Error(`It seems the route '${JSON.stringify(route)}' is not from the route map`)
  const { children, route: { [routeSymbol]: { parentPaths }, path } } = splitChildren(route)
  const abs = [...parentPaths, path].reduce(
    (base, path) => makePathAbsolute(path, base),
    ''
  )
  return `${abs}${Object.keys(children).length ? '/*' : ''}`

}

export function determineNestedContextForRoute(context, route) {
  const { children } = splitChildren(route)
  return {
    root: context.root,
    path: addParentPathsToChildren(children),
  }
}

function normalize({ path, meta, data, ...children }) {
  return withReverseRouting({ [routeSymbol]: {}, path, meta, data, ...normalizeChildren(children) })

  function normalizeChildren(children) {
    return mapValues(children, child =>
      normalize(typeof child === 'string' ? { path: child } : child)
    )
  }
}

function withReverseRouting(route) {
  const { [routeSymbol]: { parentPaths = [] }, path } = route
  return Object.assign(reverseRoute, route)

  function reverseRoute(params) {
    return [...parentPaths, path].reduce(
      (base, path) => {
        return (
          base && typeof base === 'object' ? resolveBaseObject(path, base, params) :
          path && typeof path === 'object' ? resolvePathObject(path, base, params) :
          resolve(path, base, params)
        )
      },
      ''
    )

    function resolveBaseObject(path, base, params) {
      return mapValues(base, (base, k) => resolve(path[k] || path, base, params))
    }

    function resolvePathObject(path, base, params) {
      return mapValues(path, path => resolve(path, base, params))
    }

    function resolve(path, base, params) {
      const pathValue = interpolate(path, params)
      return base ? `${base}/${pathValue}` : pathValue
    }
  }
}

function makePathAbsolute(path, base) {
  return (
    base && path ? `${base}/${pathAsString(path)}` :
    base ? base :
    path ? pathAsString(path) :
    path
  )

  function pathAsString(path) {
    return (
      typeof path === 'string' ? path :
      path ? `(?:${Object.values(path).join('|')})` :
      path
    )
  }
}


function addParentPaths(route, parentPaths = []) {
  const { children, route: { path, meta, data } } = splitChildren(route)
  return withReverseRouting({
    [routeSymbol]: { parentPaths },
    path, meta, data,
    ...addParentPathsToChildren(children, parentPaths.concat(path || []))
  })
}

function addParentPathsToChildren(children, parentPaths = []) {
  return mapValues(children, child => addParentPaths(child, parentPaths))
}

function mapValues(x, f) {
  return Object.entries(x)
    .map(([k, v]) => [k, f(v, k, x)])
    .reduce((result, [k, v]) => ({ ...result, [k]: v }), {})
}

function splitChildren(route) {
  const { [routeSymbol]: internal, path, meta, data, ...children } = route
  return { route, children }
}
