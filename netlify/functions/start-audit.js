import pa11y from "pa11y";
import chromium from "@sparticuz/chromium";

// Astuce: en local on utilise 'puppeteer' complet pour éviter les soucis de binaire
async function getPuppeteer() {
  if (process.env.NETLIFY === "true" && process.env.NETLIFY_LOCAL !== "true") {
    // En prod Netlify: puppeteer-core + chromium (binaire lambda)
    const puppeteer = await import("puppeteer-core");
    return {
      launch: async () =>
        await puppeteer.default.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        }),
    };
  } else {
    // En local: puppeteer full
    const puppeteer = await import("puppeteer");
    return puppeteer.default;
  }
}

function normalize(results) {
  const issues = results.issues || [];
  const errors = issues.filter(i => i.type === "error").length;
  const warnings = issues.filter(i => i.type === "warning").length;
  const notices = issues.filter(i => i.type === "notice").length;
  const score = issues.length ? Math.max(0, 100 - errors) : 100;

  const recommandations = issues.map(i => ({
    code: i.code,
    type: i.type,
    message: i.message,
    selector: i.selector,
    context: i.context,
  }));

  return {
    standard: "WCAG 2.1 AA",
    score,
    counts: { errors, warnings, notices },
    recommandations,
  };
}

export const handler = async (event) => {
  let browser;
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    
    const { url, timeoutMs = 8000 } = JSON.parse(event.body || "{}");
    if (!url) return { statusCode: 400, body: "Missing URL" };

    console.log(`🚀 Starting audit for: ${url}`);
    
    const puppeteer = await getPuppeteer();
    
    // Options optimisées pour Netlify
    const launchOptions = process.env.NETLIFY === "true" ? {
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    } : {};

    browser = await puppeteer.launch(launchOptions);
    console.log('✅ Browser launched successfully');

    // Pa11y avec timeout réduit pour Netlify
    const results = await pa11y(url, {
      standard: "WCAG2AA",
      includeNotices: true,
      includeWarnings: true,
      timeout: timeoutMs,
      browser,
      chromeLaunchConfig: {
        ignoreHTTPSErrors: true
      },
      // Réduire la charge
      wait: 1000,
      actions: []
    });

    console.log('✅ Pa11y analysis completed');
    await browser.close();

    const summary = normalize(results);
    console.log(`✅ Audit completed - Score: ${summary.score}`);
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, ...summary }),
    };
  } catch (err) {
    console.error('❌ Audit error:', err.message);
    try { 
      if (browser) await browser.close(); 
    } catch (closeErr) {
      console.error("Erreur lors de la fermeture du navigateur:", closeErr);
    }
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Audit error: ${err.message}` })
    };
  }
};
