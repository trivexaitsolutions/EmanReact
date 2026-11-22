const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function compile(f){const out=ts.transpileModule(read(f),{fileName:f,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});assert.equal(out.diagnostics.length,0,f);return out.outputText;}
const files=['app/index.tsx','app/user/dashboard.tsx','app/user/profile.tsx','app/worker/login.tsx','app/worker/profile.tsx','app/user/book-worker-step1.tsx','app/user/book-worker-step2.tsx','app/user/book-worker-step3.tsx','app/user/book-worker-select-workers.tsx','components/ui/booking-step-header.tsx','components/booking-step-header.tsx','utils/useMitraCall.ts','i18n/extra-translations.ts'];
test('all modified modules transpile',()=>files.forEach(compile));
test('customer menus and worker login actions are wired; logout preserved',()=>{
 const home=read(files[1]),profile=read(files[2]),login=read(files[3]),worker=read(files[4]);
 assert.doesNotMatch(home,/t\("Wallet"\)|t\("Location"\)/);assert.doesNotMatch(profile,/t\("Wallet"\)|t\("Settings"\)/);assert.match(home,/router\.push\("\/user\/profile"\)/);
 assert.doesNotMatch(login,/t\("Forgot PIN\?"\)|t\("Privacy"\)/);for(const screen of [home,profile,login,worker])assert.match(screen,/onPress=\{callMitra\}/);
 for(const screen of [profile,worker])assert.match(screen,/await logoutMobileSession\(/);
});
test('booking headers track actual four-screen or three-screen route',()=>{
 assert.match(read(files[5]),/totalSteps=\{assignmentMode \?/);assert.match(read(files[6]),/totalSteps=\{assignmentMode \?/);
 assert.match(read(files[7]),/step=\{draft\.assignmentMode === "CUSTOMER_SELECT" \? 4 : 3\}/);
 assert.match(read(files[8]),/BookingProgress step=\{3\} totalSteps=\{4\}/);
 assert.match(read(files[9]),/Array\.from\(\{ length: totalSteps \}/);assert.doesNotMatch(read(files[9]),/of 3/);
});
test('role cards have visible translated labels and new contact keys exist in both dictionaries',()=>{
 assert.match(read(files[0]),/styles\.roleLabel\}>\{t\("Worker"\)\}/);assert.match(read(files[0]),/styles\.roleLabel\}>\{t\("Customer"\)\}/);
 const exports={};vm.runInNewContext(compile('i18n/extra-translations.ts'),{exports});const dictionary=exports.EXTRA_TRANSLATIONS;
 for(const lang of ['hi','mr'])for(const key of ['Worker','Customer','Call Field Agent','No assigned Field Agent is available.','No nearby Field Agent is available.','Enable location access to find a nearby Field Agent.','Unable to contact Field Agent. Please try again.','No Field Agent is currently available.','Too many requests. Please try again later.'])assert.ok(dictionary[lang][key],lang+key);
});
function setup({permission='granted',responses=[],error=null}={}){
 const requests=[],alerts=[],dial=[];let gps=0;
 const axios={get:async(u,o)=>send(u,null),post:async(u,b,o)=>send(u,b)};
 async function send(u,b){requests.push({url:u,body:b});if(error)throw error;return {data:responses.shift()};}
 const deps={react:{useRef:v=>({current:v}),useState:v=>[v,()=>{}]},'react-native':{Alert:{alert:(...a)=>alerts.push(a)},Linking:{openURL:async u=>dial.push(u)}},axios,'expo-location':{requestForegroundPermissionsAsync:async()=>{gps++;return {status:permission}},hasServicesEnabledAsync:async()=>true,getCurrentPositionAsync:async()=>({coords:{latitude:19,longitude:73}}),Accuracy:{Balanced:1}},'../constants/api':{API_URL:'http://test/api'},'../i18n':{useI18n:()=>({t:s=>s})}};
 const exports={};vm.runInNewContext(compile('utils/useMitraCall.ts'),{exports,require:k=>deps[k],setTimeout,clearTimeout});return {hook:exports.useMitraCall,requests,alerts,dial,gps:()=>gps};
}
const contact={success:true,contact:{phone:'9876543210'}};
test('assigned customer calls without GPS prompt',async()=>{const s=setup({responses:[contact]});await s.hook('customer').callMitra();assert.equal(s.gps(),0);assert.equal(s.requests.length,1);assert.equal(s.dial[0],'tel:9876543210')});
test('customer without assigned agent asks GPS, otherwise uses own saved address',async()=>{const s=setup({permission:'denied',responses:[{success:true,code:'LOCATION_REQUIRED'},contact]});await s.hook('customer').callMitra();assert.equal(s.gps(),1);assert.equal(s.requests[1].body.useSavedAddress,true);assert.equal(s.dial.length,1)});
test('worker login requires no GPS; even denied permission can dial',async()=>{const s=setup({permission:'denied',responses:[contact]});await s.hook('workerLogin').callMitra();assert.equal(s.requests.length,1);assert.equal(s.gps(),0);assert.equal(s.dial.length,1)});
test('worker login uses available endpoint and worker profile uses authenticated endpoint',async()=>{const a=setup({responses:[contact]});await a.hook('workerLogin').callMitra();assert.equal(a.requests[0].url,'http://test/api/worker/support-contact/available');const b=setup({responses:[contact]});await b.hook('workerProfile').callMitra();assert.equal(b.requests[0].url,'http://test/api/worker/support-contact');assert.equal(b.gps(),0)});
test('invalid phone never dials; network error yields localized support message',async()=>{const s=setup({responses:[{success:true,contact:{phone:'tel:bad'}}]});await s.hook('workerProfile').callMitra();assert.equal(s.dial.length,0);assert.equal(s.alerts.length,1);const b=setup({error:new Error('offline')});await b.hook('workerProfile').callMitra();assert.equal(b.alerts.length,1)});
