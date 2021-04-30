import { useRouting, Link, LocationProvider, useRoutes } from '@kaliber/routing'
import { routeMap } from './routeMap'

export default function App({ initialLocation }) {
  return (
    <LocationProvider {...{ initialLocation, routeMap }}>
      <Page />
    </LocationProvider>
  )
}

function Page() {
  const { matchRoutes } = useRouting()
  const routes = useRoutes()

  return (
    <>
      <Navigation />
      {matchRoutes(
        [routes.home, <Home />], // eslint-disable-line react/jsx-key
        [routes.articles, <Articles />], // eslint-disable-line react/jsx-key
        [routes.articles.article, params => <Article {...{ params }} />],
        [routes.notFound, params => <NotFound {...{ params }} />],
      )}
    </>
  )
}

function Navigation() {
  const routes = useRoutes()
  return (
    <div>
      <Link to={routes.home()}>Home</Link>
      <Link to={routes.articles()}>Articles</Link>
      <Link to={routes.articles.article({ id: 'article1' })}>Featured article</Link>
    </div>
  )
}

function Home() {
  const routes = useRoutes()
  return (
    <div>
      Home
      <Link to={routes.articles()}>Articles</Link>
    </div>
  )
}

function Articles() {
  const routes = useRoutes()
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
  const routes = useRoutes()
  console.log(routes)
  return (
    <div>
      <h1>Article {id}</h1>
      <div>
        <Link to={routes.main()}>Main</Link>
        <Link to={routes.tab1()}>Tab1</Link>
        <Link to={routes.tab2()}>Tab2</Link>
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
