const CACHE_NAME='aisle13-app-v61';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './app-icon.svg',
  './app-icon-192.png',
  './app-icon-512.png',
  './style.css?v=32',
  './horror-mobile.css?v=61',
  './script.js?v=61',
  './mr-hollow.jpg',
  './mr-hollow.png',
  './aisle13-keyart.jpg',
  './aisle13-keyart.png',
  './danger-song.mp3?v=51',
  './death-song.mp3?v=51',
  './lights-out-song.mp3?v=51',
  './store-song.mp3?v=51',
  './exploration-song.mp3?v=51'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>Promise.allSettled(APP_SHELL.map(url=>cache.add(url)))));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('aisle13-app-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))));
  self.clients.claim();
});

async function rangedResponse(request,cached){
  const range=request.headers.get('range');
  if(!range||!cached)return cached;
  const bytes=await cached.arrayBuffer();
  const match=/bytes=(\d+)-(\d*)/.exec(range);
  if(!match)return cached;
  const start=Number(match[1]);
  const end=match[2]?Number(match[2]):bytes.byteLength-1;
  const chunk=bytes.slice(start,end+1);
  const headers=new Headers(cached.headers);
  headers.set('Content-Range',`bytes ${start}-${end}/${bytes.byteLength}`);
  headers.set('Content-Length',String(chunk.byteLength));
  headers.set('Accept-Ranges','bytes');
  return new Response(chunk,{status:206,statusText:'Partial Content',headers});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));
      return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }

  event.respondWith(caches.match(request,{ignoreSearch:false}).then(async cached=>{
    if(cached)return rangedResponse(request,cached);
    try{
      const response=await fetch(request);
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
      }
      return response;
    }catch(error){
      return caches.match(request,{ignoreSearch:true});
    }
  }));
});
