import type { AsRouteMap, RouteDataDeclarations } from '../src/types.ts'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T

type ParentData = { parent: 'parent' }
type LeafData = { leaf: 'leaf' }

type TestRouteMap = AsRouteMap<{
  root: ''
  app: {
    path: ':countryAndLanguage'
    data: ParentData
    home: {
      path: ''
      data: LeafData
    }
  }
  plain: {
    path: 'plain'
    child: {
      path: ''
    }
  }
}, 'countryAndLanguage'>

type RootDeclarations = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['root']>,
  readonly [undefined]
>>

type ParentDeclarations = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['app']>,
  readonly [ParentData]
>>

type LeafDeclarations = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['app']['home']>,
  readonly [ParentData, LeafData]
>>

type LeafParams = Assert<Equal<
  Parameters<TestRouteMap['app']['home']>,
  [{ countryAndLanguage: string }]
>>

type MissingDataStaysUndefined = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['plain']['child']>,
  readonly [undefined, undefined]
>>

export type RouteTypeAssertions = {
  rootDeclarations: RootDeclarations
  parentDeclarations: ParentDeclarations
  leafDeclarations: LeafDeclarations
  leafParams: LeafParams
  missingDataStaysUndefined: MissingDataStaysUndefined
}
