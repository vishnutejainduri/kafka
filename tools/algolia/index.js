const algoliasearch = require('algoliasearch');

const client = algoliasearch('CDROBE4GID', '4a6a0b578336831d0ecb2552ef97556d');
const index = client.initIndex('styles_development');

const facetMap = {
  "Category": "style",
  "Fabric": "fabric",
  "Length": "length",
  "Fit": "fit",
  "Sleeve": "collar",
  "Pattern": "pattern",
  "Cuff": "cuff",
};

function sumFacetHitsCounts (facetHits) {
  return facetHits.reduce(function (sum, { count }) {
    return sum + count
  }, 0)
}

function sumAllFacets () {
  return Promise.all(
    Object
      .values(facetMap)
      .map(facet => index.searchForFacetValues(`${facet}.en`, '', { maxFacetHits: 100  }))
    )
    .then(results => results.map(({ facetHits }) => sumFacetHitsCounts(facetHits)))
    .then(sums => sums.reduce(function (totalSum, sum) { return totalSum + sum }, 0))
}
