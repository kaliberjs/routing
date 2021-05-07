declare const React: typeof import('react')
declare const routeSymbol: typeof import('src/routeMap').routeSymbol
declare const routeMapSymbol: typeof import('src/routeMap').routeMapSymbol

type RouteMap = { [route: string]: Route, [routeMapSymbol]: true }
type Route = ReverseRoute & ((RouteChildren & RouteProps) | RouteProps)
type ReverseRoute = (params?: object) => string
type RouteChildren = { [child: string]: Route }
type RouteProps = {
  data?: any,
  path: Path,
  [routeSymbol]: { parent: Route },
  toString(): string,
}
type Path = string | { [language: string]: string }
