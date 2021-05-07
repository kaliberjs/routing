export function asRouteMap<
  N extends Narrowable,
  T extends { [k: string]: N | T | [] }// & RouteMapInput
>(input: T): AsRouteMap<T>

export function pick<
  A,
  X extends Narrowable,
  B extends Array<[Route, ((p: object, r: Route) => X) | X]>
>(
  pathname: string,
  [routeMap, defaultHandler]: [RouteMap, HandlerOf<A> | A],
  ...overrides: B
): ReturnTypeOf<A> | ReturnTypesOf<B>

export function pickRoute(pathname: string, routeMap: RouteMap): { params: object, route: Route } | null

export function asRouteChain(route: Route): Array<Route>

export const routeSymbol: unique symbol
export const routeMapSymbol: unique symbol

type HandlerOf<A> =
  A extends (...args: any) => infer B ? ((params?: object, route?: Route) => B) :
  never
type ReturnTypesOf<A> =
  A extends [[Route, infer B], ...infer C] ? ReturnTypeOf<B> | ReturnTypesOf<C> :
  never
type ReturnTypeOf<A> = A extends (...args: any) => any ? ReturnType<A> : A

// https://github.com/microsoft/TypeScript/issues/30680
type Narrowable = string | number | boolean | symbol | object | undefined | void | null | {}

type RouteMapInput = { [name: string]: RouteInput }
type RouteInput = string | (RouteInputChildren & RouteInputObject) | RouteInputObject
type RouteInputObject = { path: Path, data?: any }
type RouteInputChildren = { [K in Exclude<keyof RouteInputObject, string>]: RouteInput }

type AsRouteMap<A> =
  { [K in keyof A]: AsRoute<A[K], {}> } &
  { [routeMapSymbol]: { children: { [K in keyof A]: AsRoute<A[K], {}> } } }
type AsRoute<A, Params> = ((params?: Params & AsParams<A>) => string) & (
  A extends string ? AsRouteProps<{ path: A, data: undefined }> :
  A extends (RouteInputChildren & RouteInputObject) ? AsRouteChildren<Omit<A, keyof RouteInputObject>, Params & AsParams<A>> & AsRouteProps<A> :
  A extends RouteInputObject ? AsRouteProps<A> :
  never
)
type AsRouteChildren<A, Params> = { [K in keyof A]: AsRoute<A[K], Params> }
type AsRouteProps<A extends RouteInputObject> = {
  path: A['path'],
  data: A['data'],
  [routeSymbol]: { parent: Route },
  toString(): string,
}
type AsParams<A> = LanguageSupport & (
  A extends string ? { [K in StringAsParams<A>]: string } :
  A extends RouteInputObject ? { [K in StringAsParams<A['path']>]: string } :
  never
)
type StringAsParams<A> =
  A extends { [language: string]: infer B } ? StringAsParams<B> :
  A extends `:${infer B}/${infer C}` ? B | StringAsParams<C> :
  A extends `:${infer B}` ? B :
  A extends `${infer B}/${infer C}` ? StringAsParams<C> :
  A extends `*` ? '*' :
  never
type LanguageSupport = { language?: string }
