import puppeteer from 'puppeteer';

/**
 * Extracts a Spatial Manifest containing bounding boxes and visual properties
 * for elements with `[id]` or `[data-animate="true"]`.
 * 
 * @param {string} htmlContent 
 * @param {string} cssContent 
 * @returns {Promise<Object>} Spatial Manifest object conforming to specification.
 */
export async function extractSpatialManifest(htmlContent, cssContent) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    
    // Explicitly set viewport to 1920x1080
    await page.setViewport({ width: 1920, height: 1080 });

    // Inject full HTML + CSS document
    const fullDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssContent || ''}</style>
        </head>
        <body>${htmlContent || ''}</body>
      </html>
    `;

    try {
      await page.setContent(fullDocument, { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch {
      await page.setContent(fullDocument, { waitUntil: 'load', timeout: 10000 });
    }

    // Extract DOM spatial manifest
    const manifest = await page.evaluate(() => {
      const targets = Array.from(document.querySelectorAll('[id], [data-animate="true"]'));
      const elements = targets.map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        const x = Math.round(rect.x);
        const y = Math.round(rect.y);
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        return {
          id: el.id || el.getAttribute('data-animate') || `elem-${Math.random().toString(36).substr(2, 5)}`,
          tag: el.tagName.toLowerCase(),
          bounding_box: {
            x,
            y,
            width,
            height,
            center_x: Math.round(x + width / 2),
            center_y: Math.round(y + height / 2)
          },
          styles: {
            opacity: parseFloat(style.opacity) !== undefined && !isNaN(parseFloat(style.opacity)) ? parseFloat(style.opacity) : 1.0,
            z_index: style.zIndex !== 'auto' && !isNaN(parseInt(style.zIndex)) ? parseInt(style.zIndex) : 1
          }
        };
      });

      return {
        screen_resolution: "1920x1080",
        elements_count: elements.length,
        elements
      };
    });

    return manifest;
  } finally {
    await browser.close();
  }
}
