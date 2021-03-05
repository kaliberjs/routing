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
import { interpolate } from './matching'
import { callOrReturn, mapValues, throwError } from './utils'

export const routeSymbol = Symbol('routeSymbol')
export const routeMapSymbol = Symbol('routeMapSymbol')

/**
 * TODO: move this to a type definition file and make it better, the outcome should not be generic
 * objects, but should reflect the exact structure.
 *
 * @typedef {{ [k: string]: any }} SimpleObject
 * @typedef {{ [k: string]: string }} StringyObject
 *
 * @typedef {SimpleObject} ParentData
 * @typedef {(props?: { params: StringyObject, data: ParentData }) => Promise<SimpleObject>} DataFunction
 * @typedef {{ [k: string]: RouteInput }} RouteInputChildren
 * @typedef {{
     path: string | { [language: string]: string }
     data?: DataFunction | SimpleObject
   }} BaseRoute
 * @typedef {string | BaseRoute | (BaseRoute & RouteInputChildren)} RouteInput
 *
 * @typedef {(params?: StringyObject) => string} ReverseRoute
 * @typedef {{ [k: string]: Route }} RouteChildren
 * @typedef {
     ReverseRoute &
     BaseRoute &
     RouteChildren &
     { [x: typeof routeSymbol]: { parentRoutes } }
  } Route
 *
 * @param {{ [k: string]: RouteInput }} map
 *
 * @returns {{ [k: string]: Route }}
 */
export function asRouteMap(map, language = undefined) {
  return {
    ...normalizeChildren(map, language),
    [routeMapSymbol]: true,
  }
}

export function pick(pathname, [routeMap, defaultHandler], ...overrides) {
  if (!routeMap.hasOwnProperty(routeMapSymbol))
    throw new Error('Please normalize your routeMap using the `asRouteMap` function')

  const pathSegments = pathname.split('/').filter(Boolean)
  const children = Object.values(routeMap)
  const result = pickFromChildren(pathSegments, children)
  if (!result) return null

  const { route, params } = result
  const [override, handler] = overrides.find(([x]) => x === route) || []
  return callOrReturn(override ? handler : defaultHandler, params, route)
}

function pickFromChildren(pathSegments, children, previousParams = {}) {
  const sortedChildren = sort(children)

  const match = matchRoute(pathSegments, sortedChildren)
  if (!match) return null

  const { route, info: { params, remainingSegments} } = match
  return remainingSegments.length
    ? pickFromChildren(remainingSegments, extractChildren(route), params)
    : { params: { ...previousParams, ...params }, route }
}

function matchRoute(pathSegments, children) {
  for (const route of children) {
    const routeSegments = route.path.split('/').filter(Boolean)

    const info = matchRouteSegments(routeSegments, pathSegments)
    if (!info) continue

    const hasChildren = Boolean(extractChildren(route).length)
    const validMatch = hasChildren || !info.remainingSegments.length
    if (validMatch) return { info, route }
  }
}

function matchRouteSegments(routeSegments, pathSegments) {
  return routeSegments.reduce(
    (result, routeSegment) => {
      if (!result) return

      const { params: previousParams, remainingSegments: segments } = result
      const match = matchRouteSegment(routeSegment, segments)
      if (!match) return

      const { params, remainingSegments } = match
      return { params: { ...previousParams, ...params }, remainingSegments }
    },
    { params: {}, remainingSegments: pathSegments }
  )
}

function matchRouteSegment(routeSegment, remainingSegments) {
  const [segment, ...newRemainingSegments] = remainingSegments

  const paramMatch = routeSegment.startsWith(':') && segment
  const wildcardMatch = routeSegment === '*'
  const staticMatch = segment === routeSegment

  return (wildcardMatch || paramMatch || staticMatch) && {
    params:
      paramMatch ? { [routeSegment.slice(1)]: segment } :
      wildcardMatch ? { '*': remainingSegments.join('/') } :
      staticMatch ? {} :
      throwError('Unexpected condition')
    ,
    remainingSegments: wildcardMatch ? [] : newRemainingSegments,
  }
}

function sort(children) {
  return children.sort((a, b) => score(b) - score(a))
}

function score(x) {
  return x.path.split('/').reduce(
    (previousScore, segment, i) => {
      const score =
        segment === '*' ? -2 :
        segment.startsWith(':') ? 4 :
        8

      return previousScore + (score / (i + 1))
    },
    0
  )
}

/** @param {RouteInputChildren | {}} children */
function normalizeChildren(children, language, getParent = () => null) {
  return mapValues(children, childOrPath => {
    const route = typeof childOrPath === 'string' ? { path: childOrPath } : childOrPath
    return normalize(route, language, getParent)
  })
}

/** @param {BaseRoute | (BaseRoute & RouteInputChildren)} routeInput */
function normalize(routeInput, language, getParent) {
  const { path, data = undefined, ...children } = routeInput
  if (path === undefined) throw new Error(`No path found in ${JSON.stringify(routeInput)}`)

  const normalizedPath =
    typeof path === 'string' ? path :
    language in path ? path[language] :
    throwError(`Could not find language '${language}' in ${JSON.stringify(path)}`)

  const route = withReverseRouting(
    {
      path: normalizedPath,
      data,
      ...normalizeChildren(children, language, () => route),
      [routeSymbol]: { get parent() { return getParent() } },
    },
    language
  )
  return route
}

function withReverseRouting(route, language) {
  return Object.assign(reverseRoute, route)

  function reverseRoute(params, { relativeTo = null } = {}) {
    const { path } = route
    const parentPaths = getParents(route, { upTo: relativeTo }).map(x => x.path)

    return [...parentPaths, path].reduce(
      (base, path) => path && typeof path === 'object'
        ? resolve(path[language], base, params)
        : resolve(path, base, params),
      ''
    )
  }
}

function resolve(path, base, params) {
  const pathValue = interpolate(path, params)
  return base ? `${base}/${pathValue}` : pathValue
}

function getParents({ [routeSymbol]: { parent } }, { upTo = null } = {}) {
  return !parent || parent === upTo ? [] : getParents(parent, { upTo }).concat(parent)
}

function extractChildren(route) {
  const { [routeSymbol]: internal, path, data, ...children } = route
  return Object.values(children)
}
