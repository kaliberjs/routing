import { Expand } from './machinery/typescript-utils.ts'
import type { routeSymbol, routeMapSymbol } from './routeMap.js'

/** Carries route declarations through the generated type without adding runtime data. */
declare const routeDataDeclarationsSymbol: unique symbol

type RouteTypeMetadata<DataDeclarations extends readonly unknown[]> = {
  readonly [routeDataDeclarationsSymbol]: DataDeclarations,
}

export type RouteMap = { [routeMapSymbol]: any }
export type Route = ReverseRoute & RouteProps & { [routeSymbol]: any }
/** The root-to-route `data` declarations retained by `AsRouteMap`. */
export type RouteDataDeclarations<R> =
  R extends RouteTypeMetadata<infer DataDeclarations> ? DataDeclarations : readonly []
export type ReverseRoute = (params?: object) => string
export type RouteProps = {
  data?: any,
  path: Path,
  toString(): string,
}

export type RouteInputChildren = { [K in Exclude<keyof RouteInputObject, string>]: RouteInput }
type RouteInput = string | RouteInputWithChildren
type RouteInputWithChildren = RouteInputChildren & RouteInputObject
type RouteInputObject = { path: Path, data?: any }
type Path = string | { [locale: string]: string }

type EmptyParams = {}

export type AsRouteMap<Input extends RouteInputChildren, LocaleParamName extends string = 'language'> =
  ReturnType<typeof asRouteMap<Input, LocaleParamName>>

export type Config = {
  trailingSlash?: boolean
  localeParamName?: string
}

export type ExtractLocaleParamName<T extends Config> =
  T['localeParamName'] extends infer X
    ? (string extends X ? 'language' : X)
    : never

// Keep LocaleParamName local instead of threading it through every helper.
function asRouteMap<Input extends RouteInputChildren, LocaleParamName extends string>() {

  type AsRouteMap<Input extends RouteInputChildren> =
    AsRouteChildren<Input, EmptyParams, readonly []> &
    { [routeMapSymbol]: any }

  type AsRouteChildren<
    Input extends RouteInputChildren,
    PreviousParams,
    PreviousDataDeclarations extends readonly unknown[],
  > = {
    [K in keyof Input]: Expand<AsRoute<
      Input[K],
      PreviousParams & AsParams<Input[K]>,
      PreviousDataDeclarations
    >>
  }

  type AsRoute<Input, Params, PreviousDataDeclarations extends readonly unknown[]> =
    AsReverseRoute<Params> & (
      Input extends string
        ? AsRouteProps<
          { path: Input, data: undefined },
          readonly [...PreviousDataDeclarations, undefined]
        >
        : Input extends RouteInputWithChildren
          ? AsRouteWithChildren<Input, Params, PreviousDataDeclarations>
          : never
    )

  type AsReverseRoute<Params> =
    keyof Params extends never ? () => string :
    (params: Expand<Params>) => string

  type AsRouteWithChildren<
    Input extends RouteInputWithChildren,
    Params,
    PreviousDataDeclarations extends readonly unknown[],
  > =
    AsRouteProps<Input, DataDeclarationsWith<PreviousDataDeclarations, Input>> &
    AsRouteChildren<
      Omit<Input, keyof RouteInputObject>,
      Params,
      DataDeclarationsWith<PreviousDataDeclarations, Input>
    >

  type AsRouteProps<
    Input extends RouteInputObject,
    DataDeclarations extends readonly unknown[],
  > = {
    path: Input['path'],
    data: OwnData<Input>,
    toString(): string,
    [routeSymbol]: any,
  } & RouteTypeMetadata<DataDeclarations>

  type DataDeclarationsWith<
    PreviousDataDeclarations extends readonly unknown[],
    Input extends RouteInputObject,
  > = readonly [...PreviousDataDeclarations, OwnData<Input>]

  type OwnData<Input extends RouteInputObject> =
    'data' extends keyof Input ? Input['data'] : undefined

  type AsParams<Input> = (
    Input extends string ? { [K in PathAsParamNames<Input>]: string } :
    Input extends RouteInputObject ? { [K in PathAsParamNames<Input['path']>]: string } :
    never
  )

  type PathAsParamNames<Input> =
    Input extends { [locale: string]: infer B } ? LocaleParamName | PathAsParamNames<B> :
    Input extends `:${infer B}/${infer C}` ? B | PathAsParamNames<C> :
    Input extends `:${infer B}` ? B :
    Input extends `${infer B}/${infer C}` ? PathAsParamNames<C> :
    Input extends `*` ? '*' :
    never

  return (null as Expand<AsRouteMap<Input>>)
}
