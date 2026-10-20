const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: { baseURL:'http://127.0.0.1:4173', browserName:'chromium', headless:true },
  reporter: [['line'],['html',{open:'never',outputFolder:'playwright-report'}]],
  webServer: {
    command:'npm run dev',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  }
});
