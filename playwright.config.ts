import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',timeout:90000,workers:1,
  use:{baseURL:'http://127.0.0.1:5193',channel:'chrome',headless:true,viewport:{width:1440,height:960},launchOptions:{args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']},screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5193',reuseExistingServer:true,timeout:60000},
});
