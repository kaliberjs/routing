import { callOrReturn } from './utils'

export function pick(pathname, ...routes) {
  const convertedRoutes = routes.map(routePair => {
    if (!Array.isArray(routePair)) throw new Error(`Route pair invalid. Got ${JSON.stringify(routePair)}, expected [routePath, onMatch]`)
    const [routePath, onMatch] = routePair
    if (typeof routePath !== 'string') throw new Error(`Unexpected non-string value '${routePath}' (${typeof routePath} - ${routePath && routePath.constructor && routePath.constructor.name}) in routes`)
    const { regExp, paramNames, score } = routePathToRegex(routePath)
    return { regExp, paramNames, onMatch, score }
  })

  const sortedRoutes = convertedRoutes.sort((a, b) => b.score - a.score)

  for (const {regExp, paramNames, onMatch } of sortedRoutes) {
    const matched = match(pathname, { regExp, paramNames })
    if (matched) return callOrReturn(onMatch, matched)
  }
  return null
}

export function interpolate(routePath, params) {
  return routePath
    .replace(/:([^/]+)/g, (_, paramName) => {
      const newValue = params[paramName]
      if (!newValue) throw new Error(`Could not find value for '${paramName}'`)
      return newValue
    })
    .replace(/(\*)/, () => params['*'] || '')
}

match.cache = {}
function match(pathname, { regExp, paramNames }) {
  const { cache } = match
  const key = `${pathname}_${regExp}`
  if (cache[key]) return cache[key]

  const matched = regExp.exec(pathname)

  const result = matched && matched.slice(1).reduce(
    (result, value, i) => ({ ...result, [paramNames[i]]: value }),//decodeURIComponent(value) }),
    {}
  )
  return result
  return (cache[key] = result)
}

routePathToRegex.cache = {}
function routePathToRegex(routePath) {
  const { cache } = routePathToRegex
  if (cache[routePath]) return cache[routePath]

  const { pattern, paramNames, score } = routePath.split('/').filter(Boolean).reduce(
    ({ pattern, paramNames, score }, part, i, parts) => {
      const isLastPart = i + 1 === parts.length
      const [partPattern, paramName, partScore] = (
        isLastPart && part === '*' ? ['(.*)', '*', -2] :
        part.startsWith(':') ? ['/([^/]+)', part.slice(1), 4] :
        [`/${part}`, '', 8]
      )

      const previousScore = i ? score : 0

      return {
        pattern: `${pattern}${partPattern}`,
        paramNames: paramNames.concat(paramName || []),
        score: previousScore + (partScore / (i + 1)),
      }
    },
    {
      pattern: '',
      paramNames: [],
      score: Number.MAX_SAFE_INTEGER, // we need the root path to win if it matches
    }
  )
  const regExp = new RegExp(`^${pattern}/?$`)
  return { regExp, paramNames, score }
  return (cache[routePath] = { regExp, paramNames, score })
}
