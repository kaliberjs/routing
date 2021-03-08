type RouteMapInput = {
  [name: string]: RouteInput
}
type RouteInput = string | (RouteInputChildren & RouteInputObject) | RouteInputObject
type RouteInputObject = {
  path: string | { [language: string]: string },
  data?: any
}
type RouteInputChildren = {
  [K in Exclude<keyof RouteInputObject, string>]: RouteInput
}

type ReverseRoute<A> = (params?: A) => string

type RouteMap<A> = {
  [K in keyof A]: AsRoute<A[K], {}>
}
type AsRoute<A, Params> = ReverseRoute<Params & AsParams<A>> & (
  A extends string ? AsRouteProps<{ path: A }> :
  A extends (RouteInputChildren & RouteInputObject) ? RouteChildren<Omit<A, keyof RouteInputObject>, Params & AsParams<A>> & AsRouteProps<A> :
  A extends RouteInputObject ? AsRouteProps<A> :
  never
)
type RouteChildren<A, Params> = {
  [K in keyof A]: AsRoute<A[K], Params>
}
type AsRouteProps<A extends RouteInputObject> = {
  [routeSymbol]: { path: A['path'], data: A['data'] }
}
type AsParams<A> =
  A extends string ? StringAsParams<A> :
  A extends RouteInputObject ? StringAsParams<A['path']> :
  never

type StringAsParams<A> = A extends `:${infer B}`? { [K in B]: string } : {}

// https://github.com/microsoft/TypeScript/issues/30680
type Narrowable = string | number | boolean | symbol | object | undefined | void | null | {}
export function asRouteMap<N extends Narrowable, T extends { [k: string]: N | T | [] }>(input: T):RouteMap<T>

export const routeSymbol: unique symbol
