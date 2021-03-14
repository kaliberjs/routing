import '/reset.css'
import '/index.css'
import '../../' // force typescript to recognize the @kaliber/routing import...
import stylesheet from '@kaliber/build/lib/stylesheet'
import javascript from '@kaliber/build/lib/javascript'
import polyfill from '@kaliber/build/lib/polyfill'
import App from '/App?universal'
import { pick } from '@kaliber/routing'
import { routeMap } from './routeMap'

// TODO we should probably provide an example where the basis for the routemap is taken from the
// components (static props, like data fetching), we might even be able to take this into account
// when specifying / inferring types of 'useRouting'
Index.routes = {
  match(location) {
    return pick(location.pathname,
      [routeMap, { status: 200 }],
      [routeMap.notFound, { status: 404 }],
    )
  }
}

export default function Index({ location, data }) {
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
        <App initialLocation={location} />
      </body>
    </html>
  )
}
