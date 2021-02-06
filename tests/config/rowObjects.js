module.exports.pokemonRowObjects = { 'Pokemon No_': { operation: 'ToInteger' },
    Name: { operation: 'ToString' },
    'Type 1': { operation: 'ToString' },
    'Type 2': { operation: 'ToString' },
    'Max CP': { operation: 'ToInteger' },
    'Max HP': { operation: 'ToInteger' },
    'Image URL': { operation: 'ToString' } }

module.exports.gameOfThronesRowObjects = { _links: { operation: 'ToString' },
    summary: { operation: 'ToString' },
    image: { operation: 'ToString' },
    runtime: { operation: 'ToInteger' },
    airstamp:
   { operation: 'ToDate',
       format: 'ISO_8601',
       outputFormat: 'YYYY-MM-DD' },
    airtime: { operation: 'ToString' },
    airdate:
   { operation: 'ToDate',
       format: 'YYYY-MM-DD',
       outputFormat: 'YYYY-MM-DD' },
    number: { operation: 'ToInteger' },
    season: { operation: 'ToInteger' },
    name: { operation: 'ToString' },
    url: { operation: 'ToString' },
    id: { operation: 'ToInteger' } }

module.exports.stringRowObjects = { string3: { operation: 'ToString' },
    string2: { operation: 'ToString' },
    string1: { operation: 'ToString' } }
