const validEagerness = new Set(['conservative', 'moderate', 'eager'])

export function createSpeculationRules({
  prefetch = [],
  prerender = [],
  eagerness = undefined,
} = {}) {
  if (eagerness !== undefined && !validEagerness.has(eagerness))
    throw new Error(`The 'eagerness' option should be one of: conservative, moderate, eager`)

  const rules = {}

  if (prefetch.length) rules.prefetch = [createRule(prefetch, eagerness)]
  if (prerender.length) rules.prerender = [createRule(prerender, eagerness)]

  return JSON.stringify(rules)
}

function createRule(urls, eagerness) {
  if (!Array.isArray(urls))
    throw new Error(`Speculation rules should be created from arrays of urls`)

  if (!urls.every(url => typeof url === 'string'))
    throw new Error(`Speculation rules only support string urls`)

  return {
    source: 'list',
    urls,
    ...(eagerness ? { eagerness } : {}),
  }
}
