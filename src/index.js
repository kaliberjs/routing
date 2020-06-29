/**
  @typedef {(to: number | string, x?: { state: object, replace?: boolean }) => void} Navigate
  @typedef {{
    location: { pathname: string, search: string, hash: string },
    navigate: Navigate
  }} Location
  @typedef {{ basePath: string, baseParams: object, navigate: Navigate }} Base
*/

import { createHistory } from './history'
import { pick, callOrReturn } from './matching'

/** @type {React.Context<Location | undefined>} */
const locationContext = React.createContext(undefined)
/** @type {React.Context<Base | undefined>} */
const baseContext = React.createContext(undefined)

const inBrowser = typeof window !== 'undefined'

// TODO: eslint plugin for key warning of pairs
export function useRouting({ initialLocation = undefined } = {}) {
  return {
    pick(...routes) { return <Routing {...{ routes, initialLocation }} /> }
  }
}

export { pick }

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

function LocationProvider({ initialLocation = undefined, children: originalChildren }) {
  const children = <RootBaseContextProvider children={originalChildren} />

  return inBrowser
    ? <BrowserLocationProvider {...{ children }} />
    : <ServerLocationProvider {...{ children, initialLocation }} />
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
  const value = React.useMemo(
    () => ({
      location: initialLocation,
      navigate: () => { throw new Error('You can not navigate on the server') }
    }),
    [initialLocation]
  )

  return <locationContext.Provider {...{ value, children }} />
}

function RootBaseContextProvider({ children }) {
  const { navigate } = React.useContext(locationContext)
  const value = React.useMemo(
    () => ({
      basePath: '',
      baseParams: {},
      navigate: (to, x) => navigate(resolve('', to), x),
    }),
    [navigate],
  )
  return <baseContext.Provider {...{ value, children }} />
}

function NestedBaseContexProvider({ routePath, params, createChildren }) {
  const { basePath, baseParams, navigate } = React.useContext(baseContext)
  const { pathname } = useLocation()

  const value = React.useMemo(
    () => {
      const newBasePath = pathname === '/' ? '' : pathname.replace(new RegExp(`${params['*']}$`), '')
      return {
        // basePath: `${basePath}${routePath}`, // we might want to keep this route path
        basePath: newBasePath,
        baseParams: { ...baseParams, ...params },
        navigate: (to, x) => navigate(resolve(newBasePath, to), x)
      }
    },
    [basePath, routePath, navigate, params, baseParams]
  )
  const children = callOrReturn(createChildren, value.baseParams)

  return <baseContext.Provider {...{ value, children }} />
}

function Routing({ routes, initialLocation }) {
  const context = React.useContext(locationContext)
  if (!context && !inBrowser && !initialLocation)
    throw new Error(`Your need to supply an initial location on server side rendering`)

  const children = <RoutingImpl {...{ routes }} />
  return context ? children : <LocationProvider {...{ children, initialLocation }} />
}

function RoutingImpl({ routes }) {
  const { pathname } = useLocation()
  const { basePath } = React.useContext(baseContext)

  const mappedRoutes = routes.map(([routePath, createChildren]) =>
    [routePath, params => <NestedBaseContexProvider {...{ routePath, params, createChildren }} />]
  )

  const relativePathname = pathname.replace(basePath, '')
  return pick(relativePathname, ...mappedRoutes)
}

export function Link({ to, children: originalChildren }) {
  const context = React.useContext(baseContext)
  const children = <LinkImpl {...{ to }} children={originalChildren} />
  return context ? children : <LocationProvider {...{ children }} />
}

// TODO: check Reach router for a better implementation
function LinkImpl({ to, children }) {
  const { basePath, navigate } = React.useContext(baseContext)
  const href = resolve(basePath, to)
  return <a {...{ href, children, onClick }} />

  function onClick(e) {
    e.preventDefault()
    navigate(to)
  }
}

function resolve(basePath, to) {
  return to.startsWith('/') ? to : `${basePath}/${to}`
}
