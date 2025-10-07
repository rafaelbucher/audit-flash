// Test direct de la fonction test-simple
import { handler } from './netlify/functions/test-simple.js';

async function testSimpleFunction() {
    console.log('🚀 Test de la fonction test-simple...');
    
    const mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
            url: 'https://www.webflow-formation.fr/'
        })
    };
    
    try {
        const result = await handler(mockEvent);
        console.log('✅ Résultat:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('Stack:', error.stack);
    }
}

testSimpleFunction();