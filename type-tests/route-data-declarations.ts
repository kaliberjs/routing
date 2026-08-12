import type {
  AsRouteMap,
  Route,
  RouteActiveOptions,
  RouteDataDeclarations,
  RouteMatch,
  RouteParams,
} from '../src/types.ts'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T

type ParentData = { parent: 'parent' }
type SectionData = { section: 'section' }
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
    stringLeaf: 'string/:slug'
    section: {
      path: 'section'
      data: SectionData
      detail: {
        path: ':id'
        data: LeafData
      }
    }
  }
  plain: {
    path: 'plain'
    child: {
      path: ''
    }
  }
  explicitlyUndefined: {
    path: 'explicitly-undefined'
    data: undefined
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

type OwnDataIsPreserved = Assert<Equal<
  TestRouteMap['app']['home']['data'],
  LeafData
>>

type StringChildDeclarations = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['app']['stringLeaf']>,
  readonly [ParentData, undefined]
>>

type StringChildDataIsUndefined = Assert<Equal<
  TestRouteMap['app']['stringLeaf']['data'],
  undefined
>>

type StringChildParamsIncludeAncestors = Assert<Equal<
  Parameters<TestRouteMap['app']['stringLeaf']>,
  [{ countryAndLanguage: string, slug: string }]
>>

type DeepDeclarationsStayOrdered = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['app']['section']['detail']>,
  readonly [ParentData, SectionData, LeafData]
>>

type DeepParamsIncludeAncestors = Assert<Equal<
  Parameters<TestRouteMap['app']['section']['detail']>,
  [{ countryAndLanguage: string, id: string }]
>>

type ParameterlessRouteParamsAreEmpty = Assert<Equal<
  RouteParams<TestRouteMap['root']>,
  {}
>>

type ParameterizedRouteParamsAreExact = Assert<Equal<
  RouteParams<TestRouteMap['app']['section']['detail']>,
  { countryAndLanguage: string, id: string }
>>

type RouteMatchKeepsRouteAndParamsCorrelated = Assert<Equal<
  RouteMatch<TestRouteMap['app']['home'] | TestRouteMap['app']['stringLeaf']>,
  | {
    route: TestRouteMap['app']['home']
    params: { countryAndLanguage: string }
  }
  | {
    route: TestRouteMap['app']['stringLeaf']
    params: { countryAndLanguage: string, slug: string }
  }
>>

type ActiveRouteParamsArePartial = Assert<Equal<
  NonNullable<RouteActiveOptions<TestRouteMap['app']['section']['detail']>['params']>,
  { countryAndLanguage?: string, id?: string }
>>

type MissingDataStaysUndefined = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['plain']['child']>,
  readonly [undefined, undefined]
>>

type ExplicitUndefinedStaysUndefined = Assert<Equal<
  RouteDataDeclarations<TestRouteMap['explicitlyUndefined']>,
  readonly [undefined]
>>

type ParameterlessGeneratedRouteSatisfiesPublicRoute = Assert<
  TestRouteMap['root'] extends Route ? true : false
>

type ParameterizedGeneratedRouteSatisfiesPublicRoute = Assert<
  TestRouteMap['app']['home'] extends Route ? true : false
>

type KeepConcreteRoute<R extends Route> = R
type RouteConstraintPreservesParameters = Assert<Equal<
  Parameters<KeepConcreteRoute<TestRouteMap['app']['home']>>,
  [{ countryAndLanguage: string }]
>>

type PublicRouteHasNoInventedAncestry = Assert<Equal<
  RouteDataDeclarations<Route>,
  readonly []
>>

type UnrelatedObjectsHaveNoAncestry = Assert<Equal<
  RouteDataDeclarations<{ data: ParentData }>,
  readonly []
>>

type RouteUnionsPreserveEachChain = Assert<Equal<
  RouteDataDeclarations<
    TestRouteMap['app']['home'] |
    TestRouteMap['app']['stringLeaf']
  >,
  readonly [ParentData, LeafData] | readonly [ParentData, undefined]
>>

export type RouteTypeAssertions = {
  rootDeclarations: RootDeclarations
  parentDeclarations: ParentDeclarations
  leafDeclarations: LeafDeclarations
  leafParams: LeafParams
  ownDataIsPreserved: OwnDataIsPreserved
  stringChildDeclarations: StringChildDeclarations
  stringChildDataIsUndefined: StringChildDataIsUndefined
  stringChildParamsIncludeAncestors: StringChildParamsIncludeAncestors
  deepDeclarationsStayOrdered: DeepDeclarationsStayOrdered
  deepParamsIncludeAncestors: DeepParamsIncludeAncestors
  parameterlessRouteParamsAreEmpty: ParameterlessRouteParamsAreEmpty
  parameterizedRouteParamsAreExact: ParameterizedRouteParamsAreExact
  routeMatchKeepsRouteAndParamsCorrelated: RouteMatchKeepsRouteAndParamsCorrelated
  activeRouteParamsArePartial: ActiveRouteParamsArePartial
  missingDataStaysUndefined: MissingDataStaysUndefined
  explicitUndefinedStaysUndefined: ExplicitUndefinedStaysUndefined
  parameterlessGeneratedRouteSatisfiesPublicRoute: ParameterlessGeneratedRouteSatisfiesPublicRoute
  parameterizedGeneratedRouteSatisfiesPublicRoute: ParameterizedGeneratedRouteSatisfiesPublicRoute
  routeConstraintPreservesParameters: RouteConstraintPreservesParameters
  publicRouteHasNoInventedAncestry: PublicRouteHasNoInventedAncestry
  unrelatedObjectsHaveNoAncestry: UnrelatedObjectsHaveNoAncestry
  routeUnionsPreserveEachChain: RouteUnionsPreserveEachChain
}
