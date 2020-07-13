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
import { interpolate } from './matching'

const _ = Symbol('route')

// we need this because when using overrides in `pick`
export function asRouteMap(map) {
  return normalize(map)
}

export function useRouteMap(map) {
  if (!map[_]) throw new Error(`Use asRouteMap`)
  const context = React.useMemo(
    () => {
      const withParentPaths = addParentPaths(map)
      return {
        root: withParentPaths,
        path: withParentPaths,
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
  if (!routeMap[_]) throw new Error('Please wrap normalize your routeMap using the `asRouteMap` function')
  const routes = routeToRoutes(routeMap, defaultHandler, overrides)
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
  return route({ [_]: {}, path, meta, data, ...normalizeChildren(children) })

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

// TODO: yean: clean this up
function route(info) {
  const { [_]: { parentPaths = [] }, path } = info
  return Object.assign(route, info)

  function route(params) {
    console.log(parentPaths, path)
    const x = [...parentPaths, path].reduce(
      (base = '', path) => {
        console.log(base, path)
        return (
          base && typeof base === 'object'
            ? Object.entries(base).reduce(
            (result, [k, base]) => {
              const pathValue = interpolate(path[k] || path, params)
              return {
                ...result,
                [k]: base ? `${base}/${pathValue}` : pathValue
              }
            },
            {}
          )
          : (
            path && typeof path === 'object'
              ? Object.entries(path).reduce(
                (result, [k, path]) => ({
                  ...result,
                  [k]: base ? `${base}/${interpolate(path, params)}` : interpolate(path, params)
                }),
                {}
              )
              : base ? `${base}/${interpolate(path, params)}` : interpolate(path, params)
          )
        )
      },
      ''
    )

    console.log('x', x)
    return x
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

function addParentPaths({ [_]: internal, path, meta, data, ...children }, parentPaths = []) {
  return route({
    [_]: { parentPaths }, path, meta, data,
    ...addParentPathsToChildren(children, parentPaths.concat(path || []))
  })
}

function addParentPathsToChildren(children, parentPaths = []) {
  return Object.entries(children).reduce(
    (result, [k, v]) => ({ ...result, [k]: addParentPaths(v, parentPaths)}),
    {}
  )

}

function extractPath(route) {
  if (!route.hasOwnProperty(_)) throw new Error(`It seems the route '${JSON.stringify(route)}' is not from the route map`)
  const { [_]: { parentPaths }, path, meta, data, ...children } = route
  const abs = [...parentPaths, path].reduce(
    (base, path) => makePathAbsolute(path, base),
    ''
  )
  return `${abs}${Object.keys(children).length ? '/*' : ''}`

}

function determineNestedContext(context, { [_]: internal, path, meta, data, ...children }) {
  return {
    root: context.root,
    path: addParentPathsToChildren(children),
  }
}
