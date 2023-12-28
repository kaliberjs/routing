/**
 * Warning: do not use this code in production.
 */

import { useLocationMatch, asRouteChain } from '@kaliber/routing'

const routeDataContext = React.createContext(null)

export async function fetchRouteData(route, params) {
  const routeChain = asRouteChain(route)
  const { routeData } = await routeChain.reduce(
    async (resultPromise, route) => {
      if (typeof route.data !== 'function') return resultPromise

      const { routeData, previousData } = await resultPromise
      const data = await route.data({ ...params, ...previousData })

      return {
        routeData: { ...routeData, [route(params)]: data },
        previousData: { ...previousData, ...data },
      }
    },
    Promise.resolve({ routeData: {}, previousData: {} })
  )
  return routeData
}

export function RouteDataProvider({ children, initialData }) {
  const data = useSingleUseProperties(initialData)
  return <routeDataContext.Provider value={data} {...{ children }} />
}

export function useAsyncRouteData({ initialValue, route, extraArgs = undefined }) {
  const initialRouteData = React.useContext(routeDataContext)
  if (!initialRouteData) throw new Error('Please use a RouteDataProvider')
  const { params } = useLocationMatch()
  const routeId = route(params)

  if (typeof route.data !== 'function') throw new Error(`Route ${route} (${routeId}) does not have a function as data`)

  const [state, setState] = React.useState(() => initialRouteData[routeId] || initialValue)

  const dataForRef = React.useRef(state === initialValue ? null : routeId)

  const getData = route.data
  const props = { ...params, ...extraArgs }

  React.useEffect(
    () => {
      if (dataForRef.current === routeId) return
      dataForRef.current = routeId

      fetchData().catch(e => console.error(e))
      return () => { dataForRef.current = null }

      async function fetchData() {
        const result = await getData(props)
        if (dataForRef.current !== routeId) return
        setState(result)
      }
    },
    [routeId, getData, props]
  )

  return state
}

function useSingleUseProperties(initialData) {
  return React.useMemo(
    () => Object.entries(initialData).reduce(
      (result, [k, v]) => (Object.defineProperty(result, k, { get: getOnce(v) })),
      {}
    ),
    [initialData]
  )
}

function getOnce(data) {
  let used = false
  return () => used ? undefined : (used = true, data) // eslint-disable-line no-return-assign
}
