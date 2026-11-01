import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_BROWSER_PATH || undefined,headless:true});
const base=(process.argv[2] || 'http://localhost:4337/noa-energy-atlas').replace(/\/$/,'');
const errors=[];
let checks=0;
const verify=(value,message)=>{assert.ok(value,message);checks++};
try {
for(const mobile of [false,true]) {
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/');
 await page.locator('[data-graph-action="zoom-in"]').click();
 verify(new URL(page.url()).searchParams.get('category')==='Electricity','Overview zoom enters central sector');
 verify(await page.locator('#map-directory').evaluate(e=>e.open),'Sector directory expands automatically');
 verify(await page.locator('[data-record-row]:visible').count()===8,'Electricity shows eight readable records');
 await page.locator('#sector-jump').selectOption('Renewables');
 verify(await page.locator('[data-record-row]:visible').count()===9,'Sector switch updates cards');
 await page.locator('#map-directory summary').click();
 await page.locator('#sector-jump').selectOption('Petroleum');
 verify(await page.locator('#map-directory').evaluate(e=>e.open),'Entering another sector reopens records');
 await page.locator('#map-back').click();
 verify(await page.locator('.sector-port:visible').count()===6,'Back restores sector overview');
 if(!mobile) {
   await page.locator('.sector-port[data-graph-filter="Climate"]').hover();
   await page.mouse.wheel(0,-90);
   await page.waitForFunction(()=>new URL(location.href).searchParams.get('category')==='Climate');
   verify(await page.locator('#map-directory').evaluate(e=>e.open),'Wheel zoom reveals sector records');
 } else {
   const port=await page.locator('.sector-port[data-graph-filter="Electricity"]').boundingBox();
   const cdp=await page.context().newCDPSession(page);
   const x=port.x+port.width/2,y=port.y+port.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-20,y,id:1},{x:x+20,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-40,y,id:1},{x:x+40,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(150);
   verify(new URL(page.url()).searchParams.get('category')==='Electricity','Phone pinch expands sector');
 }
 await page.locator('#sector-jump').selectOption('Electricity');
 await page.locator('[data-preview-record="ins-law-462"]').click();
 verify(await page.locator('#graph-inspector').getAttribute('data-open')==='true','Record card opens in-map details');
 const related=page.locator('#inspector-relations [data-preview-record]').first();
 const next=await related.getAttribute('data-preview-record');
 await related.click();
 verify(new URL(page.url()).searchParams.get('instrument')===next.replace('ins-',''),'Connected record stays in map');
 await page.locator('.inspector-close').click();
 await page.locator('#map-back').click();
 await page.locator('#atlas-query').fill('Law 462');
 await page.locator('#atlas-query').press('Enter');
 verify(await page.locator('#inspector-title').innerText().then(t=>t.includes('462')),'Enter opens search result');
 await page.reload();
 verify(await page.locator('#graph-inspector').getAttribute('data-open')==='true','Shared URL restores selected record');
 await page.locator('.inspector-close').click();
 await page.locator('#atlas-query').fill('no matching legal record xyz');
 verify(await page.locator('#map-empty').isVisible(),'Search empty state appears');
 await page.locator('#atlas-query').press('Escape');
 verify(await page.locator('#atlas-query').inputValue()==='','Escape clears search');
 await page.locator('#map-back').click();
 await page.locator('.sector-port[data-graph-filter="Electricity"]').click();
 await page.locator('[data-graph-action="zoom-out"]').click();
 await page.locator('[data-graph-action="zoom-out"]').click();
 verify(await page.locator('.sector-map').isVisible(),'Zooming out returns to overview');
 await page.locator('.sector-port[data-graph-filter="Electricity"]').click();
 const toggle=page.locator(mobile?'.mobile-lang':'.view-switcher .language-toggle');
 await toggle.click();
 verify(await page.locator('html').getAttribute('dir')==='rtl','RTL navigation supported');
 verify(await page.locator('#map-back').innerText()==='كل القطاعات','Back label translated');
 verify(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
 await page.screenshot({path:`qa-screenshots/refined-${mobile?'mobile':'desktop'}.png`,fullPage:true});
 await page.close();
}
verify(errors.length===0,errors.join('\n'));
console.log(JSON.stringify({status:'PASS',checks}));
} finally { await browser.close(); }
