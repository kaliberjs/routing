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
  const { routes } = useRouting()
  const { home, articles, notFound } = useRoutes()

  return (
    <>
      <Navigation />
      {routes(
        [home, <Home />], // eslint-disable-line react/jsx-key
        [articles, <Articles />], // eslint-disable-line react/jsx-key
        [articles.article, params => <Article {...{ params }} />],
        [notFound, params => <NotFound {...{ params }} />],
      )}
    </>
  )
}

function Navigation() {
  const { home, articles } = useRoutes()
  return (
    <div>
      <Link to={home()}>Home</Link>
      <Link to={articles()}>Articles</Link>
      <Link to={articles.article({ id: 'article1' })}>Featured article</Link>
    </div>
  )
}

function Home() {
  const { articles } = useRoutes()

  return (
    <div>
      Home
      <Link to={articles()}>Articles</Link>
    </div>
  )
}

function Articles() {
  const { article } = useRoutes()
  return (
    <div>
      articles
      <div>
        <Link to={article({ id: 'article1' })}>article 1</Link><br />
        <Link to={article({ id: 'article2' })}>article 2</Link>
      </div>
    </div>
  )
}

function Article({ params: { id } }) {
  const { routes, route } = useRouting()
  const { main, tab1, tab2 } = useRoutes()
  return (
    <div>
      <h1>Article {id}</h1>
      <div>
        <Link to={main()}>Main</Link>
        <Link to={tab1()}>Tab1</Link>
        <Link to={tab2()}>Tab2</Link>
      </div>
      <div>
        {routes(
          [main, 'Main content'],
          [tab1, 'Tab 1'],
          [tab2, 'Tab 2'],
        ) || 'not matched'}
      </div>
      {route(tab1, <div>Side bar for tab 1</div>)}
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
