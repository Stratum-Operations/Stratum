const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`BROWSER ERROR: ${err.message}`);
  });

  console.log('Loading http://127.0.0.1:8001/ ...');
  await page.goto('http://127.0.0.1:8001/', { waitUntil: 'networkidle' });

  // Let it stay open for a few seconds to let APIs resolve
  await new Promise(resolve => setTimeout(resolve, 3000));

  await browser.close();
  console.log('Done.');
})();
