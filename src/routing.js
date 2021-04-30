
import { getHistory } from './history'
import { callOrReturn, mapValues } from './utils'
import { pickRoute, routeSymbol } from './routeMap'

// Why so many contexts? Information should be grouped in a context based on the rate of change.
/**
  @typedef {{ pathname: string, search: string, hash: string, state?: object }} Location
  @type {
    React.Context<
      {
        location: Location,
        match: null | { params: object, route: Route },
      } |
      undefined
    >
  }
*/
const locationContext = React.createContext(undefined)
/** @type {React.Context<((to: number | string, x?: { state: object, replace?: boolean }) => void) | undefined>} */
const navigateContext = React.createContext(undefined)
/** @type {React.Context<{ basePath: string, routeMap: RouteMap } | undefined>} */
const rootContext = React.createContext(undefined)
/** @type {React.Context<Route | null>} */
const routeContext = React.createContext(null)

const inBrowser = typeof window !== 'undefined'

const wrappedRouteSymbol = Symbol('wrappedRouteSymbol')

// TODO: eslint plugin for key warning of pairs
/**
  @template {JSX.Element} T
  @typedef {[route: Route, createChildren: ((params: object) => T) | T]} RoutePair
  @returns {{
    matchRoutes<T>(...routes: Array<RoutePair<T>>): JSX.Element,
    matchRoute<T>(...route: RoutePair<T>): JSX.Element,
  }}
*/
export function useRouting() {
  const pick = usePick()

  return { matchRoute, matchRoutes }

  function matchRoute(...route) { return matchRoutes(route) }
  function matchRoutes(...routes) {
    const routeLookup = new Map(routes)

    const result = pick(...routeLookup.keys())
    if (!result) return null

    const { route, params } = result
    const children = callOrReturn(routeLookup.get(route), params)
    return <routeContext.Provider value={route[wrappedRouteSymbol] || route} {...{ children }} />
  }
}

export function useLocation() {
  const context = React.useContext(locationContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a location')
  return context.location
}

export function useMatch() {
  const context = React.useContext(locationContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a location')
  if (!context.match) return null

  const { params, route } = context.match
  return { params, route: partiallyApplyReverseRoutes(route, params) }
}

export function useNavigate() {
  const navigate = React.useContext(navigateContext)
  if (!navigate) throw new Error('Please use a `LocationProvider` to supply a navigate function')
  return navigate
}

export function useRootContext() {
  const context = React.useContext(rootContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a route root context')
  return context
}

export function useRoutes() {
  const { routeMap } = useRootContext()
  const currentRoute = useMatchedRoute()
  const match = useMatch()

  const hasChildren = currentRoute && Object.keys(currentRoute[routeSymbol].children).length
  const parent = currentRoute && currentRoute[routeSymbol].parent

  return (
    hasChildren ? currentRoute :
    parent && match ? partiallyApplyReverseRoutes(parent, match.params) :
    routeMap
  )
}

export function useMatchedRoute() {
  const currentRoute = React.useContext(routeContext)
  const match = useMatch()
  if (!currentRoute || !match) return null

  return partiallyApplyReverseRoutes(currentRoute, match.params)
}

export function useRouteMap() {
  return useRootContext().routeMap
}

export function useHistory() {
  return inBrowser ? getHistory() : new DoNotUseHistoryOnServerSide()

  function DoNotUseHistoryOnServerSide() {}
}

export function usePick() {
  const match = useMatch()

  return React.useCallback(
    (...routes) => {
      if (!match) return null

      const { params, route } = match
      const availableRoutes = new Map(
        routes.map(route => [route[wrappedRouteSymbol] || route, route])
      )
      return selectRoute(route, params)

      function selectRoute(possiblyWrappedRoute, params) {
        const route = possiblyWrappedRoute[wrappedRouteSymbol] || possiblyWrappedRoute
        const { parent } = route[routeSymbol]
        return (
          availableRoutes.has(route) ? { params, route: availableRoutes.get(route) } :
          parent ? selectRoute(parent, params) :
          null
        )
      }
    },
    [match]
  )
}

export function LocationProvider({
  basePath = '',
  initialLocation = undefined,
  routeMap,
  children,
}) {
  return <RootContextProvider {...{ routeMap, basePath }} children={inBrowser
    ? <BrowserLocationProvider {...{ children, basePath }} />
    : <ServerLocationProvider {...{ children, initialLocation }} />
  } />
}

export function Link({
  to,
  replace = undefined,
  state: newState = undefined,
  anchorProps = null,
  children
}) {
  if (typeof to !== 'string') throw new Error(`Parameter 'to' passed to link is not a string: ${to}`)
  const { basePath } = useRootContext()
  const navigate = useNavigate()
  const location = useLocation()
  const href = resolve(basePath, to)

  return <a
    {...anchorProps}
    {...{ href, children, onClick }}
  />

  function onClick(e) {
    if (anchorProps && anchorProps.onClick) anchorProps.onClick(e)
    if (shouldNavigate(e)) {
      e.preventDefault()
      const { pathname, state: currentState } = location
      const shouldReplace = replace === undefined
        ? pathname === encodeURI(href) && shallowEqual(currentState || {}, newState || {})
        : replace

      navigate(to, { replace: shouldReplace, state: newState })
    }
  }
}

function BrowserLocationProvider({ children, basePath }) {
  const history = getHistory()
  const [location, setLocation] = React.useState(() => history.location)

  React.useEffect(
    () => history.listen(({ location }) => setLocation(location)),
    [history]
  )

  const navigate = React.useCallback((to, ...rest) =>
    history.navigate(typeof to === 'string' ? resolve(basePath, to) : to, ...rest),
    [history, basePath]
  )

  return <navigateContext.Provider
    value={navigate}
    children={<LocationAndMatchContext {...{ location, children} } />}
  />
}

function ServerLocationProvider({ initialLocation: location, children }) {
  if (!location) throw new Error(`Your need to supply an initial location on server side rendering`)

  const navigate = React.useCallback(
    () => { throw new Error('You can not navigate on the server') },
    []
  )

  return <navigateContext.Provider
    value={navigate}
    children={<LocationAndMatchContext {...{ location, children} } />}
  />
}

/** @param {{ location: Location, children: any }} location */
function LocationAndMatchContext({ location, children }) {
  const { routeMap, basePath } = useRootContext()
  const value = React.useMemo(
    () => {
      const normalizedPathname = location.pathname.replace(basePath, '')
      return { location, match: pickRoute(normalizedPathname, routeMap) }
    },
    [location, routeMap, basePath]
  )
  return <locationContext.Provider {...{ value, children }} />
}

function RootContextProvider({ children, routeMap, basePath }) {
  const contextRef = React.useRef(routeMap)
  if (contextRef.current !== routeMap) throw new Error('Make sure the given context is stable (does not mutate between renders)')

  const value = React.useMemo(
    () => ({ basePath, routeMap }),
    [routeMap, basePath],
  )
  return <rootContext.Provider {...{ value, children }} />
}

function resolve(basePath, to) {
  return `${basePath}${to}`
}

/* TODO we now apply all available params, in some cases we are higher up
   in the route tree. Should we only supply the params up to that point?

   If we are in a component that renders /en/articles while viewing
   /en/articles/article1. Should the route to lang.articles.article()
   have prefilled { lang: 'en' } or { lang: 'en', aricleId: 'article1' }?
*/
function partiallyApplyReverseRoutes(route, availableParams) {
  if (route[wrappedRouteSymbol]) throw new Error('Can not partially apply a partially applied route')

  return Object.assign(
    partiallyAppliedReverseRoute,
    route,
    mapValues(route[routeSymbol].children, x => partiallyApplyReverseRoutes(x, availableParams)),
    { [wrappedRouteSymbol]: route }
  )

  function partiallyAppliedReverseRoute(params) {
    return route({ ...availableParams, ...params })
  }
}

function shallowEqual(o1, o2) {
  const o1Keys = Object.keys(o1)
  return (
    o1Keys.length === Object.keys(o2).length &&
    o1Keys.every(key => o2.hasOwnProperty(key) && o1[key] === o2[key])
  )
}

function shouldNavigate(e) {
  return (
    !e.defaultPrevented &&
    e.button === 0 &&
    !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
  )
}
