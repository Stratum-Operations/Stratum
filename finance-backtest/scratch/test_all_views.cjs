const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
      console.log(`[CONSOLE] [${msg.type().toUpperCase()}]: ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR]: ${err.message}`);
    });

    page.on('requestfailed', request => {
      console.error(`[REQUEST FAILED]: ${request.url()} - ${request.failure()?.errorText}`);
    });

    console.log('Loading dashboard at http://localhost:3000/ ...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    const tabs = [
      { name: 'Command Center', text: 'PORTFOLIO NAV' },
      { name: 'Alpha Screener', text: 'FACTOR WEIGHTS' },
      { name: 'Backtest Lab', text: 'EQUITY CURVE' },
      { name: 'Execution Blotter', text: 'ESTIMATED TURNOVER' },
      { name: 'Evaluator Audit', text: 'EVAL SCORE' },
    ];

    for (const tab of tabs) {
      console.log(`\n--- Clicking tab: ${tab.name} ---`);
      await page.click(`text="${tab.name}"`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const bodyText = await page.innerText('body');
      if (bodyText.includes(tab.text)) {
        console.log(`Success: Tab ${tab.name} rendered correct unique text "${tab.text}".`);
      } else {
        console.warn(`Warning: Tab ${tab.name} might not have rendered. Expected: "${tab.text}".`);
      }
      
      // Let's print a small excerpt of the tab content to check for values
      console.log('Excerpt of body:');
      console.log(bodyText.split('\n').slice(0, 15).join('\n'));
    }

  } catch (e) {
    console.error('Test execution failed:', e);
  } finally {
    if (browser) await browser.close();
    console.log('\nDone.');
  }
})();
