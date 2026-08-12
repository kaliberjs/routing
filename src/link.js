export const defaultIntentDelay = 80

export function normalizeRootPrefetch(prefetch) {
  if (prefetch === undefined) return null

  const { run, intentDelay = defaultIntentDelay } = validatePrefetchConfig(
    prefetch,
    'LocationProvider'
  )
  if (!run)
    throw new Error(`The 'prefetch.run' prop on LocationProvider should be a function`)

  return { run, intentDelay: normalizeIntentDelay(intentDelay) }
}

export function resolveLinkPrefetch(prefetch, rootPrefetch) {
  if (prefetch === undefined || prefetch === 'none') return null
  if (prefetch === 'intent') return rootPrefetch

  const linkPrefetch = validatePrefetchConfig(prefetch, 'Link')
  const run = linkPrefetch.run ?? rootPrefetch?.run
  if (!run) return null

  return {
    run,
    intentDelay: normalizeIntentDelay(
      linkPrefetch.intentDelay ?? rootPrefetch?.intentDelay ?? defaultIntentDelay
    ),
  }
}

export function createPrefetchState() {
  return { hasPrefetched: false, timeoutId: null }
}

export function resetPrefetchState(prefetchState, cancel = clearTimeout) {
  cancelPendingPrefetch(prefetchState, cancel)
  prefetchState.hasPrefetched = false
}

export function createLinkHandlers({
  anchorProps = null,
  href,
  inBrowser,
  location,
  navigate,
  prefetch,
  prefetchState,
  replace,
  schedule = setTimeout,
  state,
  to,
  cancel = clearTimeout,
}) {
  return {
    onClick: composeEventHandler(anchorProps?.onClick, handleClick),
    onFocus: composeEventHandler(anchorProps?.onFocus, prefetch ? handleFocus : undefined),
    onPointerEnter: composeEventHandler(
      anchorProps?.onPointerEnter,
      prefetch ? handlePointerEnter : undefined
    ),
    onPointerLeave: composeEventHandler(
      anchorProps?.onPointerLeave,
      prefetch ? clearPending : undefined
    ),
    onTouchStart: composeEventHandler(anchorProps?.onTouchStart, prefetch ? handleTouchStart : undefined),
  }

  function handleClick(e) {
    if (!shouldNavigate(e)) return

    e.preventDefault()

    const { pathname, state: currentState } = location
    const shouldReplace = replace === undefined
      ? pathname === encodeURI(href) && shallowEqual(currentState || {}, state || {})
      : replace

    navigate(to, { replace: shouldReplace, state })
  }

  function handlePointerEnter() {
    if (!prefetch || prefetchState.hasPrefetched || prefetchState.timeoutId !== null || !inBrowser)
      return

    prefetchState.timeoutId = schedule(
      () => {
        prefetchState.timeoutId = null
        runPrefetch('pointer')
      },
      prefetch.intentDelay
    )
  }

  function clearPending() {
    cancelPendingPrefetch(prefetchState, cancel)
  }

  function handleFocus() {
    runPrefetch('focus')
  }

  function handleTouchStart() {
    runPrefetch('touch')
  }

  function runPrefetch(trigger) {
    if (!prefetch || prefetchState.hasPrefetched || !inBrowser) return

    clearPending()
    prefetchState.hasPrefetched = true

    try {
      Promise.resolve(prefetch.run({ to, href, trigger })).catch(() => {})
    } catch (_) {}
  }
}

function validatePrefetchConfig(prefetch, componentName) {
  if (!prefetch || typeof prefetch !== 'object')
    throw new Error(`The 'prefetch' prop on ${componentName} should be an object`)

  const { run = undefined, intentDelay = undefined } = prefetch
  if (run !== undefined && typeof run !== 'function')
    throw new Error(`The 'prefetch.run' prop on ${componentName} should be a function`)

  return { run, intentDelay }
}

function normalizeIntentDelay(intentDelay) {
  if (typeof intentDelay !== 'number' || Number.isNaN(intentDelay) || intentDelay < 0)
    throw new Error(`The 'prefetch.intentDelay' prop should be a number greater than or equal to 0`)

  return intentDelay
}

function composeEventHandler(currentHandler, nextHandler) {
  if (!currentHandler) return nextHandler
  if (!nextHandler) return currentHandler

  return e => {
    currentHandler(e)
    if (e.defaultPrevented) return
    nextHandler(e)
  }
}

function cancelPendingPrefetch(prefetchState, cancel) {
  if (prefetchState.timeoutId === null) return

  cancel(prefetchState.timeoutId)
  prefetchState.timeoutId = null
}

function shallowEqual(o1, o2) {
  const o1Keys = Object.keys(o1)
  return (
    o1Keys.length === Object.keys(o2).length &&
    o1Keys.every(key => o2.hasOwnProperty(key) && o1[key] === o2[key])
  )
}

function shouldNavigate(e) {
  return (
    !e.defaultPrevented &&
    e.button === 0 &&
    !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
  )
}
