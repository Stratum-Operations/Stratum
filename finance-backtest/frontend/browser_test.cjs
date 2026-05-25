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

    console.log('Loading http://localhost:3000/ ...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Wait for the main page to load and API requests to settle
    await new Promise(resolve => setTimeout(resolve, 3000));

    const text = await page.innerText('body');
    console.log('--- BODY TEXT START ---');
    console.log(text);
    console.log('--- BODY TEXT END ---');
  } catch (e) {
    console.error('Test execution failed:', e);
  } finally {
    if (browser) await browser.close();
    console.log('Done.');
  }
})();
