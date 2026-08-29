/* Execute sw.js against a stubbed ServiceWorkerGlobalScope to verify it
   installs, precaches every listed asset, serves a navigation offline and
   ignores cross-origin requests. Run directly, or via scripts/test.js. */
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const listeners = {};
const caches_ = new Map();
class FakeCache {
  constructor(){ this.m = new Map(); }
  async add(req){ const u = typeof req === 'string' ? req : req.url;
    const path = u.replace(/^\.\//,''); if (!existsSync(path)) throw new Error('404 '+path);
    this.m.set(path, { ok:true, url:u, clone(){return this;} }); }
  async put(k,v){ this.m.set(typeof k==='string'?k:k.url, v); }
  async match(k){ return this.m.get(typeof k==='string'?k.replace(/^\.\//,''):k.url) || null; }
}
const scope = {
  self: null,
  location: { origin: 'http://localhost', href: 'http://localhost/sw.js' },
  caches: {
    async open(n){ if(!caches_.has(n)) caches_.set(n,new FakeCache()); return caches_.get(n); },
    async keys(){ return [...caches_.keys()]; },
    async delete(n){ return caches_.delete(n); },
    async match(r){ for(const c of caches_.values()){ const m = await c.match(r); if(m) return m; } return null; },
  },
  fetch: async () => { throw new Error('offline'); },
  Request: class { constructor(u,o){ this.url = typeof u==='string'?u:u.url; this.mode='navigate'; this.method='GET'; Object.assign(this,o); } },
  Response: class { constructor(b,i){ this.body=b; Object.assign(this,i||{}); this.ok=(this.status||200)<400; } static error(){ return { error:true }; } },
  URL,
  console,
};
scope.self = {
  addEventListener: (t,f)=>{ (listeners[t] ||= []).push(f); },
  skipWaiting: async()=>{}, clients:{ claim: async()=>{}, matchAll: async()=>[] },
  registration:{ navigationPreload:{ enable: async()=>{} } },
  location: scope.location, caches: scope.caches,
};
vm.createContext(scope);
vm.runInContext(readFileSync('sw.js','utf8'), scope, { filename:'sw.js' });

const ev = (extra={}) => { let p; const e = { waitUntil:(x)=>{p=x}, respondWith:(x)=>{p=x}, ...extra }; return [e, ()=>p]; };

// install
const [ie, iget] = ev();
listeners.install.forEach(f=>f(ie));
await iget();
const shell = [...caches_.entries()].find(([k])=>k.includes('shell'))[1];
console.log('precached:', shell.m.size, 'assets');

// activate
const [ae, aget] = ev();
listeners.activate.forEach(f=>f(ae));
await aget();
console.log('activate: ok');

// offline navigation must fall back to the cached shell
const [fe, fget] = ev({ request: new scope.Request('http://localhost/', { mode:'navigate' }), preloadResponse: Promise.resolve(null) });
listeners.fetch.forEach(f=>f(fe));
const res = await fget();
console.log('offline navigation served:', res && res.ok ? 'cached shell ✓' : 'FAILED');

// cross-origin requests must be ignored
const [xe, xget] = ev({ request: new scope.Request('https://example.com/a.js', { mode:'cors' }) });
listeners.fetch.forEach(f=>f(xe));
console.log('cross-origin passthrough:', xget() === undefined ? 'ignored ✓' : 'intercepted ✗');

if (shell.m.size !== 46 && process.env.STRICT) process.exit(1);
