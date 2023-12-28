import {
  useNavigate,
  usePick,
  useRouting,
  useLocationMatch,
  Link,
  LocationProvider,
} from '@kaliber/routing'
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
  const { params, route } = useLocationMatch()
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
    navigate(route({ ...params, language }))
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
  const { title } = routes.home.data

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
  const { title } = routeMap.app.home.data
  const { articles } = useAsyncRouteData({ initialValue: { articles: [] }, route: routes.list })
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
  const articleRoute = routeMap.app.articles.article
  const pick = usePick()
  const { article } = useAsyncRouteData({ initialValue: { article: {} }, route: articleRoute })

  const atValidTab = Boolean(pick(articleRoute.main, articleRoute.tab1, articleRoute.tab2))

  return (
    <div>
      <h1>{article.title} ({article.id})</h1>
      {atValidTab && (
        <div>
          <Tab label='Main' route={articleRoute.main} />
          <Tab label='Tab1' route={articleRoute.tab1} />
          <Tab label='Tab2' route={articleRoute.tab2} />
        </div>
      )}
      <div>
        {matchRoutes(
          [articleRoute.main, 'Main content'],
          [articleRoute.tab1, 'Tab 1'],
          [articleRoute.tab2, 'Tab 2'],
          [articleRoute.notFound, 'Not found']
        )}
      </div>
      {matchRoute(articleRoute.tab1, <Sidebar {...{ article }} route={articleRoute.tab1} />)}
    </div>
  )
}

function Tab({ label, route }) {
  const { params, route: currentRoute } = useLocationMatch()
  const isActive = route === currentRoute
  return (
    <>
      {isActive && '>> '}
      <Link to={route(params)}>{label}</Link>
      {isActive && ' <<'}
    </>
  )
}

function Sidebar({ article, route }) {
  const { price } = useAsyncRouteData({ initialValue: { price: 0 }, route, extraArgs: { article } })
  return <div>Side bar for tab 1, price: {price}</div>
}

function NotFound({ params: { '*': path } }) {
  return (
    <div>
      Nothing found at {path}
    </div>
  )
}
