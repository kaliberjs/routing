import { useNavigate, useRoute, usePick, useRouting, useMatch, Link, LocationProvider, useRoutes } from '../../../'
import { RouteDataProvider, useAsyncRouteData } from './machinery/routeData'
import { routeMap } from './routeMap'

export default function App({ initialLocation, basePath, initialRouteData }) {
  return (
    <RouteDataProvider initialData={initialRouteData}>
      <LocationProvider {...{ initialLocation, basePath, routeMap }}>
        <Page />
      </LocationProvider>
    </RouteDataProvider>
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
  const { route } = useMatch()
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
    navigate(route({ language }))
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
      <Link to={home()}>{home.data.title}</Link>
      <Link to={articles()}>{articles.data.title[language]}</Link>
      <Link to={articles.article({ articleId: 'article1' })}>{{ en: 'Featured article', nl: 'Uitgelicht artikel' }[language]}</Link>
    </div>
  )
}

function Home() {
  const { articles } = useRoutes()
  const language = useLanguage()
  const { title } = useRoute().data

  return (
    <div>
      {title}
      <Link to={articles()}>{articles.data.title[language]}</Link>
    </div>
  )
}

function Articles() {
  const { article, list } = useRoutes()
  const language = useLanguage()
  const { title } = useRoute().data
  const { articles } = useAsyncRouteData({ articles: [] }, { route: list })
  return (
    <div>
      {title[language]}
      <div>
        {articles.map(x =>
          <div key={x.id}>
            <Link to={article({ articleId: x.id })}>{x.title}</Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Article({ params: { articleId } }) {
  const { routes, route } = useRouting()
  const { main, tab1, tab2, notFound } = useRoutes()
  const pick = usePick()
  const { article } = useAsyncRouteData({ article: {} })

  const atValidTab = Boolean(pick(main, tab1, tab2))

  return (
    <div>
      <h1>{article.title} ({article.id})</h1>
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
      {route(tab1, <Sidebar {...{ article }} />)}
    </div>
  )
}

function Sidebar({ article }) {
  const { price } = useAsyncRouteData({ price: 0 }, { extraArgs: { article } })
  return <div>Side bar for tab 1, price: {price}</div>
}

function NotFound({ params: { '*': path } }) {
  return (
    <div>
      Nothing found at {path}
    </div>
  )
}
