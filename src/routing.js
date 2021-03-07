/**
  @typedef {(to: number | string, x?: { state: object, replace?: boolean }) => void} Navigate
  @typedef {{
    location: { pathname: string, search: string, hash: string, state?: object },
    navigate: Navigate
  }} Location
  @typedef {{
    basePath: string,
    routeMap: object,
    currentRoute?: object,
    params: object,
  }} RouteContext
*/
/**
  @template {unknown} T
  @typedef {Parameters<(route: string, createChildren: ((params: object) => T) | T) => void>} Route<T>
*/

import { createHistory } from './history'
import { callOrReturn } from './utils'
import { asRouteMap, pick, routeSymbol, interpolate, extractChildren, mapRouteChildren } from './routeMap'

/** @type {React.Context<Location | undefined>} */
const locationContext = React.createContext(undefined)
/** @type {React.Context<RouteContext | undefined>} */
const routeContext = React.createContext(undefined)

const inBrowser = typeof window !== 'undefined'

export { pick, asRouteMap, routeSymbol, interpolate }

const wrappedRouteSymbol = Symbol('wrappedRouteSymbol')

// TODO: eslint plugin for key warning of pairs
/** @returns {{
  routes<T>(...routes: Array<Route<T>>): JSX.Element,
  route<T>(...route: Route<T>): JSX.Element
}}
*/
export function useRouting() {
  const pick = usePick()

  return { route, routes }

  function route(...route) { return routes(route) }
  function routes(...routes) {
    const mappedRoutes = routes.map(([route, createChildren]) =>
      [route, params => <ContexProvider {...{ route, params, createChildren }} />]
    )

    return pick(...mappedRoutes)
  }
}

export function useLocation() {
  const context = React.useContext(locationContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a location')
  return context.location
}

export function useNavigate() {
  const context = React.useContext(locationContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a navigate function')
  return context.navigate
}

export function useRouteContext() {
  const context = React.useContext(routeContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a context')
  return context
}

export function useRoutes() {
  const { routeMap, currentRoute = {}, params } = useRouteContext()
  const withParams = partiallyApplyReverseRoutes(currentRoute, params)
  const hasChildren = Boolean(extractChildren(currentRoute).length)
  return hasChildren ? withParams : routeMap
}

export function useRouteMap() {
  return useRouteContext().routeMap
}

export function useHistory() {
  const history = React.useMemo(
    () => inBrowser ? createHistory() : new DoNotUseHistoryOnServerSide(),
    []
  )

  return history

  function DoNotUseHistoryOnServerSide() {}
}

export function usePick() {
  const { pathname } = useLocation()
  const { basePath, routeMap } = useRouteContext()

  return React.useCallback(
    (...routes) => {
      const availableRoutes = new Map(
        routes.map(([route, x]) => [route[wrappedRouteSymbol] || route, x])
      )
      const relativePathname = pathname.replace(basePath, '')
      return pick(relativePathname, [routeMap, selectRoute])

      function selectRoute(params, route) {
        const { parent } = route[routeSymbol]
        return (
          availableRoutes.has(route) ? availableRoutes.get(route)(params) :
          parent ? selectRoute(params, parent) :
          null
        )
      }
    },
    [basePath, pathname, routeMap]
  )
}

export function LocationProvider({
  basePath = '',
  initialLocation = undefined,
  routeMap,
  children: originalChildren,
}) {
  const children = <RootContextProvider
    children={originalChildren}
    {...{ routeMap, basePath }}
  />

  return inBrowser
    ? <BrowserLocationProvider {...{ children, basePath }} />
    : <ServerLocationProvider {...{ children, initialLocation }} />
}

export function Link({
  to,
  replace = undefined,
  state: newState = undefined,
  anchorProps = {},
  children
}) {
  if (typeof to !== 'string') throw new Error(`Parameter 'to' passed to link is not a string: ${to}`)
  const { basePath } = useRouteContext()
  const navigate = useNavigate()
  const location = useLocation()
  const href = resolve(basePath, to)

  return <a
    {...anchorProps}
    {...{ href, children, onClick }}
  />

  function onClick(e) {
    if (anchorProps.onClick) anchorProps.onClick(e)
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
  const history = React.useMemo(createHistory, [])
  const [location, setLocation] = React.useState(() => history.location)

  React.useEffect(
    () => history.listen(({ location }) => setLocation(location)),
    [history]
  )

  const value = React.useMemo(
    () => ({
      location,
      navigate(to, ...rest) {
        return history.navigate(typeof to === 'string' ? resolve(basePath, to) : to, ...rest)
      }
    }),
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

function RootContextProvider({ children, routeMap, basePath }) {
  const contextRef = React.useRef(routeMap)
  if (contextRef.current !== routeMap) throw new Error('Make sure the given context is stable (does not mutate between renders)')

  const value = React.useMemo(
    () => ({ basePath, routeMap, params: {} }),
    [routeMap],
  )
  return <routeContext.Provider {...{ value, children }} />
}

function ContexProvider({ route, params, createChildren }) {
  const { basePath, routeMap } = useRouteContext()
  const paramsRef = React.useRef(null)
  paramsRef.current = params // params might not be a stable value

  const value = React.useMemo(
    () => ({ basePath, routeMap, currentRoute: route, params: paramsRef.current }),
    [basePath, route]
  )
  const children = callOrReturn(createChildren, params)

  return <routeContext.Provider {...{ value, children }} />
}

function resolve(basePath, to) {
  return to.startsWith('/') ? to : `${basePath}/${to}`
}

function partiallyApplyReverseRoutes(route, availableParams) {
  return Object.assign(
    reverseRouting,
    mapRouteChildren(route, x => partiallyApplyReverseRoutes(x, availableParams)),
    { [wrappedRouteSymbol]: route }
  )

  function reverseRouting(params) {
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
