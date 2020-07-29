/**
  @typedef {(to: number | string, x?: { state: object, replace?: boolean }) => void} Navigate
  @typedef {{
    location: { pathname: string, search: string, hash: string, state?: object },
    navigate: Navigate
  }} Location
  @typedef {{
    basePath: string, baseParams: object, navigate: Navigate,
    context?: { root: object, path: object },
  }} Base
*/
/**
  @template {unknown} T
  @typedef {Parameters<(route: string, createChildren: ((params: object) => T) | T) => void>} Route<T>
*/

import { createHistory } from './history'
import { pick, callOrReturn, interpolate } from './matching'
import {
  asRouteMap, pickFromRouteMap,
  routeSymbol, extractPathFromRoute, determineNestedContextForRoute
} from './routeMap'

/** @type {React.Context<Location | undefined>} */
const locationContext = React.createContext(undefined)
/** @type {React.Context<Base | undefined>} */
const baseContext = React.createContext(undefined)

const inBrowser = typeof window !== 'undefined'

export { pick, interpolate, asRouteMap, pickFromRouteMap }

// TODO: eslint plugin for key warning of pairs
/** @returns {{
  routes<T>(...routes: Array<Route<T>>): JSX.Element,
  route<T>(...route: Route<T>): JSX.Element
  root?: object,
  path?: object,
}}
*/
export function useRouting() {
  const relativePick = useRelativePick()
  const context = useRouteContext()

  return {
    routes,
    route(...route) { return routes(route) },
    ...context,
  }

  function routes(...routes) {
    const mappedRoutes = routes.map(([route, createChildren]) =>
      [route, params => <NestedBaseContexProvider {...{ route, params, createChildren }} />]
    )

    return relativePick(...mappedRoutes)
  }
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

export function useRouteContext() {
  const context = React.useContext(baseContext)
  if (!context) throw new Error('Please use a `LocationProvider` to supply a context')
  return context.context
}

export function useHistory() {
  const history = React.useMemo(
    () => inBrowser ? createHistory() : new DoNotUseHistoryOnServerSide(),
    []
  )

  return history

  function DoNotUseHistoryOnServerSide() {}
}

export function useRelativePick() {
  const { pathname } = useLocation()
  const { basePath } = React.useContext(baseContext)

  const relativePick = React.useCallback(
    (...routes) => {
      const relativePathname = pathname.replace(basePath, '')
      return pick(
        relativePathname,
        ...routes.map(([route, createResult]) => [extractPath(route), createResult])
      )
    },
    [basePath, pathname]
  )

  return relativePick
}

export function LocationProvider({
  basePath = '',
  initialLocation = undefined,
  routeMap = undefined, // TODO: implement
  children: originalChildren,
}) {
  const children = <RootBaseContextProvider
    children={originalChildren}
    {...{ routeMap, basePath }}
  />

  return inBrowser
    ? <BrowserLocationProvider {...{ children }} />
    : <ServerLocationProvider {...{ children, initialLocation }} />
}

// TODO: do we really want this to be fixed to an `a`, or do we want to allow it to be a `button`, or something else? (check projects)
// I think it should be an `a`, it's a link after all.
export function Link({ to, replace, state: newState, anchorProps, children }) {
  const { basePath, navigate } = React.useContext(baseContext)
  const location = useLocation() // might be undefined on server side if Link is used outside of server location context
  const href = resolve(basePath, to)

  // TODO: should we allow http `to`? And deal with `_target: 'blank'`?
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

function RootBaseContextProvider({ children, routeMap, basePath }) {
  const contextRef = React.useRef(routeMap)
  if (contextRef.current !== routeMap) throw new Error('Make sure the given context is stable (does not mutate between renders)')

  const { navigate } = React.useContext(locationContext)
  const value = React.useMemo(
    () => ({
      basePath,
      baseParams: {},
      navigate: (to, x) => navigate(resolve(basePath, to), x),
      context: { root: routeMap, path: routeMap },
    }),
    [navigate, routeMap],
  )
  return <baseContext.Provider {...{ value, children }} />
}

function NestedBaseContexProvider({ route, params, createChildren }) {
  const { basePath, baseParams, navigate, context } = React.useContext(baseContext)
  const { pathname } = useLocation()

  const value = React.useMemo(
    () => {
      const newBasePath = pathname === `${basePath}/` ? basePath : pathname.replace(new RegExp(`${params['*']}$`), '')
      return {
        basePath: newBasePath,
        baseParams: { ...baseParams, ...params },
        navigate: (to, x) => navigate(resolve(newBasePath, to), x),
        context: determineNestedContext(context, route),
      }
    },
    [basePath, route, navigate, params, baseParams]
  )
  const children = callOrReturn(createChildren, value.baseParams)

  return <baseContext.Provider {...{ value, children }} />
}

function determineNestedContext(context, route) {
  return route[routeSymbol] ? determineNestedContextForRoute(context, route) : context
}

function extractPath(route) {
  return route[routeSymbol] ? extractPathFromRoute(route) : route
}

function resolve(basePath, to) {
  return to.startsWith('/') ? to : `${basePath}/${to}`
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
