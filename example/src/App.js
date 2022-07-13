import { usePick, useRouting, Link, LocationProvider, useLocation, StaticLocationProvider } from '@kaliber/routing'
import { routeMap } from './routeMap'
import { animated, useTransition } from 'react-spring'

export default function App({ initialLocation }) {
  return (
    <LocationProvider {...{ initialLocation, routeMap }} basePath=''>
      <Page />
    </LocationProvider>
  )
}

function Page() {
  const location = useLocation()
  const pageRoutePath = usePageRoutePath()

  const transition = useTransition(location, {
    key: pageRoutePath,
    from: { opacity: 0, translateX: '-500px' },
    enter: { opacity: 1, translateX: '0' },
    leave: { opacity: 0, translateX: '500px' }
  })

  return (
    <>
      <Navigation />
      {transition((props, transitionLocation) => {
        const isLeaving = location !== transitionLocation
        return (
          <animated.div style={{ ...(isLeaving && { position: 'absolute' }), ...props }}>
            {isLeaving
              ? <StaticLocationProvider location={transitionLocation} children={<Content />} />
              : <Content />
            }
          </animated.div>
        )
      })}
    </>
  )
}

function Content() {
  const { matchRoutes } = useRouting()
  const routes = routeMap

  return matchRoutes(
    [routes.home, <Home />],
    [routes.articles, <Articles />],
    [routes.articles.article, params => <Article {...{ params }} />],
    [routes.notFound, params => <NotFound {...{ params }} />],
  )
}

function Navigation() {
  const routes = routeMap
  return (
    <div>
      <Link to={routes.home()}>Home</Link>
      <Link to={routes.articles()}>Articles</Link>
      <Link to={routes.articles.article({ id: 'article1' })}>Featured article</Link>
    </div>
  )
}

function Home() {
  const routes = routeMap
  return (
    <div>
      Home
      <Link to={routes.articles()}>Articles</Link>
    </div>
  )
}

function Articles() {
  const routes = routeMap.articles
  return (
    <div>
      articles
      <div>
        <Link to={routes.article({ id: 'article1' })}>article 1</Link><br />
        <Link to={routes.article({ id: 'article2' })}>article 2</Link>
      </div>
    </div>
  )
}

function Article({ params: { id } }) {
  const { matchRoutes, matchRoute } = useRouting()
  const routes = routeMap.articles.article

  return (
    <div>
      <h1>Article {id}</h1>
      <div>
        <Link to={routes.main({ id })}>Main</Link>
        <Link to={routes.tab1({ id })}>Tab1</Link>
        <Link to={routes.tab2({ id })}>Tab2</Link>
      </div>
      <div>
        {matchRoutes(
          [routes.main, 'Main content'],
          [routes.tab1, 'Tab 1'],
          [routes.tab2, 'Tab 2'],
        ) || 'not matched'}
      </div>
      {matchRoute(routes.tab1, <div>Side bar for tab 1</div>)}
    </div>
  )
}

function NotFound({ params: { '*': path } }) {
  return (
    <div>
      Nothing found at {path}
    </div>
  )
}

function usePageRoutePath() {
  const pick = usePick()
  const { params, route } = pick(
    routeMap.home,
    routeMap.articles,
    routeMap.articles.article,
    routeMap.notFound,
  )
  return route(params)
}
