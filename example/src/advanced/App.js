import { useNavigate, useMatchedRouteData, usePick, useRouting, useLocationMatch, Link, LocationProvider } from '@kaliber/routing'
import { RouteDataProvider, useAsyncRouteData } from './machinery/RouteData'
import { routeMap } from './routeMap'
import { useLanguage, LanguageContext } from './machinery/Language'

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
  const { matchRoute, matchRoutes } = useRouting()
  const mainRoutes = routeMap
  const subRoutes = mainRoutes.app

  return matchRoute(mainRoutes.app, ({ language }) => (
    <Language {...{ language }}>
      <Navigation />
      {matchRoutes(
        [subRoutes.home, <Home />],
        [subRoutes.articles, <Articles />],
        [subRoutes.articles.article, params => <Article {...{ params }} />],
        [subRoutes.notFound, params => <NotFound {...{ params }} />],
      )}
    </Language>
  ))
}

function Language({ children, language }) {
  const navigate = useNavigate()
  const { route } = useLocationMatch()
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
        <LanguageContext {...{ language, children }} />
      </div>
    </div>
  )

  function setLanguage(language) {
    navigate(route({ language }))
  }
}

function Navigation() {
  const routes = routeMap.app
  const language = useLanguage()
  return (
    <div>
      <Link to={routes.home({ language })}>{routes.home.data.title}</Link>
      <Link to={routes.articles({ language })}>{routes.articles.data.title[language]}</Link>
      <Link to={routes.articles.article({ language, articleId: 'article1' })}>{{ en: 'Featured article', nl: 'Uitgelicht artikel' }[language]}</Link>
    </div>
  )
}

function Home() {
  const routes = routeMap.app
  const language = useLanguage()
  const { title } = useMatchedRouteData()

  return (
    <div>
      {title}
      <Link to={routes.articles({ language })}>{routes.articles.data.title[language]}</Link>
    </div>
  )
}

function Articles() {
  const language = useLanguage()
  const routes = routeMap.app.articles
  const { title } = useMatchedRouteData()
  const { articles } = useAsyncRouteData({ articles: [] }, { route: routes.list })
  return (
    <div>
      {title[language]}
      <div>
        {articles.map(x =>
          <div key={x.id}>
            <Link to={routes.article({ language, articleId: x.id })}>{x.title}</Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Article({ params: { articleId } }) {
  const { matchRoutes, matchRoute } = useRouting()
  const routes = routeMap.app.articles.article
  const pick = usePick()
  const { article } = useAsyncRouteData({ article: {} })
  const language = useLanguage()

  const atValidTab = Boolean(pick(routes.main, routes.tab1, routes.tab2))

  return (
    <div>
      <h1>{article.title} ({article.id})</h1>
      {atValidTab && (
        <div>
          <Link to={routes.main({ articleId, language })}>Main</Link>
          <Link to={routes.tab1({ articleId, language })}>Tab1</Link>
          <Link to={routes.tab2({ articleId, language })}>Tab2</Link>
        </div>
      )}
      <div>
        {matchRoutes(
          [routes.main, 'Main content'],
          [routes.tab1, 'Tab 1'],
          [routes.tab2, 'Tab 2'],
          [routes.notFound, 'Not found']
        )}
      </div>
      {matchRoute(routes.tab1, <Sidebar {...{ article }} />)}
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
