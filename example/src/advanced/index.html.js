import '/reset.css'
import '/index.css'
import stylesheet from '@kaliber/build/lib/stylesheet'
import javascript from '@kaliber/build/lib/javascript'
import polyfill from '@kaliber/build/lib/polyfill'
import App from './App?universal'
import { pick } from '@kaliber/routing/routeMap'
import { routeMap } from './routeMap'

// TODO, should we add another example directory for advanced and only show the base path concept here?
const basePath = '/advanced' // TODO: Get from file name, maybe also add a public path example

Index.routes = {
  match(location) {
    const ok = { status: 200 }
    console.log('location', location)
    console.log(routeMap)
    const result = pick(location.pathname.replace(`${basePath}`, ''),
      [routeMap, ok],
      [routeMap.notFound, { status: 404 }],
    )

    return result
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
        <App initialLocation={location} {...{ basePath }} />
      </body>
    </html>
  )
}