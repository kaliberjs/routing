import { interpolate, pick } from './matching'

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

describe('pick', () => {
  test('no routes', () => {
    expect(pick()).toBe(null)
    expect(pick('/x')).toBe(null)
  })
  test('invalid route', () => {
    expect(() => pick('/x',  'x')).toThrowError(/invalid/)
    expect(() => pick('/x', '/x')).toThrowError(/invalid/)
    expect(() => pick('/x', [null])).toThrowError(/string/)
  })
  describe('static routes', () => {
    test('single route - no match', () => {
      expect(pick('/x', [ 'y', 'z'])).toBe(null)
      expect(pick('/x', ['/y', 'z'])).toBe(null)
    })
    test('single route - match', () => {
      expect(pick('/x', [ 'x', 'y'])).toBe('y')
      expect(pick('/x', ['/x', 'y'])).toBe('y')
    })
    test('multiple routes - no match', () => {
      expect(pick('/a', [ 'b', 'c'], [ 'd', 'e'])).toBe(null)
      expect(pick('/a', ['/b', 'c'], ['/d', 'e'])).toBe(null)
    })
    test('multiple routes - match', () => {
      expect(pick('/a', [ 'a', 'b'], [ 'c', 'd'])).toBe('b')
      expect(pick('/a', ['/a', 'b'], ['/c', 'd'])).toBe('b')
      expect(pick('/c', [ 'a', 'b'], [ 'c', 'd'])).toBe('d')
      expect(pick('/c', ['/a', 'b'], ['/c', 'd'])).toBe('d')
    })
  })
  describe('param routes', () => {
    test('single route', () => {
      expect(pick('/x', [ ':y', x => x])).toEqual({ y: 'x' })
      expect(pick('/x', ['/:y', x => x])).toEqual({ y: 'x' })
    })
    test('multiple routes', () => {
      expect(pick('/x/y', [ 'x/:y', x => 'a'], [ 'y/:y', x => 'b'])).toBe('a')
      expect(pick('/x/y', [ 'x/:y', x => 'a'], ['/y/:y', x => 'b'])).toBe('a')
      expect(pick('/x/y', ['/x/:y', x => 'a'], [ 'y/:y', x => 'b'])).toBe('a')
      expect(pick('/x/y', ['/x/:y', x => 'a'], ['/y/:y', x => 'b'])).toBe('a')
      expect(pick('/y/y', [ 'x/:y', x => 'a'], [ 'y/:y', x => 'b'])).toBe('b')
      expect(pick('/y/y', [ 'x/:y', x => 'a'], ['/y/:y', x => 'b'])).toBe('b')
      expect(pick('/y/y', ['/x/:y', x => 'a'], [ 'y/:y', x => 'b'])).toBe('b')
      expect(pick('/y/y', ['/x/:y', x => 'a'], ['/y/:y', x => 'b'])).toBe('b')
    })
    test('multiple params', () => {
      expect(pick('/x/y', [ ':a/:b', x => x])).toEqual({ a: 'x', b: 'y' })
      expect(pick('/x/y', ['/:a/:b', x => x])).toEqual({ a: 'x', b: 'y' })
    })
    test('other chars in segment', () => {
      expect(pick('/abcx', [ 'abc:a', x => x])).toBe(null)
      expect(pick('/abcx', ['/abc:a', x => x])).toBe(null)
    })
  })
  describe('wildcard', () => {
    test('not as last segment', () => {
      expect(pick('/x/y', [ '*/y', x => x])).toBe(null)
      expect(pick('/x/y', ['/*/y', x => x])).toBe(null)
      expect(pick('/*/y', [ '\\*/y', x => x])).toEqual({})
      expect(pick('/*/y', ['/\\*/y', x => x])).toEqual({})
    })
    test('as last segment', () => {
      expect(pick('/', [ '*', x => x])).toEqual({ '*': '/' })
      expect(pick('/', ['/*', x => x])).toEqual({ '*': '/' })
      expect(pick('/x/y', [ '*', x => x])).toEqual({ '*': '/x/y' })
      expect(pick('/x/y', ['/*', x => x])).toEqual({ '*': '/x/y' })
      expect(pick('/x/y', [ 'x/*', x => x])).toEqual({ '*': '/y' })
      expect(pick('/x/y', ['/x/*', x => x])).toEqual({ '*': '/y' })
    })
    test('with params', () => {
      expect(pick('/x/y', [ ':x/*', x => x])).toEqual({ x: 'x', '*': '/y' })
      expect(pick('/x/y', ['/:x/*', x => x])).toEqual({ x: 'x', '*': '/y' })
    })
  })
  describe('route ordering', () => {
    test('static before dynamic', () => {
      expect(pick('/', [ ':x', 'a'], [ '', 'b'])).toBe('b')
      expect(pick('/', ['/:x', 'a'], [ '', 'b'])).toBe('b')
      expect(pick('/', [ ':x', 'a'], ['/', 'b'])).toBe('b')
      expect(pick('/', ['/:x', 'a'], ['/', 'b'])).toBe('b')
      expect(pick('/x', [ ':x', 'a'], [ 'x', 'b'])).toBe('b')
      expect(pick('/x', ['/:x', 'a'], [ 'x', 'b'])).toBe('b')
      expect(pick('/x', [ ':x', 'a'], ['/x', 'b'])).toBe('b')
      expect(pick('/x', ['/:x', 'a'], ['/x', 'b'])).toBe('b')
      expect(pick('/x/y', [ ':x/y', 'a'], [ 'x/y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/:x/y', 'a'], [ 'x/y', 'b'])).toBe('b')
      expect(pick('/x/y', [ ':x/y', 'a'], ['/x/y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/:x/y', 'a'], ['/x/y', 'b'])).toBe('b')
      expect(pick('/x/y', [ 'x/:y', 'a'], [ 'x/y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/x/:y', 'a'], [ 'x/y', 'b'])).toBe('b')
      expect(pick('/x/y', [ 'x/:y', 'a'], ['/x/y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/x/:y', 'a'], ['/x/y', 'b'])).toBe('b')
    })
    test('static before *', () => {
      expect(pick('/', [ '*', 'a'], [ '', 'b'])).toBe('b')
      expect(pick('/', ['/*', 'a'], [ '', 'b'])).toBe('b')
      expect(pick('/', [ '*', 'a'], ['/', 'b'])).toBe('b')
      expect(pick('/', ['/*', 'a'], ['/', 'b'])).toBe('b')
      expect(pick('/x', [ '*', 'a'], [ 'x', 'b'])).toBe('b')
      expect(pick('/x', ['/*', 'a'], [ 'x', 'b'])).toBe('b')
      expect(pick('/x', [ '*', 'a'], ['/x', 'b'])).toBe('b')
      expect(pick('/x', ['/*', 'a'], ['/x', 'b'])).toBe('b')
      expect(pick('/x/y', [ 'x/*', 'a'], [ 'x/y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/x/*', 'a'], [ 'x/y', 'b'])).toBe('b')
      expect(pick('/x/y', [ 'x/*', 'a'], ['/x/y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/x/*', 'a'], ['/x/y', 'b'])).toBe('b')
    })
    test('dynamic before *', () => {
      expect(pick('/x', [ '*', 'a'], [ ':x', 'b'])).toBe('b')
      expect(pick('/x', [ '*', 'a'], ['/:x', 'b'])).toBe('b')
      expect(pick('/x', ['/*', 'a'], [ ':x', 'b'])).toBe('b')
      expect(pick('/x', ['/*', 'a'], ['/:x', 'b'])).toBe('b')
      expect(pick('/x/y', [ '*', 'a'], [ 'x/:y', 'b'])).toBe('b')
      expect(pick('/x/y', [ '*', 'a'], ['/x/:y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/*', 'a'], [ 'x/:y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/*', 'a'], ['/x/:y', 'b'])).toBe('b')
      expect(pick('/x/y', [ 'x/*', 'a'], [ 'x/:y', 'b'])).toBe('b')
      expect(pick('/x/y', [ 'x/*', 'a'], ['/x/:y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/x/*', 'a'], [ 'x/:y', 'b'])).toBe('b')
      expect(pick('/x/y', ['/x/*', 'a'], ['/x/:y', 'b'])).toBe('b')
    })
  })
  describe('readable use case', () => {
    const routes = [
      ['/articles/:articleId/*', '404 - tab'],
      ['/*', '404 - general'],
      ['/articles/:articleId/tab1', 'tab1'],
      ['/', 'home'],
      ['/articles/', 'articles'],
      ['/articles/:articleId/tab2', 'tab2'],
      ['/articles/:articleId', 'article'],
      ['/articles/special/*', '404 - special'],
      ['/articles/special', 'special'],
    ]
    expect(pick('/', ...routes)).toBe('home')
    expect(pick('/none' , ...routes)).toBe('404 - general')
    expect(pick('/none/', ...routes)).toBe('404 - general')
    expect(pick('/none/really' , ...routes)).toBe('404 - general')
    expect(pick('/none/really/', ...routes)).toBe('404 - general')
    expect(pick('/articles' , ...routes)).toBe('articles')
    expect(pick('/articles/', ...routes)).toBe('articles')
    expect(pick('/articles/special' , ...routes)).toBe('special')
    expect(pick('/articles/special/', ...routes)).toBe('special')
    expect(pick('/articles/special/none' , ...routes)).toBe('404 - special')
    expect(pick('/articles/special/none/', ...routes)).toBe('404 - special')
    expect(pick('/articles/abc', ...routes)).toBe('article')
    expect(pick('/articles/abc/', ...routes)).toBe('article')
    expect(pick('/articles/abc/tab1' , ...routes)).toBe('tab1')
    expect(pick('/articles/abc/tab1/', ...routes)).toBe('tab1')
    expect(pick('/articles/abc/tab2' , ...routes)).toBe('tab2')
    expect(pick('/articles/abc/tab2/', ...routes)).toBe('tab2')
    expect(pick('/articles/abc/none' , ...routes)).toBe('404 - tab')
    expect(pick('/articles/abc/none/', ...routes)).toBe('404 - tab')
    expect(pick('/articles/abc/none/really' , ...routes)).toBe('404 - tab')
    expect(pick('/articles/abc/none/really/', ...routes)).toBe('404 - tab')
  })
})
