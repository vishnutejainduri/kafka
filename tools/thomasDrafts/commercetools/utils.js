const { readFileSync } = require('fs')

const getArrayFromCsv = filename => {
  const [_header, ...lines] = readFileSync(filename, 'utf8').split('\n')
  return lines
}

const sleep = ms => new Promise((resolve, _reject) => { setTimeout(resolve, ms) })

module.exports = {
  getArrayFromCsv,
  sleep
}
