import { useNavigate, useRoute, usePick, useRouting, useCurrentRoute, Link, routeSymbol, LocationProvider, useRoutes } from '@kaliber/routing'
import { routeMap } from './routeMap'

export default function App({ initialLocation, basePath }) {
  return (
    <LocationProvider {...{ initialLocation, basePath, routeMap }}>
      <Page />
    </LocationProvider>
  )
}

function Page() {
  const { route, routes } = useRouting()
  const { language } = useRoutes()
  const { home, articles, notFound } = language
  return route(
    language,
    ({ language }) => (
      <Language {...{ language }}>
        <Navigation />
        {routes(
          [home, <Home />], // eslint-disable-line react/jsx-key
          [articles, <Articles />], // eslint-disable-line react/jsx-key
          [articles.article, params => <Article {...{ params }} />],
          [notFound, params => <NotFound {...{ params }} />],
        )}
      </Language>
    )
  )
}

const languageContext = React.createContext(null)

function Language({ children, language }) {
  const navigate = useNavigate()
  const currentRoute = useCurrentRoute()
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

  function setLanguage(language) {
    navigate(currentRoute({ language }))
  }
}

function useLanguage() {
  const context = React.useContext(languageContext)
  if (!context) throw new Error('Please use a language context before trying to get the language')
  return context
}

function Navigation() {
  const { home, articles } = useRoutes()
  const language = useLanguage()
  return (
    <div>
      <Link to={home()}>Home</Link>
      <Link to={articles()}>{articles[routeSymbol].data.title[language]}</Link>
      <Link to={articles.article({ articleId: 'article1' })}>Featured article</Link>
    </div>
  )
}

function Home() {
  const { articles } = useRoutes()
  const language = useLanguage()
  return (
    <div>
      Home
      <Link to={articles()}>{articles[routeSymbol].data.title[language]}</Link>
    </div>
  )
}

function Articles() {
  const { article } = useRoutes()
  const articles = useRoute()
  const language = useLanguage()
  return (
    <div>
      {articles[routeSymbol].data.title[language]}
      <div>
        <Link to={article({ articleId: 'article1' })}>article 1</Link><br />
        <Link to={article({ articleId: 'article2' })}>article 2</Link>
      </div>
    </div>
  )
}

function Article({ params: { articleId } }) {
  const { routes, route } = useRouting()
  const { main, tab1, tab2, notFound } = useRoutes()
  const pick = usePick()

  const knownPaths = [main, tab1, tab2]
  const atValidTab = pick(...knownPaths.map(x => [x, true]))

  return (
    <div>
      <h1>Article {articleId}</h1>
      {atValidTab && (
        <div>
          <Link to={main()}>Main</Link>
          <Link to={tab1()}>Tab1</Link>
          <Link to={tab2()}>Tab2</Link>
        </div>
      )}
      <div>
        {routes(
          [main, 'Main content'],
          [tab1, 'Tab 1'],
          [tab2, 'Tab 2'],
          [notFound, 'Not found']
        )}
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
