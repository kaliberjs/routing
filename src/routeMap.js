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
  const localeParamName = config.languageParamName || 'language'
  const result = pickFromChildren(pathSegments, children, localeParamName)
  return result ? result : null
}

export function asRouteChain(route) {
  if (!route) return []
  return asRouteChain(route[routeSymbol].parent).concat(route)
}

function interpolate(routePath, params) {
  return routePath
    .replace(/:([^/]+)/g, (_, paramName) => {
      const newValue = params[paramName]
      if (!newValue) throw new Error(`Could not find value for '${paramName}'`)
      return newValue
    })
    .replace(/(\*)/, () => params['*'] || '')
}

function pickFromChildren(pathSegments, children, localeParamName, previousParams = {}) {
  const locale = previousParams[localeParamName]

  for (const route of children) {
    const { match, children } = route[routeSymbol]

    const info = match(pathSegments, locale)
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
      remainingSegments, children, localeParamName, combinedParams
    )
    if (resultFromChildren)
      return resultFromChildren

    if (!hasRemainingSegments)
      return { params: combinedParams, route }
  }
}


function determineRouteMatcher(routePath) {
  return typeof routePath === 'string'
    ? createPathMatcher(routePath)
    : createLocalizedPathMatcher(routePath)
}

function createPathMatcher(routePath) {
  const routeSegments = routePath.split('/').filter(Boolean)
  const segmentMatchers = routeSegments.map(createSegmentMatcher)

  return (pathSegments, locale) => {
    const params = {}
    let remainingSegments = pathSegments

    for (const matcher of segmentMatchers) {
      const match = matcher(remainingSegments)
      if (!match)
        return

      Object.assign(params, match.params)
      remainingSegments = match.remainingSegments
    }

    return { params, remainingSegments }
  }
}

function createLocalizedPathMatcher(routePaths) {
  const matchers = mapValues(routePaths, createPathMatcher)

  return (pathSegments, locale) => {
    if (!locale)
      return

    const matcher = matchers[locale]
    if (!matcher)
      return

    return matcher(pathSegments, locale)
  }
}

function createSegmentMatcher(routeSegment) {
  return (
    routeSegment.startsWith(':') ? createParamMatcher(routeSegment.slice(1)) :
    routeSegment === '*' ? createWildcardMatcher() :
    createStaticMatcher(routeSegment)
  )
}

function createParamMatcher(paramName) {
  return ([segment, ...remainingSegments]) => segment && {
    params: { [paramName]: segment },
    remainingSegments,
  }
}

function createWildcardMatcher() {
  return remainingSegments => remainingSegments.length && {
    params: { '*': remainingSegments.join('/') },
    remainingSegments: []
  }
}

function createStaticMatcher(routeSegment) {
  return ([segment, ...remainingSegments]) => segment === routeSegment && {
    params: null,
    remainingSegments,
  }
}

function determineScore(path) {
  if (typeof path === 'string')
    return calculateScore(path)

  const scores = new Set(Object.values(path).map(calculateScore))
  if (scores.size > 1)
    throw new Error(
      `Paths in localized path object have different scores:\n` +
      JSON.stringify(path, null, 2)
    )

  const [score] = Array.from(scores)
  return score
}

function calculateScore(path) {
  const routeSegments = path.split('/')
  return routeSegments.reduce(
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

  const match = determineRouteMatcher(path)
  const score = determineScore(path)

  return withReverseRoute(config, {
    ...children,
    toString() { return name },
    path,
    data,
    [routeSymbol]: {
      get parent() { return getParent() },
      children: asSortedArray(children),
      name,
      match,
      score,
    },
  })
}

function asSortedArray(children) {
  return Object.values(children).sort((a, b) => b[routeSymbol].score - a[routeSymbol].score)
}

function withReverseRoute(config, route) {
  const { trailingSlash = false, languageParamName = 'language' } = config
  return Object.assign(reverseRoute, route)

  function reverseRoute(params = {}) {
    const parentPaths = getParents(route).map(x => x.path)

    const resolvedPath = [...parentPaths, route.path].reduce(
      (base, path) => {
        const { [languageParamName]: language } = params
        const normalizedPath = normalizePath(path, language)
        if (normalizedPath === null) throwError(`Could not determine path from ${JSON.stringify(path)} with language ${language}`)
        return resolve(normalizedPath, base, params)
      },
      ''
    )

    return `${resolvedPath}${trailingSlash && !resolvedPath.endsWith('/') ? '/' : ''}`
  }
}

function normalizePath(path, language) {
  return (
    typeof path === 'string' ? path :
    language in path ? path[language] :
    null
  )
}

function resolve(path, base, params) {
  const pathValue = interpolate(path, params)
  return `${base}/${pathValue}`
}

function getParents({ [routeSymbol]: { parent } }) {
  return !parent ? [] : getParents(parent).concat(parent)
}
