const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type().toUpperCase()}]: ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.error(`BROWSER ERROR: ${err.message}`);
    });

    page.on('requestfailed', request => {
      console.error(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });

    console.log('Loading http://127.0.0.1:8001/ ...');
    await page.goto('http://127.0.0.1:8001/', { waitUntil: 'networkidle' });

    // Wait for the main page to load and API requests to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (e) {
    console.error('Test execution failed:', e);
  } finally {
    if (browser) await browser.close();
    console.log('Done.');
  }
})();
