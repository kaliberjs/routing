import { asRouteMap } from '@kaliber/routing'
export const routeMap = asRouteMap({
  root: '',
  test: { path: '' },
  app: {
    path: ':language',

    home: { path: '', data: { title: 'Home' } },
    articles: {
      path: { nl: 'artikelen', en: 'articles' },
      // data: Articles.data
      data: { title: { nl: 'Artikelen', en: 'Articles' } },

      list: {
        path: '',
        data: async () => ({ articles: await fetchArticles() })
      },
      article: {
        path: ':articleId',
        data: async ({ articleId }) => ({ article: await fetchArticle({ articleId }) }),

        main: '',
        tab1: {
          path: 'tab1',
          data: async ({ article }) => {
            const { price } = await fetchArticleMetadata({ article })
            return { price, title: `${article.title} - €${price}` }
          },
        },
        tab2: 'tab2',
        notFound: '*',
      },
    },
    notFound: '*',
  }
})
async function fetchArticle({ articleId }) {
  await resolveAfter({ seconds: 1 })

  return {
    title: `Artikel ${articleId}`,
    id: articleId,
  }
}

async function fetchArticles() {
  await resolveAfter({ seconds: 1 })

  return [
    { title: `Artikel article1`, id: 'article1' },
    { title: `Artikel article2`, id: 'article2' },
  ]
}

async function fetchArticleMetadata({ article }) {
  await resolveAfter({ seconds: 1 })
  return { price: 10 }
}

async function resolveAfter({ seconds }) { return new Promise(resolve => setTimeout(resolve, seconds * 1000)) }
