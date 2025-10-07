// Version ultra-optimisée pour Netlify Production - Pa11y + Puppeteer
import pa11y from "pa11y";

// Configuration Chromium optimale pour AWS Lambda/Netlify
async function getOptimizedPuppeteer() {
  // Détection d'environnement améliorée
  const isNetlifyProd = process.env.NETLIFY === "true" && process.env.NETLIFY_LOCAL !== "true";
  
  if (isNetlifyProd) {
    // Configuration pour Netlify Production
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    
    const chromiumArgs = [
      ...chromium.default.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-javascript',
      '--single-process',
      '--no-zygote',
      '--memory-pressure-off',
      '--max_old_space_size=512',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--aggressive-cache-discard',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync'
    ];

    const executablePath = await chromium.default.executablePath({
      cacheDir: '/tmp/.chrome'
    });

    return {
      launch: async () => {
        console.log('🚀 Launching optimized Chrome for Netlify Production...');
        
        const browser = await puppeteer.default.launch({
          args: chromiumArgs,
          executablePath,
          headless: chromium.default.headless,
          defaultViewport: { width: 1280, height: 720 },
          timeout: 8000,
          ignoreHTTPSErrors: true
        });
        
        console.log('✅ Chrome launched successfully');
        return browser;
      }
    };
  } else {
    // Configuration pour développement local
    console.log('🏠 Using local Puppeteer for development...');
    try {
      const puppeteer = await import("puppeteer");
      return {
        launch: async () => {
          console.log('🚀 Launching local Chrome...');
          return await puppeteer.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
            timeout: 8000
          });
        }
      };
    } catch (localError) {
      console.warn('⚠️ Local Puppeteer failed, trying fallback...');
      throw new Error('Local development requires puppeteer package. Run: npm install puppeteer');
    }
  }
}

function normalize(results) {
  const issues = results.issues || [];
  const errors = issues.filter(i => i.type === "error").length;
  const warnings = issues.filter(i => i.type === "warning").length;  
  const notices = issues.filter(i => i.type === "notice").length;
  const score = Math.max(0, 100 - Math.min(errors * 2, 80));

  // Limiter le nombre de recommandations pour éviter les timeouts
  const recommandations = issues.slice(0, 50).map(i => ({
    code: i.code,
    type: i.type,
    message: i.message,
    selector: i.selector?.substring(0, 150),
    context: i.context?.substring(0, 150)
  }));

  return {
    standard: "WCAG 2.1 AA",
    score,
    counts: { errors, warnings, notices },
    recommandations,
    totalIssues: issues.length
  };
}

export const handler = async (event) => {
  const startTime = Date.now();
  let browser;
  
  try {
    console.log('🚀 Netlify Pa11y audit started');
    
    if (event.httpMethod !== "POST") {
      return { 
        statusCode: 405, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }
    
    const { url } = JSON.parse(event.body || "{}");
    if (!url) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing URL parameter" })
      };
    }

    console.log(`📊 Starting audit for: ${url}`);
    
    // Timeout global strict de 9 secondes (marge de 1s pour cleanup)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Audit timeout (9s limit)')), 9000);
    });
    
    const auditPromise = async () => {
      // Étape 1: Lancer le browser (2s max)
      const puppeteer = await getOptimizedPuppeteer();
      browser = await puppeteer.launch();
      
      console.log(`✅ Browser ready (${Date.now() - startTime}ms)`);
      
      // Étape 2: Pa11y avec configuration ultra-rapide (6s max)
      const results = await pa11y(url, {
        standard: "WCAG2AA",
        includeNotices: true,
        includeWarnings: true,
        timeout: 6000, // Timeout pa11y strict
        browser,
        wait: 200, // Attente minimale
        actions: [], // Pas d'actions custom
        ignore: [ // Ignorer certaines règles pour accélérer
          'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25.2'
        ],
        chromeLaunchConfig: {
          ignoreHTTPSErrors: true,
          args: ['--disable-web-security']
        },
        // Options de performance
        hideElements: '.ads, .advertisement, iframe[src*="ads"]',
        threshold: 0 // Pas de seuil, on veut tous les problèmes
      });

      console.log(`✅ Pa11y completed (${Date.now() - startTime}ms)`);
      return results;
    };

    // Course contre la montre !
    const results = await Promise.race([timeoutPromise, auditPromise()]);
    
    // Cleanup immédiat
    if (browser) {
      await browser.close();
      console.log(`✅ Browser closed (${Date.now() - startTime}ms)`);
    }

    const summary = normalize(results);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Full audit completed in ${duration}ms - Score: ${summary.score}`);
    
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      },
      body: JSON.stringify({ 
        url, 
        ...summary,
        meta: {
          duration,
          environment: 'netlify-production-optimized',
          version: 'pa11y-full'
        }
      })
    };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ Audit failed after ${duration}ms:`, err.message);
    
    // Cleanup robuste
    try { 
      if (browser) {
        await Promise.race([
          browser.close(),
          new Promise(resolve => setTimeout(resolve, 1000)) // Max 1s pour cleanup
        ]);
        console.log('🧹 Emergency browser cleanup completed');
      }
    } catch (closeErr) {
      console.error("⚠️ Browser cleanup failed:", closeErr.message);
    }
    
    return { 
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: `Pa11y audit failed: ${err.message}`,
        duration,
        troubleshooting: {
          suggestion: "Try the 'Audit rapide' option for a guaranteed working alternative",
          fallback: "Use /functions/audit-lightweight",
          timeout: err.message.includes('timeout') ? 'The audit took too long for Netlify limits' : null
        }
      })
    };
  }
};