import { asRouteMap } from '@kaliber/routing/routeMap'

export const routeMap = asRouteMap({
  home: { path: '', meta: { title: 'Home' } },
  articles: {
    path: { nl: 'artikelen', en: 'articles' },
    meta: { title: { nl: 'Artikelen', en: 'Articles' } },

    list: { path: '', data: fetchArticles },
    article: {
      path: ':articleId',
      data: fetchArticle,
      meta: { title: x => x.article.title },

      main: '',
      tab1: {
        path: 'tab1',
        data: fetchArticleMetadata,
        meta: { title: x => `${x.article.title} - €${x.tab1.price}` }
      },
      tab2: 'tab2',
    },
  },
  notFound: '*',
})

async function fetchArticle({ params: { articleId } }) {
  return {
    title: `Artikel ${articleId}`
  }
}

async function fetchArticles() {
  return [
    { title: `Artikel article1`, id: 'article1' },
    { title: `Artikel article2`, id: 'article2' },
  ]
}

async function fetchArticleMetadata({ data: { article } }) {
  return { price: 10 }
}
