import { useRouting, Link } from '@kaliber/routing'

export default function App({ initialLocation }) {
  const { pick } = useRouting({ initialLocation })
  return (
    <>
      <Navigation />
      {pick(
        ['', <Home />],
        ['articles', <Articles />],
        ['articles/:articleId/*', params => <Article {...{ params }} />],
        ['*', params => <NotFound {...{ params }} />],
      )}
    </>
  )
}

function Navigation() {
  return (
    <div>
      <Link to={''}>Home</Link>
      <Link to={'articles'}>Articles</Link>
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
  const { pick } = useRouting()
  return (
    <div>
      <h1>Article {articleId}</h1>
      <div>
        <Link to=''>Main</Link>
        <Link to='tab1'>Tab1</Link>
        <Link to='tab2'>Tab2</Link>
      </div>
      <div>
        {pick(
          ['', 'Main content'],
          ['tab1', 'Tab 1'],
          ['tab2', 'Tab 2'],
        )}
      </div>
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
