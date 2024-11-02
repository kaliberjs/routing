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
import { callOrReturn, mapValues, throwError } from './utils'

export const routeSymbol = Symbol('routeSymbol')
export const routeMapSymbol = Symbol('routeMapSymbol')

export function asRouteMap(map, config = {}) {
  config.localeParamName = config.languageParamName || 'language'
  config.trailingSlash = config.trailingSlash || false
  const children = normalizeChildren(config, map)
  return {
    ...children,
    [routeMapSymbol]: { children: asSortedArray(children), config }
  }
}

export function pick(pathname, [routeMap, defaultHandler], ...overrides) {
  const result = pickRoute(pathname, routeMap)
  if (!result) return null

  const { route, params } = result
  const [override, handler] = overrides.find(([x]) => x === route) || []
  return callOrReturn(override ? handler : defaultHandler, params, route)
}

export function pickRoute(pathname, routeMap) {
  if (!routeMap.hasOwnProperty(routeMapSymbol))
  throw new Error('Please normalize your routeMap using the `asRouteMap` function')

  const pathSegments = pathname.split('/').filter(Boolean)
  const { children, config } = routeMap[routeMapSymbol]
  const result = pickFromChildren(pathSegments, children)
  return result ? result : null
}

export function asRouteChain(route) {
  if (!route) return []
  return asRouteChain(route[routeSymbol].parent).concat(route)
}

function pickFromChildren(pathSegments, children, previousParams = {}) {
  for (const route of children) {
    const { match, children } = route[routeSymbol]

    const info = match(pathSegments, previousParams)
    if (!info)
      continue

    const { params, remainingSegments } = info

    const hasChildren = Boolean(children.length)
    const hasRemainingSegments = Boolean(remainingSegments.length)

    const potentialMatch = hasChildren || !hasRemainingSegments
    if (!potentialMatch)
      continue

    const combinedParams = { ...previousParams, ...params }
    const resultFromChildren = pickFromChildren(
      remainingSegments, children, combinedParams
    )
    if (resultFromChildren)
      return resultFromChildren

    if (!hasRemainingSegments)
      return { params: combinedParams, route }
  }
}

function determinePathInfo(routePath, config) {
  return typeof routePath === 'string'
    ? createPathInfo(routePath)
    : createLocalizedPathInfo(routePath, config)
}

function createPathInfo(routePath) {
  const routeSegments = routePath.split('/').filter(Boolean)
  const segmentFunctions = routeSegments.map(createSegmentFunctions)

  return {
    path(params) {
      let path = ''
      for (const segmentFunction of segmentFunctions) {
        path = `${path}/${segmentFunction.path(params)}`
      }
      return path
    },

    match(pathSegments) {
      const params = {}
      let remainingSegments = pathSegments

      for (const segmentFunction of segmentFunctions) {
        const match = segmentFunction.match(remainingSegments)
        if (!match)
          return

        Object.assign(params, match.params)
        remainingSegments = match.remainingSegments
      }

      return { params, remainingSegments }
    },

    score: calculateScore(routePath),
  }
}

function createSegmentFunctions(routeSegment) {
  return (
    routeSegment.startsWith(':') ? createParamFunctions(routeSegment.slice(1)) :
    routeSegment === '*' ? createWildcardFunctions() :
    createStaticFunctions(routeSegment)
  )
}

function createParamFunctions(paramName) {
  return {
    path: params => params[paramName],
    match: ([segment, ...remainingSegments]) => segment && {
      params: { [paramName]: segment },
      remainingSegments,
    },
  }
}

function createWildcardFunctions() {
  return {
    path: params => params['*'],
    match: remainingSegments => remainingSegments.length && {
      params: { '*': remainingSegments.join('/') },
      remainingSegments: []
    },
  }
}

function createStaticFunctions(routeSegment) {
  return {
    path: params => routeSegment,
    match: ([segment, ...remainingSegments]) => segment === routeSegment && {
      params: null,
      remainingSegments,
    }
  }
}

function createLocalizedPathInfo(routePaths, config) {
  const pathFunctions = mapValues(routePaths, createPathInfo)

  return {
    path(params) {
      const locale = params[config.localeParamName]
      if (!locale)
        throw new Error(`Could not determine locale, '${config.localeParamName}' is missing in params:\n${params}`)

      const pathFunction = pathFunctions[locale]
      if (!pathFunction)
        throw new Error(`Could not determine what path to use for locale '${locale}' in localized paths object:\n${routePaths}`)

      return pathFunction.path(params)
    },

    match(pathSegments, params) {
      const locale = params[config.localeParamName]
      if (!locale)
        return

      const pathFunction = pathFunctions[locale]
      if (!pathFunction)
        return

      return pathFunction.match(pathSegments)
    },

    score: determineScore(routePaths)
  }
}

function determineScore(routePaths) {
  const scores = new Set(Object.values(routePaths).map(calculateScore))
  if (scores.size > 1)
    throw new Error(
      `Paths in localized path object have different scores:\n` +
      JSON.stringify(routePaths, null, 2)
    )

  const [score] = Array.from(scores)
  return score
}

function calculateScore(path) {
  const routeSegments = path.split('/')
  let totalScore = 0

  for (const [i, segment] of routeSegments.entries()) {
    const score =
      segment === '*' ? -2 :
      segment.startsWith(':') ? 4 :
      8

    totalScore += score / (i + 1)
  }

  return totalScore
}

function withReverseRoute(config, route) {
  const pathEnd = config.trailingSlash ? '/' : ''
  return Object.assign(reverseRoute, route)

  function reverseRoute(params = {}) {
    let resolvedPath = ''
    let currentRoute = route

    do {
      const { path, parent } = currentRoute[routeSymbol]
      resolvedPath = path(params) + resolvedPath
      currentRoute = parent
    } while (currentRoute)

    return resolvedPath ? resolvedPath + pathEnd : '/'
  }
}

function normalizeChildren(config, children, getParent = () => null, parentName = '') {
  return mapValues(children, (childOrPath, key) => {
    const route = typeof childOrPath === 'string' ? { path: childOrPath } : childOrPath
    return normalize(config, route, getParent, parentName ? `${parentName}.${key}` : key)
  })
}

function normalize(config, routeInput, getParent, name) {
  const { path, data = undefined, ...children } = routeInput
  if (path === undefined) throw new Error(`No path found in ${JSON.stringify(routeInput)}`)

  const normalizedChildren = normalizeChildren(config, children, () => route, name)
  const route = createRoute(config, name, path, data, normalizedChildren, getParent)
  return route
}

function createRoute(config, name, path, data, children, getParent) {

  const info = determinePathInfo(path, config)

  return withReverseRoute(config, {
    ...children,
    toString() { return name },
    path,
    data,
    [routeSymbol]: {
      get parent() { return getParent() },
      children: asSortedArray(children),
      name,
      path: info.path,
      match: info.match,
      score: info.score,
    },
  })
}

function asSortedArray(children) {
  return Object.values(children).sort((a, b) => b[routeSymbol].score - a[routeSymbol].score)
}
