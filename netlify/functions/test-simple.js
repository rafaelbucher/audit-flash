// Fonction de test ultra-simple pour diagnostic
export const handler = async (event) => {
  try {
    console.log('🚀 Test function started');
    
    if (event.httpMethod !== "POST") {
      return { 
        statusCode: 405, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    const body = JSON.parse(event.body || "{}");
    console.log('📝 Request body:', body);

    // Test 1: Retour simple sans dépendances
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        status: "success",
        message: "Function is working",
        url: body.url || "no-url-provided",
        timestamp: new Date().toISOString(),
        environment: {
          netlify: process.env.NETLIFY,
          netlifyLocal: process.env.NETLIFY_LOCAL,
          nodeVersion: process.version
        }
      })
    };
    
  } catch (err) {
    console.error('❌ Error in test function:', err);
    return { 
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: err.message,
        stack: err.stack
      })
    };
  }
};