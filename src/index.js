import { createHistory } from './history'

/** @typedef {(to: number | string, x?: { state: object, replace?: boolean }) => void} Navigate */
/**
  @typedef {{
    location: {
      pathname: string,
      search: string,
      hash: string,
    },
    navigate: Navigate
  }} Location
  @type {React.Context<Location | undefined>}
*/
const locationContext = React.createContext(undefined)
/**
  @typedef {{
    basePath: string,
    navigate: Navigate,
    baseParams: {},
  }} Base
  @type {React.Context<Base | undefined}
 */
const baseContext = React.createContext(undefined)
const inBrowser = typeof window !== 'undefined'

// eslint-disable-next-line @kaliber/naming-policy
export function LocationProvider({ initialLocation = undefined, children: originalChildren }) {
  const children = <BaseContextProvider children={originalChildren} />
  return inBrowser
    ? <BrowserLocationProvider {...{ children }} />
    : <ServerLocationProvider {...{ children, initialLocation }} />
}

function BaseContextProvider({ basePath = undefined, baseParams = undefined, children }) {
  const { navigate } = React.useContext(locationContext)
  const value = React.useMemo(
    () => ({ basePath: basePath || '', baseParams: baseParams || {}, navigate }),
    [basePath, baseParams, navigate],
  )
  return <baseContext.Provider {...{ value, children }} />
}

export function useLocation() {
  const context = React.useContext(locationContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a location')
  return context.location
}

export function useNavigate() {
  const context = React.useContext(baseContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a navigate function')
  return context.navigate
}

export function useRouting({ initialLocation = undefined } = {}) {
  return {
    pick(...routes) { return <Routing {...{ routes, initialLocation }} /> }
  }
}

function Routing({ routes, initialLocation }) {
  const context = React.useContext(locationContext)
  const children = <RoutingImpl {...{ routes }} />
  return context ? children : <LocationProvider {...{ children, initialLocation }} />
}

function RoutingImpl({ routes }) {
  const { pathname } = useLocation()
  const { basePath } = React.useContext(baseContext)
  const relativePathname = pathname.replace(basePath, '')

  const mappedRoutes = routes.map(([routePath, onMatch]) =>
    [routePath, params => <LocalBaseContex {...{ routePath, params, onMatch }} />]
  )

  return pick(
    relativePathname,
    ...mappedRoutes,
  )
}

function LocalBaseContex({ routePath, params, onMatch }) {
  const { basePath, baseParams } = React.useContext(baseContext)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const value = React.useMemo(
    () => {
      const newBasePath = `${basePath}${pathname.replace(new RegExp(`${params['*']}$`), '')}`
      return {
        // basePath: `${basePath}${routePath}`, // we might want to keep this route path
        basePath: newBasePath,
        baseParams: { ...baseParams, ...params },
        navigate: (to, x) => navigate(to.startsWith('/') ? to : `${newBasePath}/${to}`, x)
      }
    },
    [basePath, routePath, navigate, params, baseParams]
  )
  return (
    <baseContext.Provider
      {...{ value }}
      children={call(onMatch, value.baseParams)}
    />
  )
}

// TODO: eslint plugin for key warning of pairs

// TODO: we need some tests for this one
export function pick(pathname, ...routes) {
  for (const [path, onMatch] of routes) {
    const matched = match(pathname, path)
    if (matched) return call(onMatch, matched)
  }
  return null
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
        part === '*' ? ['(.+)', '*'] :
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

function call(x, ...args) {
  return typeof x === 'function' ? x(...args) : x
}

function BrowserLocationProvider({ children }) {
  const history = React.useMemo(createHistory, [])
  const [location, setLocation] = React.useState(() => history.location)

  React.useEffect(
    () => history.listen(({ location }) => setLocation(location)),
    [history]
  )

  const value = React.useMemo(
    () => ({ location, navigate: history.navigate }),
    [location, history]
  )

  return <locationContext.Provider {...{ value, children }} />
}

function ServerLocationProvider({ initialLocation, children }) {
  if (!initialLocation) throw new Error(`Your need to supply an initial location on server side rendering`)
  const value = React.useMemo(
    () => ({
      location: initialLocation,
      navigate: () => { throw new Error('You can not navigate on the server') }
    }),
    [initialLocation]
  )

  return <locationContext.Provider {...{ value, children }} />
}

// TODO: check Reach router for a better implementation
export function Link({ to, children }) {
  const context = React.useContext(baseContext)
  // we could do the same trick as with `useRouter` where we wrap a location provider to get a navigate function if it doesnt exist
  const { basePath = '/', navigate } = context || {}
  const href = to.startsWith('/') ? to : `${basePath}/${to}`
  return <a {...{ href, children, onClick }} />

  function onClick(e) {
    e.preventDefault()
    navigate(to)
  }
}
