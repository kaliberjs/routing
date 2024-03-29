import '/reset.css'
import '/index.css'
import stylesheet from '@kaliber/build/lib/stylesheet'
import javascript from '@kaliber/build/lib/javascript'
import polyfill from '@kaliber/build/lib/polyfill'
import App from './App?universal'
import { pick } from '@kaliber/routing'
import { fetchRouteData } from './machinery/RouteData'
import { routeMap } from './routeMap'

// TODO, should we add another example directory for advanced and only show the base path concept here?
// - Yes
const basePath = '/advanced' // TODO: Get from file name, maybe also add a public path example

Index.routes = {
  async match(location, req) {
    const language = req.acceptsLanguages('nl', 'en') || 'nl'
    const languageTarget = `${basePath}${routeMap.app.home({ language })}`

    const result = await pick(location.pathname.replace(`${basePath}`, ''),
      [routeMap, async (params, route) => (
        { status: 200, data: { routeData: await fetchRouteData(route, params) } }
      )],
      [routeMap.root, { status: 302, headers: { Location: languageTarget } }],
      [routeMap.app.notFound, { status: 404 }],
      [routeMap.app.articles.article.notFound, { status: 404 }]
    )

    return result
  }
}

export default function Index({ location, data = { routeData: {} } }) {
  return (
    <html lang='nl'>
      <head>
        <meta charSet='utf-8' />
        <title>@kaliber/build</title>
        <meta name='description' content='' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        {stylesheet}
        {polyfill(['default', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019'])}
        {javascript}
      </head>
      <body>
        <App initialLocation={location} initialRouteData={data.routeData} {...{ basePath }} />
      </body>
    </html>
  )
}
