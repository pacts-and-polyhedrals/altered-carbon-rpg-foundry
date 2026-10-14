const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const [dir,w,h]=process.argv.slice(2);const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h}});
for(const [f,t] of [['under',false],['over',true]]){await p.goto('file://'+dir+'/'+f+'.svg');await p.waitForTimeout(500);
 if(t)await p.evaluate(()=>{document.documentElement.style.background='transparent'});
 await p.screenshot({path:dir+'/'+f+'.png',omitBackground:t});}
await b.close();})();
