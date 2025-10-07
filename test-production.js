// Script pour tester l'API en production
// Remplacez YOUR_NETLIFY_URL par votre vraie URL Netlify

const NETLIFY_URL = 'https://votre-site-name.netlify.app'; // À remplacer
const TEST_URL = 'https://www.webflow-formation.fr/';

async function testProductionAPI() {
    console.log('🚀 Test de l\'API en production...');
    console.log(`📍 URL Netlify: ${NETLIFY_URL}`);
    console.log(`🔍 URL à tester: ${TEST_URL}`);
    
    try {
        const response = await fetch(`${NETLIFY_URL}/.netlify/functions/start-audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: TEST_URL
            })
        });
        
        console.log(`📊 Statut HTTP: ${response.status}`);
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erreur HTTP ${response.status}: ${error}`);
        }
        
        const result = await response.json();
        
        console.log('\n✅ RÉSULTATS DE L\'AUDIT:');
        console.log('═'.repeat(50));
        console.log(`🌐 URL analysée: ${result.url}`);
        console.log(`📏 Standard: ${result.standard}`);
        console.log(`🎯 Score: ${result.score}/100`);
        console.log('\n📈 STATISTIQUES:');
        console.log(`❌ Erreurs: ${result.counts.errors}`);
        console.log(`⚠️  Avertissements: ${result.counts.warnings}`);
        console.log(`ℹ️  Notices: ${result.counts.notices}`);
        
        console.log('\n🔍 PREMIERS PROBLÈMES DÉTECTÉS:');
        result.recommandations.slice(0, 3).forEach((rec, index) => {
            console.log(`\n${index + 1}. [${rec.type.toUpperCase()}] ${rec.message}`);
            if (rec.selector) {
                console.log(`   🎯 Élément: ${rec.selector}`);
            }
        });
        
        if (result.recommandations.length > 3) {
            console.log(`\n... et ${result.recommandations.length - 3} autres recommandations`);
        }
        
    } catch (error) {
        console.error('❌ ERREUR:', error.message);
        console.log('\n🔧 SOLUTIONS POSSIBLES:');
        console.log('1. Vérifiez que l\'URL Netlify est correcte');
        console.log('2. Attendez quelques minutes après le déploiement');
        console.log('3. Vérifiez les logs dans l\'interface Netlify');
    }
}

// Lancer le test
testProductionAPI();