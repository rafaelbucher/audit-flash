// Test de la fonction lightweight
import { handler } from './netlify/functions/audit-lightweight.js';

async function testLightweightFunction() {
    console.log('🚀 Test de la fonction audit-lightweight...');
    
    const mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
            url: 'https://www.webflow-formation.fr/'
        })
    };
    
    try {
        const result = await handler(mockEvent);
        const body = JSON.parse(result.body);
        console.log('✅ Résultat:', JSON.stringify(body, null, 2));
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('Stack:', error.stack);
    }
}

testLightweightFunction();