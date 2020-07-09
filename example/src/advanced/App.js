import { useRouting, Link, useRouteContext } from '@kaliber/routing'
import { useRouteMap } from '@kaliber/routing/routeMap'
import { routeMap } from './routeMap'

export default function App({ initialLocation, basePath }) {
  const advanced = useRouteMap(routeMap)

  const { routes, context } = useRouting({ initialLocation, advanced, basePath  })
  const { path, root } = context

  // console.log(context)
  return (
    <>
      <Navigation {...{ basePath }} />
      {routes(
        [path.home, <Home />],
        [path.articles, <Articles />],
        [path.articles.article, params => <Article {...{ params }} />],
        [path.notFound, params => <NotFound {...{ params }} />],
      )}
    </>
  )
}

function Navigation({ basePath }) {
  return (
    <div>
      <Link {...{ basePath }} to={''}>Home</Link>
      <Link {...{ basePath }} to={'articles'}>Articles</Link>
    </div>
  )
}

function Home() {
  return (
    <div>
      Home
      <Link to='articles'>Articles</Link>
    </div>
  )
}

function Articles() {
  return (
    <div>
      articles
      <div>
        <Link to='article1'>article 1</Link><br />
        <Link to='article2'>article 2</Link>
      </div>
    </div>
  )
}

function Article({ params: { articleId } }) {
  const { routes, route } = useRouting()
  const { path } = useRouteContext()
  return (
    <div>
      <h1>Article {articleId}</h1>
      <div>
        <Link to=''>Main</Link>
        <Link to='tab1'>Tab1</Link>
        <Link to='tab2'>Tab2</Link>
      </div>
      <div>
        {routes(
          [path.main, 'Main content'],
          [path.tab1, 'Tab 1'],
          [path.tab2, 'Tab 2'],
        )}
      </div>
      {route(path.tab1, <div>Side bar for tab 1</div>)}
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
