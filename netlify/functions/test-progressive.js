// Version progressive pour identifier le problème
export const handler = async (event) => {
  try {
    console.log('🚀 Progressive test started');
    
    if (event.httpMethod !== "POST") {
      return { 
        statusCode: 405, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    const { url, step = "all" } = JSON.parse(event.body || "{}");
    if (!url) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing URL" })
      };
    }

    const results = { url, step, tests: {} };

    // Test 1: Import chromium
    if (step === "all" || step === "chromium") {
      try {
        console.log('📦 Testing chromium import...');
        const chromium = await import("@sparticuz/chromium");
        results.tests.chromium = "✅ Import successful";
        console.log('✅ Chromium imported');
      } catch (err) {
        results.tests.chromium = `❌ ${err.message}`;
        console.error('❌ Chromium import failed:', err);
        if (step === "chromium") {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
          };
        }
      }
    }

    // Test 2: Import puppeteer-core
    if (step === "all" || step === "puppeteer") {
      try {
        console.log('🎭 Testing puppeteer-core import...');
        const puppeteer = await import("puppeteer-core");
        results.tests.puppeteer = "✅ Import successful";
        console.log('✅ Puppeteer imported');
      } catch (err) {
        results.tests.puppeteer = `❌ ${err.message}`;
        console.error('❌ Puppeteer import failed:', err);
        if (step === "puppeteer") {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
          };
        }
      }
    }

    // Test 3: Import pa11y
    if (step === "all" || step === "pa11y") {
      try {
        console.log('♿ Testing pa11y import...');
        const pa11y = await import("pa11y");
        results.tests.pa11y = "✅ Import successful";
        console.log('✅ Pa11y imported');
      } catch (err) {
        results.tests.pa11y = `❌ ${err.message}`;
        console.error('❌ Pa11y import failed:', err);
        if (step === "pa11y") {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
          };
        }
      }
    }

    // Test 4: Launch browser
    if (step === "all" || step === "browser") {
      try {
        console.log('🌐 Testing browser launch...');
        const chromium = await import("@sparticuz/chromium");
        const puppeteer = await import("puppeteer-core");
        
        const browser = await puppeteer.default.launch({
          args: chromium.default.args,
          defaultViewport: chromium.default.defaultViewport,
          executablePath: await chromium.default.executablePath(),
          headless: chromium.default.headless,
        });
        
        await browser.close();
        results.tests.browser = "✅ Launch successful";
        console.log('✅ Browser launched and closed');
      } catch (err) {
        results.tests.browser = `❌ ${err.message}`;
        console.error('❌ Browser launch failed:', err);
        if (step === "browser") {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
          };
        }
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(results)
    };
    
  } catch (err) {
    console.error('❌ Progressive test error:', err);
    return { 
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: err.message,
        stack: err.stack?.substring(0, 500)
      })
    };
  }
};