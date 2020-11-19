const { parse } = require('json2csv')
const { promisify } = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile)

const algoliasearch = require('algoliasearch');
const client = algoliasearch('CDROBE4GID', 'apiKey');
const index = client.initIndex('styles_production');

const currentTime = (new Date()).getTime()
const wstreamOutput = fs.createWriteStream(`report_${currentTime}.csv`);
let totalHits = -1;
let pageCount = 0;

(async () => {
let algoliaQuery
const algoliaQueryContents = await readFileAsync('./algoliaQuery.txt', 'utf-8')
try {
  algoliaQuery = JSON.parse(algoliaQueryContents) 
} catch {
  const algolaiQueryContentsArray = algoliaQueryContents.split(',')
  const algoliaQueryNoStartingJs = algolaiQueryContentsArray.slice(1, algolaiQueryContentsArray.length).join(',')
  const algoliaQueryNoJs = algoliaQueryNoStartingJs.split(');')[0]
  algoliaQuery = JSON.parse(algoliaQueryNoJs)
}

while (totalHits !== 0) {
  algoliaQuery.page = pageCount
  algoliaQuery.hitsPerPage = 1000
  const results = await index.search("", algoliaQuery)
  console.log('results', results.hits.length)
  totalHits = results.hits.length
  pageCount++
  if (totalHits > 0) {
    const final = results.hits.map((result) => {
        delete result._snippetResult
        delete result._highlightResult
        delete result._rankingInfo
        delete result.objectID
        return result;
    });
    wstreamOutput.write(await parse(final) + '\n')
  }
}
})();
