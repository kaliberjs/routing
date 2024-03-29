
import { getHistory } from './history'
import { callOrReturn } from './utils'
import { pickRoute, routeSymbol } from './routeMap'

// Why so many contexts? Information should be grouped in a context based on the rate of change.
/**
  @typedef {{ pathname: string, search: string, hash: string, state?: object, key: string }} Location
  @type {
    React.Context<
      {
        location: Location,
        locationMatch: null | { params: object, route: Route },
      } |
      undefined
    >
  }
*/
const locationAndLocationMatchContext = React.createContext(undefined)
/** @type {React.Context<((to: number | string, x?: { state?: object, replace?: boolean }) => void) | undefined>} */
const navigateContext = React.createContext(undefined)
/** @type {React.Context<{ basePath: string, routeMap: RouteMap } | undefined>} */
const rootContext = React.createContext(undefined)
/** @type {React.Context<Route | null>} */
const routeContext = React.createContext(null)

const inBrowser = typeof window !== 'undefined'

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
    return <routeContext.Provider value={route} {...{ children }} />
  }
}

export function useLocation() {
  const context = React.useContext(locationAndLocationMatchContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a location')
  return context.location
}

export function useLocationMatch() {
  const context = React.useContext(locationAndLocationMatchContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a location')
  if (!context.locationMatch) return null

  const { params, route } = context.locationMatch
  return { params, route }
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

export function useMatchedRoute() {
  const currentRoute = React.useContext(routeContext)
  if (!currentRoute) return null

  return currentRoute
}

export function useMatchedRouteData() {
  const currentRoute = useMatchedRoute()
  return currentRoute && currentRoute.data
}

export function useHistory() {
  return inBrowser ? getHistory() : new DoNotUseHistoryOnServerSide()

  function DoNotUseHistoryOnServerSide() {}
}

export function usePick() {
  const locationMatch = useLocationMatch()

  return React.useCallback(
    (...routes) => {
      if (!locationMatch) return null

      const { params, route } = locationMatch
      const availableRoutes = new Map(
        routes.map((route, i) => {
          if (!route) throw new Error(`Route missing at index ${i}`)
          return [route, route]
        })
      )
      return selectRoute(route, params)

      function selectRoute(route, params) {
        const { parent } = route[routeSymbol]
        return (
          availableRoutes.has(route) ? { params, route: availableRoutes.get(route) } :
          parent ? selectRoute(parent, params) :
          null
        )
      }
    },
    [locationMatch]
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

export function StaticLocationProvider({ location, children }) {
  if (!location) throw new Error(`Your need to supply a location for the static location provider`)
  const { location: locationLive } = React.useContext(locationAndLocationMatchContext)

  const navigateStatic = React.useCallback(
    () => { throw new Error('You can not navigate in a static location provider') },
    []
  )
  const navigateLive = React.useContext(navigateContext)

  return <navigateContext.Provider
    value={location === locationLive ? navigateLive : navigateStatic}
    children={<LocationAndLocationMatchContext {...{ location, children} } />}
  />
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

  React.useLayoutEffect(
    () => {
      setLocation(history.location) // user might have navigated

      return history.listen(({ location }) => setLocation(location))
    },
    [history]
  )

  const navigate = React.useCallback((to, ...rest) =>
    history.navigate(typeof to === 'string' ? resolve(basePath, to) : to, ...rest),
    [history, basePath]
  )

  return <navigateContext.Provider
    value={navigate}
    children={<LocationAndLocationMatchContext {...{ location, children} } />}
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
    children={<LocationAndLocationMatchContext {...{ location, children} } />}
  />
}

/** @param {{ location: Location, children: any }} location */
function LocationAndLocationMatchContext({ location, children }) {
  const { routeMap, basePath } = useRootContext()
  const value = React.useMemo(
    () => {
      const normalizedPathname = location.pathname.replace(basePath, '')
      return { location, locationMatch: pickRoute(normalizedPathname, routeMap) }
    },
    [location, routeMap, basePath]
  )
  return <locationAndLocationMatchContext.Provider {...{ value, children }} />
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

/**
 * @typedef {import('./types').Route} Route
 * @typedef {import('./types').RouteMap} RouteMap
 */
