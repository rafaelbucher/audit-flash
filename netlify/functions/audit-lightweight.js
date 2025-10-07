// Solution sans Puppeteer - Analyse via fetch + heuristiques simples
export const handler = async (event) => {
  try {
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
        body: JSON.stringify({ error: "Missing URL" })
      };
    }

    console.log(`🚀 Lightweight audit for: ${url}`);

    // Fetch du HTML pour analyse basique
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    let html;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AccessibilityAudit/1.0)'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      html = await response.text();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to fetch ${url}: ${fetchError.message}`);
    }

    console.log(`✅ HTML fetched (${html.length} chars)`);

    // Analyse heuristique simple du HTML
    const issues = [];
    let score = 100;

    // Vérifications basiques d'accessibilité
    
    // 1. Images sans alt
    const imgWithoutAlt = (html.match(/<img(?![^>]*alt\s*=)[^>]*>/gi) || []).length;
    if (imgWithoutAlt > 0) {
      issues.push({
        code: "WCAG2AA.Principle1.Guideline1_1.1_1_1.G94.Image",
        type: "error",
        message: `${imgWithoutAlt} image(s) missing alt attribute`,
        selector: "img",
        context: "Images without alt text are not accessible to screen readers"
      });
      score -= imgWithoutAlt * 3;
    }

    // 2. Liens sans texte
    const emptyLinks = (html.match(/<a[^>]*>(\s*|<img[^>]*>)?<\/a>/gi) || []).length;
    if (emptyLinks > 0) {
      issues.push({
        code: "WCAG2AA.Principle2.Guideline2_4.2_4_4.H77",
        type: "error", 
        message: `${emptyLinks} link(s) without descriptive text`,
        selector: "a",
        context: "Links must have descriptive text or accessible labels"
      });
      score -= emptyLinks * 4;
    }

    // 3. Titre de page manquant
    if (!html.match(/<title[^>]*>.*?<\/title>/i)) {
      issues.push({
        code: "WCAG2AA.Principle2.Guideline2_4.2_4_2.H25",
        type: "error",
        message: "Page missing title element",
        selector: "html > head",
        context: "Every page must have a descriptive title"
      });
      score -= 10;
    }

    // 4. Langue manquante
    if (!html.match(/<html[^>]*lang\s*=/i)) {
      issues.push({
        code: "WCAG2AA.Principle3.Guideline3_1.3_1_1.H57",
        type: "error",
        message: "Page missing language declaration",
        selector: "html",
        context: "HTML element must have lang attribute"
      });
      score -= 5;
    }

    // 5. Titres manquants (heuristique)
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
    if (h1Count === 0) {
      issues.push({
        code: "WCAG2AA.Principle1.Guideline1_3.1_3_1.G130",
        type: "warning",
        message: "Page appears to be missing main heading (h1)",
        selector: "body",
        context: "Pages should have a clear heading structure starting with h1"
      });
      score -= 8;
    } else if (h1Count > 1) {
      issues.push({
        code: "WCAG2AA.Principle1.Guideline1_3.1_3_1.G130",
        type: "warning",
        message: `Multiple h1 elements found (${h1Count})`,
        selector: "h1",
        context: "Pages should typically have only one main heading (h1)"
      });
      score -= 3;
    }

    // 6. Formulaires sans labels
    const inputsWithoutLabels = (html.match(/<input(?![^>]*id\s*=|[^>]*aria-label)[^>]*>/gi) || []).length;
    if (inputsWithoutLabels > 0) {
      issues.push({
        code: "WCAG2AA.Principle1.Guideline1_3.1_3_1.H44",
        type: "error",
        message: `${inputsWithoutLabels} form input(s) without proper labels`,
        selector: "input",
        context: "Form inputs must have associated labels or aria-label"
      });
      score -= inputsWithoutLabels * 4;
    }

    // 7. Contraste basique (détection de styles inline avec couleurs suspectes)
    const suspiciousColors = (html.match(/color\s*:\s*#[a-f0-9]{3,6}/gi) || []).length;
    if (suspiciousColors > 5) {
      issues.push({
        code: "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18",
        type: "warning",
        message: "Potential color contrast issues detected",
        selector: "*[style]",
        context: "Manual verification of color contrast ratios recommended"
      });
      score -= 5;
    }

    // Calcul final du score
    const finalScore = Math.max(0, Math.min(100, score));
    const errors = issues.filter(i => i.type === "error").length;
    const warnings = issues.filter(i => i.type === "warning").length;
    const notices = issues.filter(i => i.type === "notice").length;

    console.log(`✅ Lightweight analysis completed - Score: ${finalScore}`);

    const result = {
      url,
      standard: "WCAG 2.1 AA (Basic Analysis)",
      score: finalScore,
      counts: { errors, warnings, notices },
      recommandations: issues,
      meta: {
        method: "lightweight-heuristic",
        disclaimer: "This is a basic analysis. For comprehensive accessibility testing, use a full browser-based audit.",
        htmlSize: html.length,
        timestamp: new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      },
      body: JSON.stringify(result)
    };
    
  } catch (err) {
    console.error('❌ Lightweight audit error:', err);
    return { 
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: err.message,
        method: "lightweight-heuristic"
      })
    };
  }
};