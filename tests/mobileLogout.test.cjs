const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {test} = require('node:test');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file), 'utf8');
const files = ['utils/mobileAuthClient.ts','app/user/profile.tsx','app/worker/profile.tsx','app/worker/dashboard.tsx','app/user/create-booking.tsx'];
function transpile(file) {
 const result=ts.transpileModule(read(file), {fileName:file, reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 assert.equal(result.diagnostics.length,0,file); return result.outputText;
}
function setup(fetcher=async()=>({ok:true})) {
 const secure=new Map(), storage=new Map([['@eman:language:chosen:v1','1'],['language','mr'],['catalog','cached'],['customerSession','{"id":13}'],['workerSession','{"id":17}'],['activeRole','user'],['newBookingDraft','{}']]);
 const valid=k=>assert.match(k,/^[A-Za-z0-9._-]+$/);
 const store={setItemAsync:async(k,v)=>{valid(k);secure.set(k,v)},getItemAsync:async k=>{valid(k);return secure.get(k)??null},deleteItemAsync:async k=>{valid(k);secure.delete(k)}};
 let req, resp; const axios={interceptors:{request:{use:f=>req=f},response:{use:(f,g)=>resp=g}}}; let route;
 const deps={'expo-secure-store':store,axios,'@react-native-async-storage/async-storage':{getItem:async k=>storage.get(k)??null,multiRemove:async keys=>keys.forEach(k=>storage.delete(k))},'expo-router':{router:{replace:r=>route=r}},'../constants/api':{API_URL:'http://local/api'}};
 const exports={}; vm.runInNewContext(transpile(files[0]),{exports,require:k=>deps[k],fetch:fetcher,AbortController,setTimeout,clearTimeout});
 return {auth:exports,secure,storage,req,resp,route:()=>route};
}
function cleared(s){assert.equal(s.secure.size,0); for(const k of ['customerSession','workerSession','activeRole','newBookingDraft'])assert.equal(s.storage.has(k),false);assert.equal(s.storage.get('language'),'mr');assert.equal(s.storage.get('catalog'),'cached');assert.equal(s.storage.get('@eman:language:chosen:v1'),'1');}
test('changed TS/TSX syntax and screen logout wiring',()=>{files.forEach(transpile);for(const f of files.slice(1)){assert.match(read(f),/await logoutMobileSession\(/);assert.match(read(f),/CommonActions\.reset/);}});
test('customer token stored and removed under valid SecureStore keys',async()=>{let sent;const s=setup(async(u,o)=>{sent={u,o};return {ok:true}});await s.auth.storeMobileToken('test-token','user');assert.equal(await s.auth.getMobileToken(),'test-token');await s.auth.logoutMobileSession(true);assert.equal(sent.u,'http://local/api/user/presence');assert.equal(sent.o.headers.Authorization,'Bearer test-token');cleared(s);});
test('offline presence failure does not block logout',async()=>{const s=setup(async()=>{throw Error('offline')});await s.auth.storeMobileToken('test-token','user');await s.auth.logoutMobileSession(true);cleared(s);});
test('worker logout clears token and both sessions',async()=>{const s=setup();await s.auth.storeMobileToken('worker-token','worker');await s.auth.logoutMobileSession();cleared(s);});
test('legacy ID-only session can logout without token',async()=>{const s=setup();await s.auth.logoutMobileSession(true);cleared(s);});
test('expired token clears session on protected 401',async()=>{const s=setup();await s.auth.storeMobileToken('expired','user');await assert.rejects(s.resp({config:{url:'http://local/api/user/profile/13'},response:{status:401}}));cleared(s);assert.equal(s.route(),'/');});
