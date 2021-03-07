import { asRouteMap } from '@kaliber/routing'

export const routeMap = asRouteMap({
  home: '',

  articles: {
    path: 'articles',

    article: {
      path: ':id',

      main: '',
      tab1: 'tab1',
      tab2: 'tab2',
    }
  },
  notFound: '*'
})
