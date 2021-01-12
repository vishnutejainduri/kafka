const exportConfig = {
  batch: 20,
  json: true,
  predicate: 'variants(attributes(name="webStatus" and value=true))',
  staged: false,
  total: 10 // TODO: remove limit. included just for testing
}

const logger = {
  error: console.error,
  warn: console.warn,
  info: console.log,
  debug: console.debug
}

module.exports = {
  exportConfig,
  logger
}
