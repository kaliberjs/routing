// TODO: we need some tests for this one
export function pick(pathname, ...routes) {
  const convertedRoutes = routes.map(([routePath, onMatch]) => {
    if (typeof routePath !== 'string') throw new Error(`Unexpected non-string value '${routePath}' (${routePath.constructor.name}) in routes`)
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

export function callOrReturn(x, ...args) {
  return typeof x === 'function' ? x(...args) : x
}

match.cache = {}
function match(pathname, { regExp, paramNames }) {
  const { cache } = match
  const key = `${pathname}_${regExp}`
  if (cache[key]) return cache[key]

  const matched = regExp.exec(pathname)

  const result = matched && matched.slice(1).reduce(
    (result, value, i) => ({ ...result, [paramNames[i]]: decodeURIComponent(value) }),
    {}
  )
  return (cache[key] = result)
}

routePathToRegex.cache = {}
function routePathToRegex(routePath) {
  const { cache } = routePathToRegex
  if (cache[routePath]) return cache[routePath]

  const { string, paramNames, score } = routePath.split('/').reduce(
    ({ string, paramNames, score }, part, i) => {
      if (!part) return { string, paramNames }

      const [partString, paramName, partScore] = (
        part === '*' ? ['(.*)', '*', 2] :
        part.startsWith(':') ? ['/([^/]+)', part.slice(1), 4] :
        [`/${part}`, '', 8]
      )

      return {
        string: `${string}${partString}`,
        paramNames: paramNames.concat(paramName || []),
        score: score + (partScore / (i + 1)),
      }
    },
    {
      string: '',
      paramNames: [],
      score: 0,
    }
  )
  const regExp = new RegExp(`^${string}/?$`)
  return (cache[routePath] = { regExp, paramNames, score })
}
