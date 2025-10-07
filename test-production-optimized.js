// Test de la fonction production optimisée
import { handler } from './netlify/functions/start-audit-production.js';

async function testProductionFunction() {
    console.log('🚀 Test de la fonction start-audit-production...');
    
    const mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify({
            url: 'https://www.webflow-formation.fr/'
        })
    };
    
    const startTime = Date.now();
    
    try {
        const result = await handler(mockEvent);
        const duration = Date.now() - startTime;
        const body = JSON.parse(result.body);
        
        console.log(`✅ Test completed in ${duration}ms`);
        console.log(`📊 Status: ${result.statusCode}`);
        console.log(`🎯 Score: ${body.score}/100`);
        console.log(`🔍 Errors: ${body.counts?.errors || 'N/A'}`);
        console.log(`⚠️ Warnings: ${body.counts?.warnings || 'N/A'}`);
        console.log(`ℹ️ Notices: ${body.counts?.notices || 'N/A'}`);
        
        if (result.statusCode === 200) {
            console.log('🎉 SUCCESS - Function ready for production!');
        } else {
            console.log('❌ Error:', body.error);
        }
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Test failed after ${duration}ms:`, error.message);
    }
}

testProductionFunction();