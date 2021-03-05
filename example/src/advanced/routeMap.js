import { asRouteMap } from '../../../'

export const routeMap = asRouteMap({
  home: { path: '', data: { title: 'Home' } },
  articles: {
    path: { nl: 'artikelen', en: 'articles' },
    data: { title: { nl: 'Artikelen', en: 'Articles' } },

    list: {
      path: '',
      data: async () => ({ articles: await fetchArticles() })
    },
    article: {
      path: ':articleId',
      data: async ({ params: { articleId } }) => {
        const article = await fetchArticle({ articleId })
        return { article, title: article.title }
      },

      main: '',
      tab1: {
        path: 'tab1',
        data: async ({ data: { article } }) => {
          const { price } = await fetchArticleMetadata({ article })
          return { price, title: `${article.title} - €${price}` }
        },
      },
      tab2: 'tab2',
      notFound: '*',
    },
  },
  notFound: '*',
})

async function fetchArticle({ articleId }) {
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

async function fetchArticleMetadata({ article }) {
  return { price: 10 }
}
