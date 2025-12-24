/**
 * test_chatbot.js - Chatbot Test Suite
 * 
 * Dit bestand bevat tests voor de chatbot functionaliteit.
 * Plaats dit in project/chatbot/ en voer uit met:
 *   node test_chatbot.js
 */

const chatbot = require('./index.js');
const intents = require('./intents.js');
const items = require('./items.js');

let testsPassed = 0;
let testsFailed = 0;

/**
 * Test helper function
 */
function assert(condition, message) {
    if (condition) {
        console.log(`✓ ${message}`);
        testsPassed++;
    } else {
        console.error(`✗ ${message}`);
        testsFailed++;
    }
}

/**
 * Test intent detection
 */
console.log('\n📋 Testing Intent Detection...\n');

const intentTests = [
    {
        message: 'Waar ligt de Raspberry Pi?',
        expectedIntent: 'find_item',
        description: 'Should detect find_item intent'
    },
    {
        message: 'Hebben we LED lampen op voorraad?',
        expectedIntent: 'stock_check',
        description: 'Should detect stock_check intent'
    },
    {
        message: 'Een Arduino is kwijt',
        expectedIntent: 'missing',
        description: 'Should detect missing intent'
    },
    {
        message: 'Hoe werkt een servo?',
        expectedIntent: 'help',
        description: 'Should detect help intent'
    },
    {
        message: 'Wat is het weer vandaag?',
        expectedIntent: 'unknown',
        description: 'Should detect unknown intent for unrelated query'
    }
];

intentTests.forEach(test => {
    const result = intents.detectIntent(test.message);
    assert(
        result.intent === test.expectedIntent,
        `${test.description} - Got: ${result.intent}, Expected: ${test.expectedIntent}`
    );
});

/**
 * Test item extraction
 */
console.log('\n🔍 Testing Item Extraction...\n');

const itemTests = [
    {
        message: 'Waar ligt de Raspberry Pi?',
        expectedItem: 'raspberry pi',
        description: 'Should extract Raspberry Pi'
    },
    {
        message: 'Hebben we breadboards?',
        expectedItem: 'breadboard',
        description: 'Should extract breadboard'
    },
    {
        message: 'Arduino servo sensor',
        expectedItems: ['arduino', 'servo', 'sensor'],
        description: 'Should extract multiple items'
    }
];

itemTests.forEach(test => {
    const words = intents.extractPotentialItems(test.message);
    const foundItems = items.findItemsInWords(words);
    
    if (test.expectedItem) {
        const found = foundItems.some(item => item.name === test.expectedItem);
        assert(found, `${test.description} - Found: ${foundItems.map(i => i.name).join(', ')}`);
    }
    
    if (test.expectedItems) {
        const allFound = test.expectedItems.every(exp => 
            foundItems.some(item => item.name === exp)
        );
        assert(allFound, `${test.description}`);
    }
});

/**
 * Test item lookup
 */
console.log('\n🔎 Testing Item Lookup...\n');

const lookupTests = [
    {
        search: 'raspberry pi',
        shouldFind: true,
        description: 'Should find Raspberry Pi by name'
    },
    {
        search: 'raspi',
        shouldFind: true,
        description: 'Should find Raspberry Pi by variant'
    },
    {
        search: 'xyz123nonexistent',
        shouldFind: false,
        description: 'Should not find non-existent item'
    }
];

lookupTests.forEach(test => {
    const found = items.findItemByName(test.search);
    assert(
        (found !== null) === test.shouldFind,
        test.description
    );
});

/**
 * Test chatbot message processing
 */
console.log('\n🤖 Testing Chatbot Processing...\n');

(async () => {
    const messageTests = [
        {
            message: 'Waar ligt de LED?',
            shouldSucceed: true,
            description: 'Should process find_item message'
        },
        {
            message: '',
            shouldSucceed: false,
            description: 'Should handle empty message'
        },
        {
            message: 'Random nonsense text',
            shouldSucceed: true, // Returns fallback response
            description: 'Should handle unknown intent'
        }
    ];

    for (const test of messageTests) {
        const result = await chatbot.processMessage(test.message);
        assert(
            result.success === test.shouldSucceed,
            `${test.description} - Success: ${result.success}`
        );
    }

    /**
     * Test chatbot status
     */
    console.log('\n🔌 Testing Chatbot Status...\n');

    const status = chatbot.getStatus();
    assert(status.status === 'ok', 'Chatbot status should be ok');
    assert(status.service === 'chatbot', 'Service name should be chatbot');
    assert(Array.isArray(status.intentsSupported), 'Should have intentsSupported');
    assert(status.itemsKnown > 0, 'Should know items');

    /**
     * Test summary
     */
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`✓ Passed: ${testsPassed}`);
    console.log(`✗ Failed: ${testsFailed}`);
    console.log(`📈 Total: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
        console.log('\n🎉 Alle tests geslaagd!');
    } else {
        console.log(`\n⚠️  ${testsFailed} test(s) mislukt.`);
    }
    
    process.exit(testsFailed === 0 ? 0 : 1);
})();
