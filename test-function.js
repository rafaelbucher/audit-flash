import { handler } from './netlify/functions/start-audit.js';

// Simulation d'un événement Netlify
const event = {
  httpMethod: 'POST',
  body: JSON.stringify({
    url: 'https://www.webflow-formation.fr/',
    timeoutMs: 25000
  })
};

console.log('🚀 Test de la fonction start-audit...');
console.log('URL testée:', 'https://www.webflow-formation.fr/');

try {
  const result = await handler(event);
  console.log('📊 Résultat:', result);
} catch (error) {
  console.error('❌ Erreur:', error.message);
}