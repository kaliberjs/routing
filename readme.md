# @kaliber/routing

This is a routing library for React.

It has been designed with portability (of components), server side rendering and reverse routing in mind.

---
---
## Usage

_Please see the `examples` directory for working examples._

Create a route map:

```js
import { asRouteMap } from '@kaliber/routing'

export const routeMap = asRouteMap({
  home: '',
  articles: {
    path: 'articles',

    list: {
      path: '',
      data: fetchArticles,
    }
    article: {
      path: ':article',
      data: fetchArticle,
    },
  },
  notFound: '*'
})
```

Pick a route at the server:

```js
import { pick } from '@kaliber/routing'
import { routeMap } from './routeMap'

async function resolve(pathname) {
  const result = await pick(pathname,
    [routeMap, async (params, route) => ({ status: 200, data: await route.data(match.params) })],
    [routeMap.notFound, { status: 404 }],
  )
  return result
}
```

Handle the routes in the universal components:

```js
import { LocationProvider } from '@kaliber/routing'
import { routeMap } from './routeMap'

export function UniversalApp({ initialLocation }) {
  return (
    <LocationProvider {...{ initialLocation, routeMap }} >
      <Page />
    </LocationProvider>
}

function Page() {
  const { matchRoutes } = useRouting()

  return matchRoutes(
    [routeMap.home, <Home />],
    [routeMap.articles, <Articles />],
    [routeMap.articles.article, params => <Article {...{ params }} />],
    [routeMap.notFound, <NotFound />]
  )
}

function Articles() {
  return (
    <div>
      <h1>Articles</h1>
      <ul>
        <li><Link to={routeMap.articles.article({ articleId: 'article1' })}>Article 1</Link></li>
        <li><Link to={routeMap.articles.article({ articleId: 'article2' })}>Article 2</Link></li>
      </ul>
    </div>
  )
}

...
```
---
---
## Route map

A route map defines the routing structure of the application. It is created by passing a map of routes into the `asRouteMap` function:

```js
asRouteMap(
  {
    route1: ...,
    route2: ...,
  },
  { trailingSlash: true } // reverse route behavior, default is false
)
```

The rules of `asRouteMap` is a structure that is similar to the original structure with a few differences:

- Each route is now also a `function` that can be called to determine the reverse route
- Each route now has a `path` property (even the routes that you defined as a `string`)
---
### Route structure

A route can have multiple forms. The simplest is `string` which simply determines the path of the route:

```js
{ route1: '...' }
```

In some cases you want to attach data to a route. This library does not make any assumptions about the data of a route. In order to attach data to a route your route definition needs to become an object:

```js
{ route1: { path: '...', data: ... } }
```

Routes can have children:

```js
{
  route1: {
    path: '...',

    child1: ...,
    child2: ...,
  }
}
```
---
### Route path

A route path can be a `string` or an `object`. When it is a `string` we make a distinction between the following patterns:

- `'...'`: a `static` pattern that will match exactly
- `':...'`: a `param` pattern, the name after the `:` will be the name of the `param`
- `'*'`: a `*` pattern, this will match anything (including `/`)

Note that route paths can consist of more than one path segment, a few examples:

- `'something/:param'` - A route that will match `'/something/abc'` with `param` set to `'abc'`
- `'something/*` - A route that will match `'/something/abc/def'` with `*` set to `'abc/def'`
- `':param/something'` - A route that will match `'/abc/something'` with `param` set to `'abc'`

Route paths can also be objects, this allows you to use different paths for different languages:

```js
route1: {
  path: ':language',

  route2: {
    path: { en: 'english', nl: 'dutch' }
  }
}
```

The name of a parent routes' path param should be set to `language` in order for this pattern to work. If you want to use a different name you need to provide this as configuration to the route map:

```js
asRouteMap(
  {
    ...
  },
  { languageParamName: 'locale' }
)
```

---
### Reverse route

After converting the object to a route map, the routes have become functions that can be used to determine the reverse route.

```js
const map = asRouteMap({
  route1: {
    path: 'route1',

    route2: ':route2'
  }
})

console.log(map.route1()) // "/route1"
console.log(map.route1.route2({ route2: 'route2' })) // "/route1/route2"
```

Note that you can force the reverse routes to have a trailing slash with the option `trailingSlash` set to `true`:

```js
asRouteMap(
  {
    ...
  },
  { trailingSlash: true }
)
```

---
---
## Matching

There are a few methods used for matching routes, some are used on the client, others at the server side.

- Server
  - `pickRoute`
  - `pick`
- Client
  - `useRouting` (with `matchRoute` and `matchRoutes`)
  - `useLocationMatch`
  - `usePick` (with `pick`)
  - `useRouteActive`

---
### `pickRoute`

```js
function pickRoute(pathname: string, routeMap: RouteMap): { params: object, route: Route } | null
```

Picks a `Route` from the `RouteMap` and returns it together with a `params` object if matched. If no route was matched this method returns `null`.

---
### `pick`

```js
function pick(pathname: string,
  [routeMap: RouteMap, defaultHandler: A | (params, route) => A],
  ...overrides: Array<[route: Route, handler: B | (params, route) => B]>
): A | B
```

Convenience function that allows you to perform easy overrides of specific routes in a structured fashion. An example:

```js
return pick(location.pathname,
  [routeMap, { status: 200 }],
  [routeMap.notFound, { status: 404 }],
)
```
---
### `useRouting`

```js
function useRouting(): {
  matchRoute: (route: Route, handler: A | (params) => A) => A,
  matchRoutes: (...routes: Array<[route: Route, handler: A | (params) => A]>) => A,
}
```
Mainly used inside the render tree. Allows you to render based on a matched route.

---

### `useLocationMatch`

```js
function useLocationMatch(): { params: object, route: Route } | null
```

Similar to `pickRoute` it returns the matched `Route` with it's `params` when a match was found, `null` otherwise. A small difference is that the returned route has the `params` partially applied to its reverse route function. This means that you do not need to supply any parameters that would be required by any parent routes.

---
### `usePick`

```js
function usePick(): <R extends Route>(...routes: Array<R>) => { route: R, params: RouteParams<R> } | null
```

Returns a function that lets you choose a route from an array of routes, or `null` if nothing matched. The selected route is found by traversing the parents of the picked route (`useLocationMatch`).

The selected route and its parameters remain correlated. Narrowing `result.route` therefore narrows `result.params` to the parameters accepted by that route.

---
### `useRouteActive`

```js
function useRouteActive<R extends Route>(route: R, {
  exact?: boolean,
  params?: Partial<RouteParams<R>>,
} = {}): boolean
```

Reports whether `route` is the current route or one of its ancestors. Set `exact` to only match the current route. Supply `params` to require some or all of that route's parameters to match as well.

```js
const jobsSectionIsActive = useRouteActive(routeMap.app.jobs)
const dutchJobsAreActive = useRouteActive(
  routeMap.app.jobs,
  { params: { language: 'nl' } }
)
```

---
---
## Navigation

### `Link`

```js
function Link({
  to: string,
  prefetch: 'none' | 'intent' | {
    run?: ({ to, href, trigger: 'pointer' | 'focus' | 'touch' }) => void | Promise<void>,
    intentDelay?: number,
  },
  replace: boolean,
  state: object,
  anchorProps: object,
  children,
})
```

This is essentially an `<a href="...">` that uses the history API. The `anchorProps` are directly set on the `a` element.

If you want to prevent the default click handling in certain situations you can supply `anchorProps.onClick` and call `event.preventDefault()` from the event handler.

Set `prefetch='intent'` to opt a link into best-effort prefetching. The link will prefetch once on hover intent, keyboard focus, or touch start. You can also supply an object to override the root `run` function or the `intentDelay` for a single link.

---
### `useNavigate`

```js
function useNavigate(): (to: number | string, { state: object, replace?: boolean }) => void
```

Allows you to navigate without using the `Link` component. Note that a call to the resulting function will not work when rendering on the server.

---
### Prefetching

Prefetching is intentionally cache-agnostic. `@kaliber/routing` only decides when to prefetch, not what should be cached or invalidated.

Provide a default prefetcher at the root:

```js
<LocationProvider
  initialLocation={location}
  routeMap={routeMap}
  prefetch={{
    run: ({ to, href, trigger }) => {
      console.log('prefetch', { to, href, trigger })
    },
    intentDelay: 80,
  }}
>
  <Page />
</LocationProvider>
```

Then opt links into intent prefetching:

```js
<Link to={routeMap.articles.article({ articleId })} prefetch='intent'>
  {title}
</Link>
```

You can override the root prefetcher per link:

```js
<Link
  to={routeMap.articles.article({ articleId })}
  prefetch={{
    run: ({ to }) => warmArticleCache(to),
    intentDelay: 0,
  }}
>
  {title}
</Link>
```

#### Route-chain prefetch example

If your app uses `route.data`, you can warm route data by matching the destination and traversing the route chain:

```js
import { asRouteChain, pickRoute } from '@kaliber/routing'

function createRouteDataPrefetch({ routeMap, cache }) {
  return async function run({ to }) {
    const match = pickRoute(to, routeMap)
    if (!match) return

    const { route, params } = match
    await asRouteChain(route).reduce(
      async (previousDataPromise, route) => {
        const previousData = await previousDataPromise
        if (typeof route.data !== 'function') return previousData

        const data = await route.data({ ...params, ...previousData })
        cache.set(route(params), data)

        return { ...previousData, ...data }
      },
      Promise.resolve({})
    )
  }
}
```

#### TanStack Query example

If your app already has a query cache, use the link prefetch callback to warm it:

```js
import { pickRoute } from '@kaliber/routing'

const prefetch = {
  run: ({ to }) => {
    const match = pickRoute(to, routeMap)
    if (match?.route !== routeMap.articles.article) return

    return queryClient.prefetchQuery({
      queryKey: ['article', match.params.articleId],
      queryFn: () => fetchArticle(match.params),
      staleTime: 30_000,
    })
  },
}
```

---
---
## Other utilities

### `LocationProvider`

```js
function LocationProvider({
  basePath: string,
  initialLocation: { pathname: string, search: string, hash: string },
  prefetch?: {
    run: ({ to, href, trigger: 'pointer' | 'focus' | 'touch' }) => void | Promise<void>,
    intentDelay?: number,
  },
  routeMap: RouteMap,
  children,
})
```

This provides the context for all of the routing related hooks. It detects the difference between client and server side rendering: if `window` is undefined it will use the `initialLocation` for the match.

Links only prefetch when they opt in via `prefetch='intent'` or a link-specific `prefetch` object. The root `prefetch` prop defines the default behavior for those links.

---
### `StaticLocationProvider`

```js
function StaticLocationProvider({
  location: { pathname: string, search: string, hash: string },
  children,
})
```

This provides a static location context for all of the routing related hooks of its children. It can be used to render content based on a location that is not the current location. This is useful for animations.

---
### `asRouteChain`

```js
function asRouteChain(route: Route): Array<Route>
```

Returns an array of all routes from the root of the route map up to (and including) the given route. This can be useful when rendering on the server and loading all required data.

---
### `useLocation`

```js
function useLocation(): { pathname: string, search: string, hash: string, state?: object }
```

Returns the current location.

---

### `useHistory`

```js
function useHistory(): { location, listen(listener), navigate(to, { state, replace }) }
```

Returns a reference to the history wrapper. Note that the resulting object can not be used in a non browser context. Also note that the navigate function here ignores the `basePath`.

---
### `createSpeculationRules`

```js
function createSpeculationRules({
  prefetch?: Array<string>,
  prerender?: Array<string>,
  eagerness?: 'conservative' | 'moderate' | 'eager',
}): string
```

Returns a JSON string for a `<script type='speculationrules'>` tag. This is useful for browser-managed document prefetching or prerendering, but it does not apply to the soft navigations triggered by `Link`.

```js
import { createSpeculationRules } from '@kaliber/routing'

const speculationRules = createSpeculationRules({
  prerender: ['/pricing', '/contact'],
  eagerness: 'moderate',
})

export default function Document() {
  return (
    <html>
      <head>
        <script
          type='speculationrules'
          dangerouslySetInnerHTML={{ __html: speculationRules }}
        />
      </head>
      <body>...</body>
    </html>
  )
}
```

---
---
## Motivation

Why would we create a new routing library?

Back in the day there were 2 popular choices for React: 'React Router' and 'Reach Router'. We went for Reach Router because it was using relative routes. Relative routes fit better with the component model where parents can know about children, but children can not know about parents.

Most popular React routing libraries use JSX to define routes, we don't like using JSX to define routes as it creates a lot of noise or causes linting errors (in case of things like a `path` property on the component).

When working in a 'universal' environment where server side rendering takes place it helps if the same route structure can be used on the server and the client. On the server you want to return a `404` for some resource that is not found, on the client you want to display the correct `NotFound` page.

Reverse routing is missing in most routing libraries.

---
---
## FAQ

- Why is the route map itself not a route?
  - It would make it impossible to have home as a route that is not the parent of any other routes. This makes some data fetching patterns impossible.
