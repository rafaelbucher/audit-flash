// Version ultra-optimisée pour Netlify avec timeout minimal et gestion d'erreur robuste
import pa11y from "pa11y";

// Configuration minimaliste pour Netlify
async function getPuppeteerForNetlify() {
  try {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    
    // Configuration ultra-minimale pour Netlify
    const executablePath = await chromium.default.executablePath({
      cacheDir: "/tmp/.chrome"
    });
    
    return {
      launch: async () => {
        console.log('🚀 Launching Chrome with minimal config...');
        return await puppeteer.default.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--single-process',
            '--no-zygote',
            '--memory-pressure-off',
            '--max_old_space_size=512'
          ],
          defaultViewport: { width: 1280, height: 720 },
          executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
          timeout: 5000 // Timeout très court pour le launch
        });
      }
    };
  } catch (error) {
    console.error('❌ Failed to setup Puppeteer for Netlify:', error);
    throw error;
  }
}

function normalize(results) {
  const issues = results.issues || [];
  const errors = issues.filter(i => i.type === "error").length;
  const warnings = issues.filter(i => i.type === "warning").length;
  const notices = issues.filter(i => i.type === "notice").length;
  const score = Math.max(0, 100 - Math.min(errors * 2, 80));

  const recommandations = issues.slice(0, 20).map(i => ({
    code: i.code,
    type: i.type,
    message: i.message,
    selector: i.selector?.substring(0, 100),
    context: i.context?.substring(0, 100)
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
    console.log('🚀 Netlify audit started');
    
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

    console.log(`📊 Auditing: ${url}`);
    
    // Timeout global de 8 secondes (Netlify Free = 10s max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function timeout after 8s')), 8000);
    });
    
    const auditPromise = async () => {
      const puppeteer = await getPuppeteerForNetlify();
      browser = await puppeteer.launch();
      console.log('✅ Browser ready');

      const results = await pa11y(url, {
        standard: "WCAG2AA",
        includeNotices: true,
        includeWarnings: true,
        timeout: 6000, // Timeout pa11y de 6s
        browser,
        wait: 500, // Attente minimale
        actions: [], // Pas d'actions supplémentaires
        ignore: [], // Pas d'ignore pour aller plus vite
        chromeLaunchConfig: {
          ignoreHTTPSErrors: true
        }
      });

      console.log('✅ Analysis completed');
      return results;
    };

    // Course contre la montre
    const results = await Promise.race([timeoutPromise, auditPromise()]);
    
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed');
    }

    const summary = normalize(results);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Audit completed in ${duration}ms - Score: ${summary.score}`);
    
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300" // Cache 5 minutes
      },
      body: JSON.stringify({ 
        url, 
        ...summary,
        meta: {
          duration,
          environment: 'netlify-optimized'
        }
      })
    };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ Audit failed after ${duration}ms:`, err.message);
    
    try { 
      if (browser) {
        await browser.close(); 
        console.log('🧹 Browser cleanup completed');
      }
    } catch (closeErr) {
      console.error("⚠️ Browser cleanup error:", closeErr.message);
    }
    
    return { 
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: `Audit failed: ${err.message}`,
        duration,
        troubleshooting: {
          suggestion: "Try with a simpler URL or check if the website is accessible",
          fallback: "Use /functions/audit-lightweight for basic analysis"
        }
      })
    };
  }
};