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
import { pick as originalPick } from './index'

const isRoute = Symbol('route')

// we need this because when using overrides in `pick`
export function asRouteMap(map) {
  return normalize(map)
}

export function useRouteMap(map) {
  if (!map[isRoute]) throw new Error(`Use asRouteMap`)
  const context = React.useMemo(
    () => {
      const withAbs = addAbs(map)
      return {
        root: withAbs,
        path: withAbs,
      }
    },
    [map]
  )
  return {
    context,
    handlers: { extractPath, determineNestedContext }
  }
}

export function pick(pathname, [routeMap, defaultHandler], ...overrides) {
  if (!routeMap[isRoute]) throw new Error('Please wrap normalize your routeMap using the `asRouteMap` function')
  const routes = routeToRoutes(routeMap, defaultHandler, overrides)
  console.log('routes', routes)
  return originalPick(pathname, ...Object.entries(routes))

  function routeToRoutes(route, defaultHandler, overrides, base = '') {
    const { path, meta, data, ...children } = route
    if (path) {
      const [override, handler] = overrides.find(([x]) => x === route) || []
      const absolutePath = makePathAbsolute(path, base)
      return {
        [absolutePath]: override ? handler : defaultHandler,
        ...routeChildrenToRoutes(children, absolutePath),
      }
    }  else return routeChildrenToRoutes(children, base)

    function routeChildrenToRoutes(children, base) {
      return Object.entries(children).reduce(
        (result, [k, v]) => ({ ...result, ...routeToRoutes(v, defaultHandler, overrides, base) }),
        {}
      )
    }
  }
}

function normalize({ path, meta, data, ...children }) {
  return { [isRoute]: true, path, meta, data, ...normalizeChildren(children) }

  function normalizeChildren(children) {
    return Object.entries(children).reduce(
      (result, [k, v]) => {
        const route = normalize(typeof v === 'string' ? { path: v } : v)
        return { ...result, [k]: route }
      },
      {}
    )
  }
}

function makePathAbsolute(path, base) {
  return (
    base && path ? `${base}/${pathAsString(path)}` :
    base ? base :
    path ? pathAsString(path) :
    path
  )
}

function pathAsString(path) {
  return (
    typeof path === 'string' ? path :
    path ? `(?:${Object.values(path).join('|')})` :
    path
  )
}

function addAbs({ path, meta, data, abs: oldAbs, ...children }, base = '') {
  const abs = makePathAbsolute(path, base)
  return { path, abs, meta, data, ...addAbsToChildren(children, abs || base) }

  function addAbsToChildren(children, base) {
    return Object.entries(children).reduce(
      (result, [k, v]) => ({ ...result, [k]: addAbs(v, base)}),
      {}
    )
  }
}

function extractPath(routePath) {
  if (!routePath.hasOwnProperty('path')) throw new Error(`It seems the route '${JSON.stringify(routePath)}' is not from the route map`)
  const { path, abs, meta, data, ...children } = routePath
  return `${pathAsString(abs)}${Object.keys(children).length ? '/*' : ''}`
}

function determineNestedContext(context, { path, abs, meta, data, ...children }) {
  return {
    root: context.root,
    path: addAbs(children),
  }
}
