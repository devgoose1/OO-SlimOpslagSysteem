const items = require('./items');

const searchTerm = 'hoe meet ik temperatuur?';
const lowerSearch = searchTerm.toLowerCase();
const searchWords = lowerSearch.split(/\s+/).filter(w => w.length > 2);

console.log('Search term:', searchTerm);
console.log('Search words:', searchWords);
console.log('\n');

const results = items.searchByFunction(searchTerm);
console.log('Resultaten:');
results.slice(0, 5).forEach(r => {
    console.log(`- ${r.name}: relevance ${r.relevance}`);
});
