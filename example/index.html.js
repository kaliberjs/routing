import App from '/App?universal'
import javascript from '@kaliber/build/lib/javascript'
import stylesheet from '@kaliber/build/lib/stylesheet'
import polyfill from '@kaliber/build/lib/polyfill'
import './index.css'

export default (
  <html lang='en'>
    <head>
      <meta charSet='utf-8' />
      <title>routing</title>
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      {javascript}
      {stylesheet}
      {polyfill(['default'])}
    </head>
    <body>
      <App />
    </body>
  </html>
)
