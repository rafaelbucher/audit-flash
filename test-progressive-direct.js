// Test direct de la fonction test-progressive
import { handler } from './netlify/functions/test-progressive.js';

async function testProgressiveFunction() {
    console.log('🚀 Test de la fonction test-progressive...');
    
    const tests = ['chromium', 'puppeteer', 'pa11y', 'browser'];
    
    for (const step of tests) {
        console.log(`\n📦 Test ${step}...`);
        
        const mockEvent = {
            httpMethod: 'POST',
            body: JSON.stringify({
                url: 'https://www.webflow-formation.fr/',
                step: step
            })
        };
        
        try {
            const result = await handler(mockEvent);
            const body = JSON.parse(result.body);
            console.log(`✅ ${step}: ${body.tests?.[step] || 'OK'}`);
            
            if (result.statusCode !== 200) {
                console.error(`❌ ${step} failed:`, body);
                break;
            }
        } catch (error) {
            console.error(`❌ ${step} error:`, error.message);
            break;
        }
    }
}

testProgressiveFunction();