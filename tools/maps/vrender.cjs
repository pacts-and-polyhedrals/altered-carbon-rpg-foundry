const { chromium } = require('/opt/npm-tools/node_modules/playwright');const fs=require('fs');
(async()=>{const [dir,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});const b=await chromium.launch();const p=await b.newPage();
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.svg'))){const svg=fs.readFileSync(dir+'/'+f,'utf8');const w=+svg.match(/width="([\d.]+)"/)[1],h=+svg.match(/height="([\d.]+)"/)[1];
await p.setViewportSize({width:Math.round(w),height:Math.round(h)});await p.goto('file://'+dir+'/'+f);await p.evaluate(()=>{document.documentElement.style.background='transparent';document.body&&(document.body.style.background='transparent')});
await p.screenshot({path:out+'/'+f.replace('.svg','.png'),omitBackground:true});}await b.close();})();
