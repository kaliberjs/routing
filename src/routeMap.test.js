import { asRouteMap, pick, interpolate, routeMapSymbol, routeSymbol } from './routeMap'

const { anything, any, objectContaining } = expect

describe('asRouteMap', () => {

  test('marker', () => {
    expect(asRouteMap({})[routeMapSymbol]).toBe(true)
  })

  describe('string route conversion', () => {
    test('structure', () => {
      const routeMap = asRouteMap({ x: 'y' })

      expect(routeMap.x).toBeDefined()
      const { x } = routeMap
      expect(x[routeSymbol]).toEqual(anything())
      expect(x.path).toBe('y')
      expect(x.data).toBe(undefined)
    })

    test('static', () => {
      const { x } = asRouteMap({ x: 'y' })
      expect(x.path).toBe('y')
      expect(x()).toBe('/y')
    })

    test('dynamic', () => {
      const { x } = asRouteMap({ x: 'a/:x/b' })
      expect(x.path).toBe('a/:x/b')
      expect(x({ x: 'y' })).toBe('/a/y/b')
    })
  })

  describe('object route conversion', () => {
    describe('structure', () => {
      test('path only', () => {
        const routeMap = asRouteMap({ x: { path: 'y' } })

        expect(routeMap.x).toBeDefined()
        const { x } = routeMap
        expect(x[routeSymbol]).toEqual(anything())
        expect(x.path).toBe('y')
        expect(x.data).toBeUndefined()
      })
      test('path & data', () => {
        const data = { x: Symbol('data') }
        const { x } = asRouteMap({ x: { path: 'y', data } })

        expect(x.path).toBe('y')
        expect(x.data).toBe(data)
      })
      test('localized paths', () => {
        const path = { en: 'y', nl: 'z'}
        expect(() => asRouteMap({ x: { path } }, 'de')).toThrowError(/language/)
      })
      test('localized paths', () => {
        const path = { en: 'y', nl: 'z'}
        const { x } = asRouteMap({ x: { path } }, 'en')
        expect(x.path).toBe('y')
        expect(x.data).toBeUndefined()
        const { y } = asRouteMap({ y: { path } }, 'nl')
        expect(y.path).toBe('z')
        expect(y.data).toBeUndefined()
      })
      test('localized paths & data', () => {
        const path = { en: 'y', nl: 'z'}
        const data = { x: Symbol('data') }
        const { x } = asRouteMap({ x: { path, data } }, 'en')
        expect(x.path).toBe('y')
        expect(x.data).toBe(data)
        const { y } = asRouteMap({ y: { path, data } }, 'nl')
        expect(y.path).toBe('z')
        expect(y.data).toBe(data)
      })
      test('allow empty path', () => {
        expect(() => asRouteMap({ x: '' })).not.toThrowError()
      })
      test('error on incorrect structure', () => {
        expect(() => asRouteMap({ x: { en: 'a', nl: 'b' } })).toThrowError(/path/)
        expect(() => asRouteMap({ x: true })).toThrowError(/path/)
        expect(() => asRouteMap({ x: 0 })).toThrowError(/path/)
        expect(() => asRouteMap({ x: 1 })).toThrowError(/path/)
        expect(() => asRouteMap({ x: false })).toThrowError(/path/)
        expect(() => asRouteMap({ x: null })).toThrowError(/path/)
      })
    })
    describe('reverse routing', () => {
      test('path static', () => {
        const { x } = asRouteMap({ x: { path: 'y' } })
        expect(x()).toBe('/y')
      })
      test('path dynamic', () => {
        const { x } = asRouteMap({ x: { path: 'a/:y/b' } })
        expect(x({ y: 'z' })).toBe('/a/z/b')
      })
      test('localized path static', () => {
        const path = { en: 'a', nl: 'b' }
        const { x } = asRouteMap({ x: { path } }, 'en')
        expect(x()).toEqual('/a')
        const { y } = asRouteMap({ y: { path } }, 'nl')
        expect(y()).toEqual('/b')
      })
      test('localized path dynamic', () => {
        const path = { en: 'x/:a/y', nl: 'a/:b/b' }
        const { x } = asRouteMap({ x: { path } }, 'en')
        expect(x({ a: 'c', b: 'd' })).toEqual('/x/c/y')
        const { y } = asRouteMap({ y: { path } }, 'nl')
        expect(y({ a: 'c', b: 'd' })).toEqual('/a/d/b')
      })
    })
    describe('child routes', () => {
      test('minimal', () => {
        const { x } = asRouteMap({ x: { path: 'y', child: 'z' } })
        expect(x.child).toBeDefined()
        expect(x.child.path).toBe('z')
        expect(x()).toBe('/y')
        expect(x.child()).toBe('/y/z')
      })
      test('nested', () => {
        const { x } = asRouteMap({ x: { path: 'a', child: { path: 'b', nested: 'c' } } })
        expect(x.child.nested).toBeDefined()
        expect(x()).toBe('/a')
        expect(x.child()).toBe('/a/b')
        expect(x.child.nested()).toBe('/a/b/c')
      })
      test('localized leaf', () => {
        const map = {
          path: 'a',
          child: {
            path: 'b',
            nested: { path: { en: 'c', nl: 'd' } },
          }
        }
        const { x } = asRouteMap({ x: map }, 'en')
        expect(x()).toBe('/a')
        expect(x.child()).toBe('/a/b')
        expect(x.child.nested()).toBe('/a/b/c')
        const { y } = asRouteMap({ y: map }, 'nl')
        expect(y()).toBe('/a')
        expect(y.child()).toBe('/a/b')
        expect(y.child.nested()).toBe('/a/b/d')
      })
      test('localized branch', () => {
        const map = {
          path: 'a',
          child: {
            path: { en: 'b', nl: 'c' },
            nested: 'd',
          }
        }
        const { x } = asRouteMap({ x: map }, 'en')
        expect(x()).toBe('/a')
        expect(x.child()).toBe('/a/b')
        expect(x.child.nested()).toBe('/a/b/d')
        const { y } = asRouteMap({ y: map }, 'nl')
        expect(y()).toBe('/a')
        expect(y.child()).toBe('/a/c')
        expect(y.child.nested()).toBe('/a/c/d')
      })
      test('localized root', () => {
        const map = {
          path: { en: 'a', nl: 'b' },
          child: {
            path: 'c',
            nested: 'd',
          }
        }
        const { x } = asRouteMap({ x: map }, 'en')
        expect(x()).toBe('/a')
        expect(x.child()).toBe('/a/c')
        expect(x.child.nested()).toBe('/a/c/d')
        const { y } = asRouteMap({ y: map }, 'nl')
        expect(y()).toBe('/b')
        expect(y.child()).toBe('/b/c')
        expect(y.child.nested()).toBe('/b/c/d')
      })
      test('combined dynamic reverse routing', () => {
        const map = {
          path: ':a/b',
          child: {
            path: { en: ':c/e', nl: ':d/f' },
            nested: ':g/h',
          }
        }
        const { x } = asRouteMap({ x: map }, 'en')
        expect(x({ a: 'i' })).toBe('/i/b')
        expect(x.child({ a: 'i', c: 'j', d: 'k' })).toBe('/i/b/j/e')
        expect(x.child.nested({ a: 'i', c: 'j', d: 'k', g: 'l' })).toBe('/i/b/j/e/l/h')
        const { y } = asRouteMap({ y: map }, 'nl')
        expect(y({ a: 'i' })).toBe('/i/b')
        expect(y.child({ a: 'i', c: 'j', d: 'k' })).toBe('/i/b/k/f')
        expect(y.child.nested({ a: 'i', c: 'j', d: 'k', g: 'l' })).toBe('/i/b/k/f/l/h')
      })
    })
  })
})

describe('pick', () => {
  test('throw error for non-RouteMap', () => {
    expect(() => pick('', [{}])).toThrowError(/asRouteMap/)
  })
  test('route not found', () => {
    expect(pick('/x', [asRouteMap({ y: 'z' }), 'a'])).toBe(null)
  })
  describe('found', () => {
    test('static single', () => {
      expect(pick('/z', [asRouteMap({ x: 'z' }), 'a'])).toBe('a')
    })
    test('static multiple', () => {
      const map = asRouteMap({ a: 'c', b: 'd' })
      expect(pick('/c', [map, (_, x) => x])).toBe(map.a)
      expect(pick('/d', [map, (_, x) => x])).toBe(map.b)
    })
    test('static nested', () => {
      const map = asRouteMap({
        a: { path: 'a', c: 'c', },
        b: { path: 'b', d: 'd', }
      })
      expect(pick('/a/c', [map, (_, x) => x])).toBe(map.a.c)
      expect(pick('/b/d', [map, (_, x) => x])).toBe(map.b.d)
    })
    test('static multiple segments', () => {
      const map = asRouteMap({ a: 'a/c', b: 'b/d' })
      expect(pick('/a/c', [map, (_, x) => x])).toBe(map.a)
      expect(pick('/b/d', [map, (_, x) => x])).toBe(map.b)
      expect(pick('/a/d', [map, (_, x) => 'a'])).toBe(null)
    })
    test('static empty child', () => {
      const map = asRouteMap({ a: { path: 'a', b: '' } })
      expect(pick('/a', [map, (_, x) => x])).toBe(map.a.b)
      expect(pick('/a/b', [map, (_, x) => x])).toBe(null)
    })
    test('dynamic single', () => {
      expect(pick('/z', [asRouteMap({ x: ':y' }), x => x])).toEqual({ y: 'z' })
    })
    test('dynamic nested multiple end', () => {
      const map = asRouteMap({ a: 'a/:c', b: 'b/:d' })
      const [a, b] = pick('/a/e', [map, asTuple])
      expect(a).toEqual({ c: 'e' })
      expect(b).toBe(map.a)
      const [c, d] = pick('/b/f', [map, asTuple])
      expect(c).toEqual({ d: 'f' })
      expect(d).toBe(map.b)
      expect(pick('/c/f', [map, asTuple])).toBe(null)
      expect(pick('/a', [map, asTuple])).toBe(null)
      expect(pick('/a/b/c', [map, asTuple])).toBe(null)
    })
    test('dynamic nested multiple start', () => {
      const map = asRouteMap({ a: ':c/a', b: ':d/b' })
      const [a, b] = pick('/x/a', [map, asTuple])
      expect(a).toEqual({ c: 'x' })
      expect(b).toBe(map.a)
      const [c, d] = pick('/x/b', [map, asTuple])
      expect(c).toEqual({ d: 'x' })
      expect(d).toBe(map.b)
      expect(pick('/x/c', [map, asTuple])).toBe(null)
    })
    test('dynamic double', () => {
      const map = asRouteMap({ a: { path: ':a', b: ':b' } })
      expect(pick('/c/d', [map, x => x])).toEqual({ a: 'c', b: 'd' })
    })
    test('multiple dynamic', () => {
      const map = asRouteMap({ a: ':b/:c' })
      const [a, b] = pick('/d/e', [map, asTuple])
      expect(a).toEqual({ b: 'd', c: 'e' })
      expect(b).toBe(map.a)
    })
    test('static before dynamic', () => {
      const map = asRouteMap({ a: ':c', b: 'b', c: '' })
      const [a, b] = pick('/b', [map, asTuple])
      expect(a).toEqual({})
      expect(b).toBe(map.b)
      const [c, d] = pick('/d', [map, asTuple])
      expect(c).toEqual({ c: 'd' })
      expect(d).toBe(map.a)
      const [e, f] = pick('/', [map, asTuple])
      expect(e).toEqual({})
      expect(f).toBe(map.c)
    })
    test('static before dynamic nested end', () => {
      const map = asRouteMap({ a: 'a/:c', b: 'a/b' })
      const [a, b] = pick('/a/b', [map, asTuple])
      expect(a).toEqual({})
      expect(b).toBe(map.b)
      const [c, d] = pick('/a/c', [map, asTuple])
      expect(c).toEqual({ c: 'c' })
      expect(d).toBe(map.a)
    })
    test('static before dynamic mixed', () => {
      const map = asRouteMap({ a: 'a/:b', b: ':a/b' })
      expect(pick('/a', [map, asTuple])).toBe(null)
      expect(pick('/b', [map, asTuple])).toBe(null)
      expect(pick('/a/a', [map, asTuple])).toEqual([{ b: 'a' }, map.a])
      expect(pick('/a/b', [map, asTuple])).toEqual([{ b: 'b' }, map.a])
      expect(pick('/b/b', [map, asTuple])).toEqual([{ a: 'b' }, map.b])
      expect(pick('/b/a', [map, asTuple])).toBe(null)
    })
    test('wildcard', () => {
      const map = asRouteMap({ a: 'a/*' })
      expect(pick('/a', [map, asTuple])).toBe(null)
      expect(pick('/a/b', [map, asTuple])).toEqual([{ '*': 'b' }, map.a])
      expect(pick('/a/b/c', [map, asTuple])).toEqual([{ '*': 'b/c' }, map.a])
    })
    test('static before wildcard', () => {
      const map = asRouteMap({ a: '*', b: 'b', c: '' })
      expect(pick('/a', [map, asTuple])).toEqual([{ '*': 'a' }, map.a])
      expect(pick('/b', [map, asTuple])).toEqual([{}, map.b])
      expect(pick('/', [map, asTuple])).toEqual([{}, map.c])
    })
    test('static before wildcard nested', () => {
      const map = asRouteMap({ a: '*', b: 'b/*', c: 'b', d: 'b/b', e: 'a/b' })
      expect(pick('/a', [map, asTuple])).toEqual([{ '*': 'a' }, map.a])
      expect(pick('/b', [map, asTuple])).toEqual([{}, map.c])
      expect(pick('/b/a', [map, asTuple])).toEqual([{ '*': 'a' }, map.b])
      expect(pick('/b/b', [map, asTuple])).toEqual([{}, map.d])
      expect(pick('/a/b', [map, asTuple])).toEqual([{}, map.e])
      expect(pick('/a/b/c', [map, asTuple])).toEqual([{ '*': 'a/b/c' }, map.a])
    })
    test('dynamic before wildcard', () => {
      const map = asRouteMap({ a: '*', b: ':a' })
      expect(pick('/a', [map, asTuple])).toEqual([{ a: 'a' }, map.b])
    })
    test('dynamic before wildcard nested', () => {
      const map = asRouteMap({ a: '*', b: 'a/*', c: 'a/:a' })
      expect(pick('/a', [map, asTuple])).toEqual([{ '*': 'a' }, map.a])
      expect(pick('/b', [map, asTuple])).toEqual([{ '*': 'b' }, map.a])
      expect(pick('/a/b', [map, asTuple])).toEqual([{ a: 'b' }, map.c])
      expect(pick('/a/b/c', [map, asTuple])).toEqual([{ '*': 'b/c' }, map.b])
    })
    test('fallback wildcard nested children', () => {
      const map = asRouteMap({ a: '*', b: { path: 'b', c: 'c' } })
      expect(pick('/a', [map, asTuple])).toEqual([{ '*': 'a' }, map.a])
      expect(pick('/b', [map, asTuple])).toEqual([{}, map.b])
      expect(pick('/b/c', [map, asTuple])).toEqual([{}, map.b.c])
      expect(pick('/b/c/d', [map, asTuple])).toEqual([{ '*': 'b/c/d' }, map.a])

    })
    test('readable use case', () => {
      const map = asRouteMap({
        home: '',
        articles: {
          path: 'articles',

          article: {
            path: ':articleId',

            tab1: 'tab1',
            tab2: 'tab2',
            tabNotFound: '*',
          },
          special: {
            path: 'special',

            notFound: '*',
          }
        },
        notFound: '*',
      })
      const x = [map, asTuple]
      function empty(route) { return [{}, route]}
      function article(id, route) { return [{ articleId: id }, route] }

      expect(pick('/', x)).toEqual(empty(map.home))
      expect(pick('/none' , x)).toEqual([{ '*': 'none' }, map.notFound])
      expect(pick('/none/', x)).toEqual([{ '*': 'none' }, map.notFound])
      expect(pick('/none/really', x)).toEqual([{ '*': 'none/really' }, map.notFound])
      expect(pick('/none/really/', x)).toEqual([{ '*': 'none/really' }, map.notFound])
      expect(pick('/articles' , x)).toEqual(empty(map.articles))
      expect(pick('/articles/' , x)).toEqual(empty(map.articles))
      expect(pick('/articles/special' , x)).toEqual(empty(map.articles.special))
      expect(pick('/articles/special/' , x)).toEqual(empty(map.articles.special))
      expect(pick('/articles/special/none' , x)).toEqual([{ '*': 'none' }, map.articles.special.notFound])
      expect(pick('/articles/special/none/' , x)).toEqual([{ '*': 'none' }, map.articles.special.notFound])
      expect(pick('/articles/abc', x)).toEqual(article('abc', map.articles.article))
      expect(pick('/articles/abc/', x)).toEqual(article('abc', map.articles.article))
      expect(pick('/articles/abc/tab1' , x)).toEqual(article('abc', map.articles.article.tab1))
      expect(pick('/articles/abc/tab1/' , x)).toEqual(article('abc', map.articles.article.tab1))
      expect(pick('/articles/abc/tab2' , x)).toEqual(article('abc', map.articles.article.tab2))
      expect(pick('/articles/abc/tab2/' , x)).toEqual(article('abc', map.articles.article.tab2))
      expect(pick('/articles/abc/none' , x)).toEqual([{ articleId: 'abc', '*': 'none' }, map.articles.article.tabNotFound])
      expect(pick('/articles/abc/none/' , x)).toEqual([{ articleId: 'abc', '*': 'none' }, map.articles.article.tabNotFound])
      expect(pick('/articles/abc/none/really' , x)).toEqual([{ articleId: 'abc', '*': 'none/really' }, map.articles.article.tabNotFound])
      expect(pick('/articles/abc/none/really/' , x)).toEqual([{ articleId: 'abc', '*': 'none/really' }, map.articles.article.tabNotFound])
    })
    test('overrides', () => {
      const map = asRouteMap({ a: 'a', b: 'b' })
      expect(pick('/a', [map, 'a'], [map.b, 'b'])).toBe('a')
      expect(pick('/b', [map, 'a'], [map.b, 'b'])).toBe('b')
      expect(pick('/c', [map, 'a'], [map.b, 'b'])).toBe(null)
    })
    // TODO: should we allow routes to start (and end) with a /?
  })
})

describe('interpolate', () => {
  test('no interpolation', () => {
    expect(interpolate('')).toBe('')
    expect(interpolate('abc')).toBe('abc')
    expect(interpolate('abc/def')).toBe('abc/def')
    expect(interpolate('abc/def/ghi')).toBe('abc/def/ghi')
  })
  test('interpolation', () => {
    expect(interpolate(':a', { a: 'b' })).toBe('b')
    expect(interpolate('*', { '*': 'b' })).toBe('b')
    expect(interpolate(':a/b', { a: 'b' })).toBe('b/b')
    expect(interpolate('b/:a', { a: 'b' })).toBe('b/b')
    expect(interpolate('b/*', { '*': 'b' })).toBe('b/b')
    expect(interpolate(':a/:a', { a: 'b' })).toBe('b/b')
    expect(interpolate(':a/*', { a: 'b', '*': 'c' })).toBe('b/c')
    expect(interpolate('a/:a/b', { a: 'b' })).toBe('a/b/b')
    expect(interpolate('a/:a/b/*', { a: 'b', '*': 'c' })).toBe('a/b/b/c')
    expect(interpolate('a/abc:def/b', { def: 'ghi' })).toBe('a/abcghi/b')
    expect(interpolate('a/abc:def/b/*', { def: 'ghi', '*': 'j' })).toBe('a/abcghi/b/j')
  })
})

function asTuple(...args) { return args }
