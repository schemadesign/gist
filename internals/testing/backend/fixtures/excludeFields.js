module.exports.pokemonExcludeFields = {
    'Pokemon No_': false,
    'Name': false,
    'Type 1': false,
    'Type 2': false,
    'Max CP': false,
    'Max HP': false,
    'Image URL': false,
};

module.exports.pokemonWithExcludedFields = {
    'Pokemon No_': true,
    'Name': false,
    'Type 1': false,
    'Type 2': false,
    'Max CP': false,
    'Max HP': false,
    'Image URL': true,
};

module.exports.gameOfThronesExcludeFields = {
    _links: false,
    summary: false,
    image: false,
    runtime: false,
    airstamp: false,
    airtime: false,
    airdate: false,
    number: false,
    season: false,
    name: false,
    url: false,
    id: false,
};

module.exports.stringExcludeFields = {
    string3: false,
    string2: false,
    string1: false,
};
