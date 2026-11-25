const C='hafizim-v2',F=['./','index.html','app.js','style.css','manifest.json','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('hafizim-v')&&x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const rg=q.headers.get('range');
if(rg&&/\.mp3$/.test(q.url)){e.respondWith(caches.match(q.url).then(async r=>{if(!r)return fetch(q);const b=await r.blob(),m=/bytes=(\d+)-(\d*)/.exec(rg),s=+m[1],en=m[2]?+m[2]+1:b.size;
return new Response(b.slice(s,en),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':`bytes ${s}-${en-1}/${b.size}`}})}));return}
e.respondWith(caches.match(q.url).then(r=>r||fetch(q).then(n=>{if(/fonts\.(googleapis|gstatic)/.test(q.url)){const cp=n.clone();caches.open(C).then(c=>c.put(q,cp)).catch(()=>{})}return n}).catch(()=>r)))});
