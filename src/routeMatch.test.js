import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { asRouteMap, pickRoute } from './routeMap.js'
import { pickMatchedRoute, routeIsActive } from './routeMatch.js'

const routeMap = asRouteMap({
  root: '',
  app: {
    path: ':language',
    overview: {
      path: 'articles',
      article: ':slug',
    },
    contact: 'contact',
  },
})

const articleMatch = pickRoute('/nl/articles/example/', routeMap)

describe('pickMatchedRoute', () => {
  test('returns the nearest requested route with the current parameters', () => {
    assert.deepEqual(
      pickMatchedRoute(articleMatch, [routeMap.app, routeMap.app.overview]),
      {
        route: routeMap.app.overview,
        params: { language: 'nl', slug: 'example' },
      }
    )
  })

  test('returns null without a current or requested route match', () => {
    assert.equal(pickMatchedRoute(null, [routeMap.app]), null)
    assert.equal(pickMatchedRoute(articleMatch, [routeMap.app.contact]), null)
  })

  test('keeps the existing missing-route error', () => {
    assert.throws(
      () => pickMatchedRoute(articleMatch, [undefined]),
      /Route missing at index 0/
    )
  })
})

describe('routeIsActive', () => {
  test('matches an active ancestor by default', () => {
    assert.equal(routeIsActive(articleMatch, routeMap.app.overview), true)
  })

  test('can require an exact route', () => {
    assert.equal(routeIsActive(articleMatch, routeMap.app.overview, { exact: true }), false)
    assert.equal(routeIsActive(articleMatch, routeMap.app.overview.article, { exact: true }), true)
  })

  test('matches only the supplied parameters', () => {
    assert.equal(
      routeIsActive(articleMatch, routeMap.app.overview, { params: { language: 'nl' } }),
      true
    )
    assert.equal(
      routeIsActive(articleMatch, routeMap.app.overview, { params: { language: 'en' } }),
      false
    )
  })

  test('rejects siblings and missing matches', () => {
    assert.equal(routeIsActive(articleMatch, routeMap.app.contact), false)
    assert.equal(routeIsActive(null, routeMap.app), false)
  })
})
