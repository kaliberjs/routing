import { usePick, useRouting, Link, LocationProvider, useLocation, StaticLocationProvider, useIsCurrent, useIsPartiallyCurrent  } from '@kaliber/routing'
import { routeMap } from './routeMap'
import { animated, useTransition } from 'react-spring'
import styles from './App.css'

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
    from: { opacity: 0, x: '-500px' },
    enter: { opacity: 1, x: '0' },
    leave: { opacity: 0, x: '500px' }
  })

  return (
    <div className={styles.componentPage}>
      <Navigation />
      {transition((props, transitionLocation) => (
        <animated.div className={styles.content} style={props}>
          <StaticLocationProvider location={transitionLocation} >
            <Content />
          </StaticLocationProvider>
        </animated.div>
      ))}

    </div>
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
      <NavigationLink label='Home' route={routes.home} />
      <NavigationLink label='Articles' route={routes.articles} />
      <NavigationLink
        label='Featured article'
        route={routes.articles.article.main}
        params={{ id: 'article1' }}
      />
    </div>
  )
}

function NavigationLink({ label, route, params = undefined }) {
  const isCurrent = useIsCurrent(route, params)
  const isPartiallyCurrent = useIsPartiallyCurrent(route, params)
  return (
    <>
      {
        isCurrent ? '>' :
        isPartiallyCurrent ? '|' :
        ''
      }
      <Link to={route(params)}>{label}</Link>
    </>
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

  const counter = useCounter()

  return (
    <div>
      <h1>Article {id}</h1>
      <div>
        <Link to={routes.main({ id })}>Main</Link>
        <Link to={routes.tab1({ id })}>Tab1</Link>
        <Link to={routes.tab2({ id })}>Tab2</Link>
      </div>
      <h2>{counter}</h2>
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

function useCounter() {
  const [count, setCount] = React.useState(1)

  React.useEffect(
    () => {
      const i = setInterval(() => setCount(x => x + 1), 1000)
      return () => clearInterval(i)
    },
    []
  )

  return count
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
