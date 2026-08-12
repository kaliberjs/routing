import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createLinkHandlers,
  createPrefetchState,
  defaultIntentDelay,
  normalizeRootPrefetch,
  resetPrefetchState,
  resolveLinkPrefetch,
} from './link.js'
import { createSpeculationRules } from './speculationRules.js'

describe('createLinkHandlers', () => {
  test('Link without prefetch behaves exactly as before', () => {
    const navigations = []
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: (...args) => navigations.push(args),
      prefetch: null,
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: undefined,
      to: '/articles',
    })

    const event = createEvent()
    handlers.onClick(event)

    assert.equal(event.defaultPrevented, true)
    assert.deepEqual(navigations, [['/articles', { replace: false, state: undefined }]])
    assert.equal(handlers.onPointerEnter, undefined)
    assert.equal(handlers.onFocus, undefined)
    assert.equal(handlers.onTouchStart, undefined)
  })

  test(`'intent' uses the root prefetcher`, () => {
    const calls = []
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch(
        'intent',
        normalizeRootPrefetch({ run: args => calls.push(args) })
      ),
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: undefined,
      to: '/articles',
    })

    handlers.onFocus(createEvent())

    assert.deepEqual(calls, [{ to: '/articles', href: '/articles', trigger: 'focus' }])
  })

  test('per-link run overrides the root prefetcher', () => {
    const rootCalls = []
    const linkCalls = []
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch(
        { run: args => linkCalls.push(args) },
        normalizeRootPrefetch({ run: args => rootCalls.push(args) })
      ),
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: undefined,
      to: '/articles',
    })

    handlers.onFocus(createEvent())

    assert.equal(rootCalls.length, 0)
    assert.deepEqual(linkCalls, [{ to: '/articles', href: '/articles', trigger: 'focus' }])
  })

  test('pointer waits for the default intent delay before prefetching', () => {
    const calls = []
    const scheduler = createScheduler()
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch({ run: args => calls.push(args) }),
      prefetchState: createPrefetchState(),
      replace: undefined,
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
      state: undefined,
      to: '/articles',
    })

    handlers.onPointerEnter(createEvent())

    assert.equal(calls.length, 0)
    assert.deepEqual(scheduler.delays, [defaultIntentDelay])

    scheduler.run(0)

    assert.deepEqual(calls, [{ to: '/articles', href: '/articles', trigger: 'pointer' }])
  })

  test('focus and touch prefetch immediately', () => {
    const calls = []
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch({ run: args => calls.push(args) }),
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: undefined,
      to: '/articles',
    })

    handlers.onFocus(createEvent())
    handlers.onTouchStart(createEvent())

    assert.deepEqual(calls, [{ to: '/articles', href: '/articles', trigger: 'focus' }])
  })

  test('repeated intent events do not retrigger while mounted', () => {
    const calls = []
    const scheduler = createScheduler()
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch({ run: args => calls.push(args) }),
      prefetchState: createPrefetchState(),
      replace: undefined,
      schedule: scheduler.schedule,
      cancel: scheduler.cancel,
      state: undefined,
      to: '/articles',
    })

    handlers.onPointerEnter(createEvent())
    handlers.onPointerEnter(createEvent())
    scheduler.run(0)
    handlers.onFocus(createEvent())
    handlers.onTouchStart(createEvent())

    assert.equal(calls.length, 1)
  })

  test('changing the destination resets the per-link prefetch guard', () => {
    const calls = []
    const prefetchState = createPrefetchState()
    const prefetch = resolveLinkPrefetch({ run: args => calls.push(args) })

    createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch,
      prefetchState,
      replace: undefined,
      state: undefined,
      to: '/articles',
    }).onFocus(createEvent())

    resetPrefetchState(prefetchState)

    createLinkHandlers({
      href: '/articles/article-1',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch,
      prefetchState,
      replace: undefined,
      state: undefined,
      to: '/articles/article-1',
    }).onFocus(createEvent())

    assert.deepEqual(calls, [
      { to: '/articles', href: '/articles', trigger: 'focus' },
      { to: '/articles/article-1', href: '/articles/article-1', trigger: 'focus' },
    ])
  })

  test('anchorProps handlers run first', () => {
    const callOrder = []
    const handlers = createLinkHandlers({
      anchorProps: { onFocus: () => callOrder.push('anchorProps') },
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch({ run: () => callOrder.push('prefetch') }),
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: undefined,
      to: '/articles',
    })

    handlers.onFocus(createEvent())

    assert.deepEqual(callOrder, ['anchorProps', 'prefetch'])
  })

  test('defaultPrevented suppresses prefetch', () => {
    const calls = []
    const handlers = createLinkHandlers({
      anchorProps: { onFocus: e => e.preventDefault() },
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch({ run: () => calls.push('prefetch') }),
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: undefined,
      to: '/articles',
    })

    handlers.onFocus(createEvent())

    assert.deepEqual(calls, [])
  })

  test('rejected async prefetches are swallowed', async () => {
    const unhandledRejections = []
    const onUnhandledRejection = reason => unhandledRejections.push(reason)
    process.on('unhandledRejection', onUnhandledRejection)

    try {
      const handlers = createLinkHandlers({
        href: '/articles',
        inBrowser: true,
        location: { pathname: '/home', state: undefined },
        navigate: () => {},
        prefetch: resolveLinkPrefetch({ run: () => Promise.reject(new Error('boom')) }),
        prefetchState: createPrefetchState(),
        replace: undefined,
        state: undefined,
        to: '/articles',
      })

      assert.doesNotThrow(() => handlers.onFocus(createEvent()))
      await waitForNextTick()
      assert.deepEqual(unhandledRejections, [])
    } finally {
      process.off('unhandledRejection', onUnhandledRejection)
    }
  })

  test('click navigation preserves replace and state semantics', () => {
    const navigations = []
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: true,
      location: { pathname: '/articles', state: { tab: 'all' } },
      navigate: (...args) => navigations.push(args),
      prefetch: null,
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: { tab: 'all' },
      to: '/articles',
    })

    handlers.onClick(createEvent())

    assert.deepEqual(navigations, [['/articles', { replace: true, state: { tab: 'all' } }]])
  })

  test('server-side links do not prefetch', () => {
    const calls = []
    const handlers = createLinkHandlers({
      href: '/articles',
      inBrowser: false,
      location: { pathname: '/home', state: undefined },
      navigate: () => {},
      prefetch: resolveLinkPrefetch({ run: () => calls.push('prefetch') }),
      prefetchState: createPrefetchState(),
      replace: undefined,
      state: undefined,
      to: '/articles',
    })

    handlers.onFocus(createEvent())

    assert.deepEqual(calls, [])
  })
})

describe('createSpeculationRules', () => {
  test('serializes prefetch, prerender and eagerness', () => {
    assert.equal(
      createSpeculationRules({
        prefetch: ['/articles'],
        prerender: ['/articles/article-1'],
        eagerness: 'moderate',
      }),
      JSON.stringify({
        prefetch: [{ source: 'list', urls: ['/articles'], eagerness: 'moderate' }],
        prerender: [{
          source: 'list',
          urls: ['/articles/article-1'],
          eagerness: 'moderate',
        }],
      })
    )
  })
})

function createEvent(overrides = {}) {
  return {
    altKey: false,
    button: 0,
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
    shiftKey: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    ...overrides,
  }
}

function createScheduler() {
  const tasks = []
  const scheduler = {
    delays: [],
    schedule: (fn, delay) => {
      const id = tasks.push(fn) - 1
      scheduler.delays.push(delay)
      return id
    },
    cancel: id => {
      tasks[id] = null
    },
    run: id => {
      const task = tasks[id]
      assert.ok(task)
      tasks[id] = null
      task()
    },
  }

  return scheduler
}

function waitForNextTick() {
  return new Promise(resolve => setImmediate(resolve))
}
