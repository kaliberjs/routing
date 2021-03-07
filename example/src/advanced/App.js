import { useRouting, Link, useRouteContext, useRelativePick, useHistory, LocationProvider, pickFromRouteMap } from '@kaliber/routing'
import { routeMap } from './routeMap'

export default function App({ initialLocation, basePath }) {
  return (
    <LocationProvider {...{ initialLocation, basePath, routeMap }}>
      <Page {...{ basePath }} />
    </LocationProvider>
  )
}

function Page({ basePath }) {
  const { routes } = useRouting()

  return (
    <Language {...{ basePath }}>
      <Navigation />
      {routes(
        [path.home, <Home />],
        [path.articles, <Articles />],
        [path.articles.article, params => <Article {...{ params }} />],
        [path.notFound, params => <NotFound {...{ params }} />],
      )}
    </Language>
  )
}

const languageContext = React.createContext(null)

function Language({ children, basePath }) {
  const [language, setLanguage] = React.useState('nl')

  // Temporary workaround for the fact that the `Language` component lives outside the routing context
  const history = useHistory()

  React.useEffect(
    () => {
      // A trick to obtain the current route and the params
      const { route, ...params } = pickFromRouteMap(history.location.pathname.replace(basePath, ''), [routeMap, x => x])
      // delete * from the params (we don't want to supply that dynamic bit)
      delete params['*']
      // construct the route
      const routePath = route(params)
      // it might a language dependent or language independent route
      const targetPath = routePath[language] || routePath
      // replace the route at the current location
      history.navigate(`${basePath}/${targetPath}`, { replace: true })
    },
    [language, history, basePath]
  )

  return (
    <div>
      <label htmlFor='nl'>NL</label>
      <input
        id='nl' name='language' type='radio'
        checked={language === 'nl'}
        onChange={e => e.currentTarget.checked && setLanguage('nl')}
      />
      <label htmlFor='en'>EN</label>
      <input
        id='en' name='language' type='radio'
        checked={language === 'en'}
        onChange={e => e.currentTarget.checked && setLanguage('en')}
      />
      <div>
        <languageContext.Provider
          value={language}
          {...{ children }}
        />
      </div>
    </div>
  )
}

function useLanguage() {
  const context = React.useContext(languageContext)
  if (!context) throw new Error('Please use a language context before trying to get the language')
  return context
}

function Navigation() {
  const { path } = useRouteContext()
  const language = useLanguage()
  return (
    <div>
      <Link to={path.home()}>Home</Link>
      <Link to={path.articles()[language]}>{path.articles.meta.title[language]}</Link>
      <Link to={path.articles.article({ articleId: 'article1' })[language]}>Featured article</Link>
    </div>
  )
}

function Home() {
  const { root } = useRouteContext()
  const language = useLanguage()
  return (
    <div>
      Home
      <Link to={root.articles()[language]}>Articles</Link>
    </div>
  )
}

function Articles() {
  const { path } = useRouteContext()
  return (
    <div>
      articles
      <div>
        <Link to={path.article({ articleId: 'article1' })}>article 1</Link><br />
        <Link to={path.article({ articleId: 'article2' })}>article 2</Link>
      </div>
    </div>
  )
}

function Article({ params: { articleId } }) {
  const { routes, route } = useRouting()
  const { path } = useRouteContext()
  const relativePick = useRelativePick()

  const knownPaths = [path.main, path.tab1, path.tab2]
  const atValidTab = relativePick(...knownPaths.map(x => [x, true]))

  return (
    <div>
      <h1>Article {articleId}</h1>
      {atValidTab && (
        <div>
          <Link to={path.main()}>Main</Link>
          <Link to={path.tab1()}>Tab1</Link>
          <Link to={path.tab2()}>Tab2</Link>
        </div>
      )}
      <div>
        {routes(
          [path.main, 'Main content'],
          [path.tab1, 'Tab 1'],
          [path.tab2, 'Tab 2'],
          [path.notFound, 'Not found']
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
