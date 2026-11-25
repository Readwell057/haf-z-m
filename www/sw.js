const C='hafizim-v1',F=['./','index.html','app.js','style.css','manifest.json','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{
if(/fonts\.(googleapis|gstatic)/.test(e.request.url)||/mp3$/.test(e.request.url)){const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{});}
return n;}).catch(()=>r)));});
