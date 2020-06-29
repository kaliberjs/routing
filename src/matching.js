// TODO: we need some tests for this one
export function pick(pathname, ...routes) {
  for (const [path, onMatch] of routes) {
    if (typeof path !== 'string') throw new Error(`Unexpected non-string value '${path}' in routes`)
    const matched = match(pathname, path)
    if (matched) return callOrReturn(onMatch, matched)
  }
  return null
}

export function callOrReturn(x, ...args) {
  return typeof x === 'function' ? x(...args) : x
}

match.cache = {}
function match(pathname, routePath) {
  const { cache } = match
  const key = `${pathname}_${routePath}`
  if (cache[key]) return cache[key]

  const { regExp, paramNames } = routePathToRegex(routePath)

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

  const { string, paramNames } = routePath.split('/').reduce(
    ({ string, paramNames }, part) => {
      if (!part) return { string, paramNames }

      const [partString, paramName] = (
        part === '*' ? ['(.*)', '*'] :
        part.startsWith(':') ? ['/([^/]+)', part.slice(1)] :
        [`/${part}`, '']
      )

      return {
        string: `${string}${partString}`,
        paramNames: paramNames.concat(paramName || []),
      }
    },
    {
      string: '',
      paramNames: [],
    }
  )
  const regExp = new RegExp(`^${string}/?$`)
  return (cache[routePath] = { regExp, paramNames })
}
