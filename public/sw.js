/* Voz de la Novia — trabajo sin conexión (app instalable) */
const CACHE='vdn-v1';
const CORE=['/','/vdn-logo.jpg?v=2','/shalom-logo.jpg?v=1','/icon-192.png','/icon-512.png','/manifest.webmanifest'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
/* Primero internet; si no hay, lo último guardado */
async function networkFirst(req,key){
  const c=await caches.open(CACHE);
  try{ const r=await fetch(req); if(r.ok) c.put(key||req,r.clone()); return r; }
  catch(err){ const m=await c.match(key||req); if(m) return m; throw err; }
}
/* Lo guardado al instante y se actualiza por detrás */
async function staleWhileRevalidate(req){
  const c=await caches.open(CACHE); const m=await c.match(req);
  const net=fetch(req).then(r=>{ if(r.ok&&r.type==='basic') c.put(req,r.clone()); return r; }).catch(()=>m);
  return m||net;
}
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const u=new URL(req.url); if(u.origin!==location.origin) return;
  if(u.pathname.startsWith('/audio/')||u.pathname.startsWith('/libro/')) return; /* audios y libros van directo (sin ocupar espacio extra) */
  if(req.mode==='navigate'){ e.respondWith(networkFirst(req,u.pathname==='/'?'/':undefined).catch(()=>caches.match('/'))); return; }
  if(u.pathname==='/api/data'||u.pathname==='/api/me'){ const key=new Request(u.pathname); e.respondWith(networkFirst(req,key)); return; }
  if(u.pathname.startsWith('/api/')) return;
  e.respondWith(staleWhileRevalidate(req));
});
