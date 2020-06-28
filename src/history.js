// copied from https://github.com/reach/router/blob/master/src/lib/history.js
export function createHistory() {
  let listeners = []
  let location = getLocation()

  return {
    get location() { return location },

    listen(listener) {
      listeners.push(listener)

      window.addEventListener('popstate', handlePopState)

      return () => {
        window.removeEventListener('popstate', handlePopState)
        listeners = listeners.filter(fn => fn !== listener)
      }

      function handlePopState() {
        location = getLocation()
        listener({ location, action: 'POP' })
      }
    },

    navigate(to, { state = undefined, replace = false } = {}) {
      console.log('navigate', to)
      if (typeof to === 'number') window.history.go(to)
      else {
        state = { ...state, key: Date.now() + '' }
        // try...catch iOS Safari limits to 100 pushState calls
        try {
          if (replace) window.history.replaceState(state, null, to)
          else window.history.pushState(state, null, to)
        } catch (e) {
          window.location[replace ? 'replace' : 'assign'](to)
        }
      }

      location = getLocation()
      listeners.forEach(listener => listener({ location, action: 'PUSH' }))
    }
  }
}


function getLocation() {
  const {
    search,
    hash,
    href,
    origin,
    protocol,
    host,
    hostname,
    port,
  } = window.location
  let { pathname } = window.location

  if (!pathname && href) {
    const url = new URL(href)
    pathname = url.pathname
  }

  return {
    pathname: encodeURI(decodeURI(pathname)),
    search,
    hash,
    href,
    origin,
    protocol,
    host,
    hostname,
    port,
    state: window.history.state,
    key: (window.history.state && window.history.state.key) || 'initial'
  }
}
