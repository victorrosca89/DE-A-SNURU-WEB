const C='dn-v17',SHELL=['./','index.html','game.html','game/','game/index.html','prezentare.css','prezentare.js','styles.css','app.js','qr.js','manifest.json','icon-192.png','icon-512.png','logo.png','offline.png','config.js',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>0)))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(e.request.method!='GET')return;
 if(u.origin===location.origin){if(u.pathname.startsWith('/api')||u.pathname.startsWith('/ws')||u.pathname.startsWith('/uploads'))return}
 else if(!u.host.includes('unpkg.com'))return;   // serverul jocului, tile-urile hărții și restul resurselor externe nu se pun în cache
 e.respondWith(fetch(e.request).then(r=>{if(r.ok||r.type=='opaque'){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request)))});
