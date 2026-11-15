function showErr(t){try{let d=document.getElementById('jserr');if(!d){d=document.createElement('div');d.id='jserr';d.onclick=()=>d.remove();document.body.append(d)}d.textContent='Eroare: '+t+' (atinge ca să închizi)'}catch(e){}}
addEventListener('error',e=>showErr((e.message||'necunoscută')+(e.lineno?' @'+e.lineno:'')));
addEventListener('unhandledrejection',e=>showErr(String(e.reason&&e.reason.message||e.reason)));
const API=(window.DN_SERVER||'').replace(/\/$/,''),NATIVE=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const plug=n=>{try{if(typeof Capacitor.registerPlugin==='function')return Capacitor.registerPlugin(n)}catch(e){}return(Capacitor.Plugins&&Capacitor.Plugins[n])||null};
const Game=NATIVE?plug('Game'):null;
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),LS=localStorage;
let fails=0,joining=false,gpsOn=false,tl,S=null,M=null,I=null,off=0,pos=null,posAcc=null,map,ws,lastSend=0,alerted=false,actx,noRe=false,step=0,cur=null,lsig='',lastView='',camStream,camBlob,camCb,wl,heading=null,nstarted='';
let tsrc=0,terr=0,mapReady=false;
let sosPhoto=false,sosPhotoT=0,sosPhotoW=0;   // flux foto după SOS
let sosSeen='',panelOpen=true,route=null,routeAt=0,routeFrom=null,routeTo=null,sirenT=null,sirenO=null,sirenStop=0,hold=null;
const lay={p:{},ph:{},cp:{},ring:{},me:null,acc:null,sosPin:null,sosLines:{},route:null,line:null};
function mkTok(){try{const a=new Uint8Array(20);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')}catch(e){return Array.from({length:40},()=>Math.floor(Math.random()*16).toString(16)).join('')}}
if(!/^[A-Za-z0-9_-]{16,64}$/.test(LS.dn_tok||''))LS.dn_tok=mkTok();
const TOK=LS.dn_tok;
const now=()=>(Date.now()+off)/1000;
const fmt=s=>{s=Math.max(0,Math.ceil(s));const h=s/3600|0,m=(s%3600)/60|0,x=s%60;return(h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+String(x).padStart(2,'0')};
const ago=s=>{s=Math.max(0,Math.floor(s));return s<60?s+' s':fmt(s)};
const vib=p=>navigator.vibrate&&navigator.vibrate(p);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const send=m=>ws&&ws.readyState==1&&ws.send(JSON.stringify(m));
const err=t=>$('#err').textContent=t;
const st_=(sel,t)=>{const e=$(sel);if(e&&e.textContent!==t)e.textContent=t};
let ldT=0;
function ld(a,b){$('#boot').hidden=false;st_('#btitle',a);st_('#bmsg',b||'');clearTimeout(ldT);ldT=setTimeout(()=>{if(!$('#boot').hidden)st_('#bmsg','Durează mai mult decât de obicei… verifică internetul sau apasă Anulează.')},15000)}
function ldOff(){clearTimeout(ldT);$('#boot').hidden=true}
let popCb=null,gone=0,psig='',csig='';
const dist=d=>d<1000?Math.round(d)+' m':(d/1000).toFixed(d<10000?2:1)+' km';
const hav=(a,b,c,d)=>{const t=x=>x*Math.PI/180,p=t(c-a),q=t(d-b),h=Math.sin(p/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(q/2)**2;return 12742000*Math.asin(Math.sqrt(h))};
const brg=(a,b,c,d)=>{const t=x=>x*Math.PI/180,y=Math.sin(t(d-b))*Math.cos(t(c)),x=Math.cos(t(a))*Math.sin(t(c))-Math.sin(t(a))*Math.cos(t(c))*Math.cos(t(d-b));return(Math.atan2(y,x)*180/Math.PI+360)%360};
const DIR=['N','NE','E','SE','S','SV','V','NV'];
/* roluri: Hider roșu · Seeker galben · pierdut gri */
const isLost=p=>!!p&&!!p.st&&p.st!=='alive';
const rl=p=>isLost(p)?'Spectator':p.role=='seeker'?'Seeker':'Hider',rc=p=>isLost(p)?'d':p.role=='seeker'?'s':'h';
const xIcon=()=>L.divIcon({className:'',html:'<div class="xpin"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></div>',iconSize:[26,26]});
const meCls=()=>'me '+(!M?'':isLost(M)?'dead':M.role=='seeker'?'seeker':'hider');
const ROLEC={dead:'#0a84ff',seeker:'#ffd60a',hider:'#ff3b30'};
function beep(){try{actx=actx||new AudioContext();[0,.22,.44].forEach(d=>{const o=actx.createOscillator();o.frequency.value=900;o.connect(actx.destination);o.start(actx.currentTime+d);o.stop(actx.currentTime+d+.14)})}catch(e){}}
async function wake(){try{wl=await navigator.wakeLock.request('screen')}catch(e){}}
addEventListener('deviceorientationabsolute',e=>{if(e.alpha!=null)heading=(360-e.alpha)%360},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible'){if(I)wake();checkPending();if(S&&I&&lastView=='game')mapUpdate()}});
addEventListener('dn-intent',()=>checkPending());

/* ---------- bridge nativ (serviciu în fundal) ---------- */
function nativeStart(){if(!Game||!I||!pos)return;const k=I.code+':'+I.user;if(nstarted===k)return;nstarted=k;
 Game.start({api:API,code:I.code,user:I.user,tok:TOK,name:I.name}).catch(()=>{nstarted=''})}
function nativeStop(){if(Game)Game.stop().catch(()=>{});nstarted=''}
async function checkPending(){if(!Game||!I)return;try{const r=await Game.pending();if(r&&r.sos)askSos()}catch(e){}}
function openUrl(u){if(Game)Game.openUrl({url:u}).catch(()=>{});else window.open(u,'_blank')}

/* ---------- link cameră + QR ---------- */
const WEB=(window.DN_WEB||(NATIVE&&API?API:new URL('.',location.href).href)).replace(/index\.html$/,'').replace(/([^/])$/,'$1/');
const roomLink=c=>WEB+'?c='+c;
if(!NATIVE)$('#gapk').hidden=false;
if(window.DN_APK)$('#gapk').href=window.DN_APK;
if(window.DN_GITHUB)$('#ggh').href=window.DN_GITHUB;
if(window.DN_MAIL)$('#gmail').href='mailto:'+window.DN_MAIL+'?subject='+encodeURIComponent("Idei pentru DE-A ȘNURU");
if(NATIVE)['#ggh','#gmail'].forEach(k=>{$(k).onclick=e=>{e.preventDefault();openUrl($(k).href)}});
const copyTxt=(u,ok)=>{(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(ok,()=>prompt('Copiază linkul',u))};
function showQR(){if(!S)return;const u=roomLink(S.code);$('#qrcode').textContent=S.code;$('#qrlink').textContent=u;
 try{QR.draw($('#qrcv'),u,260)}catch(e){feed('Nu am putut genera QR-ul')}$('#qrm').hidden=false}
$('#qrx').onclick=()=>$('#qrm').hidden=true;$('#qrm').onclick=e=>{if(e.target.id=='qrm')e.target.hidden=true};
$('#qrcopy').onclick=()=>copyTxt(roomLink(S.code),()=>feed('Link copiat'));
$('#lqr').onclick=showQR;

/* ---------- SPLASH ---------- */
const SP={p:0,t0:performance.now(),done:false};
const SPM=[[0,'Se pornește motorul…'],[22,'Se încarcă harta lumii…'],[52,'Se pregătește GPS-ul…'],[80,'Aproape gata…'],[100,'Gata de vânătoare!']];
function spFrame(t){
 const el=t-SP.t0,ready=el>2400&&(mapReady||el>6500),target=ready?100:Math.min(92,100*(1-Math.exp(-el/1500)));
 SP.p+=(target-SP.p)*(ready?.16:.09);if(SP.p>99.6)SP.p=100;
 $('#spArc').style.strokeDashoffset=628.32*(1-SP.p/100);$('#spDot').style.transform='rotate('+SP.p*3.6+'deg)';
 $('#spPct').textContent=Math.round(SP.p)+'%';let m=SPM[0][1];for(const[k,v]of SPM)if(SP.p>=k)m=v;$('#spMsg').textContent=m;
 if(SP.p>=100){setTimeout(()=>{$('#splash').classList.add('out');setTimeout(()=>$('#splash').remove(),900)},380);return}
 requestAnimationFrame(spFrame)}
requestAnimationFrame(spFrame);

/* ---------- ecran de start (wizard) ---------- */
const F=['name','user','code'];
F.forEach(k=>{const e=$('#'+k);e.value=LS['dn_'+k]||'';
 e.oninput=()=>{if(k=='user')e.value=e.value.toLowerCase().replace(/[^a-z0-9_]/g,'');if(k=='code')e.value=e.value.toUpperCase().replace(/[^A-Z]/g,'');LS['dn_'+k]=e.value;err('')};
 e.onkeydown=ev=>{if(ev.key=='Enter')$('#next').click()}});
const qc=new URLSearchParams(location.search).get('c');if(qc){$('#code').value=qc.toUpperCase().slice(0,4);LS.dn_code=$('#code').value}
const hasProfile=()=>(LS.dn_name||'').trim().length>1&&(LS.dn_user||'').length>2;
function go(n){step=n;$$('.step').forEach(s=>s.classList.toggle('on',+s.dataset.s==n));$$('.dots i').forEach((d,i)=>d.classList.toggle('on',i<=n));
 const sv=hasProfile();$('#whon').textContent=($('#name').value||'').trim();$('#who').hidden=!(n==2&&sv);$('#back').hidden=!(n&&!(n==2&&sv));$('.btns').classList.toggle('stack',n==2);$('#next').textContent=n==2?'Intră în cameră':'Continuă';$('#create').hidden=n!=2;err('')}
$('#back').onclick=()=>go(step-1);
$('#next').onclick=()=>{
 if(step==0){if($('#name').value.trim().length<2)return err('Scrie numele și prenumele.');go(1);$('#user').focus()}
 else if(step==1){if($('#user').value.length<3)return err('Username-ul are minim 3 caractere.');go(2);$('#code').focus()}
 else{if($('#code').value.length!=4)return err('Codul are 4 litere.');join(false)}};
$('#create').onclick=()=>join(true);
async function join(create){
 if(joining)return;joining=true;setTimeout(()=>joining=false,2500);
 const name=$('#name').value.trim(),user=$('#user').value;let code=$('#code').value;
 ld(create?'Creez camera':'Intru în cameră',create?'Se creează o cameră nouă…':'Se contactează serverul…');
 try{if(create){const r=await fetch(API+'/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:user,tok:TOK})});
  if(!r.ok){let d='Nu am putut crea camera.';try{d=(await r.json()).detail||d}catch(e){}joining=false;ldOff();return err(d)}
  code=(await r.json()).code}}
 catch(e){joining=false;ldOff();if(!navigator.onLine)showOffline();return err('Nu mă pot conecta la server.')}
 I={name,user,code};LS.dn_code=code;noRe=false;gone=0;ld('Camera '+code,'Se stabilește conexiunea…');
 try{actx=actx||new AudioContext()}catch(e){}
 connect();gps();wake();
}

/* ---------- hartă: OpenStreetMap, gri dark ---------- */
const SRC=[
 {u:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',o:{maxNativeZoom:19,className:'dn-gray',attribution:'&copy; OpenStreetMap contributors'}},
 {u:'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',o:{subdomains:'abc',maxNativeZoom:20,className:'dn-gray',attribution:'&copy; OpenStreetMap contributors'}}];
function mkTiles(){
 if(tl)map.removeLayer(tl);const s=SRC[tsrc];
 tl=L.tileLayer(s.u,Object.assign({maxZoom:20,minZoom:2,keepBuffer:2},s.o)).addTo(map);
 tl.on('tileload',()=>{terr=0;mapReady=true});
 tl.on('tileerror',()=>{if(++terr>=6&&tsrc<SRC.length-1){tsrc++;terr=0;mkTiles()}})}
function initMap(){
 map=L.map('map',{zoomControl:false,attributionControl:false,zoomSnap:.5,minZoom:2,worldCopyJump:true,preferCanvas:true}).setView([47.0105,28.8638],13);
 mkTiles();
 window.addEventListener('resize',()=>map.invalidateSize());
 L.control.attribution({position:'bottomleft',prefix:false}).addTo(map);
 setTimeout(()=>map.invalidateSize(),300);
}
function setPos(la,ln,acc){pos={lat:la,lng:ln};posAcc=acc;
 if(!map){}else if(!lay.me){lay.me=L.marker([la,ln],{icon:L.divIcon({className:'',html:'<div class="'+meCls()+'"></div>',iconSize:[22,22]}),zIndexOffset:1000}).addTo(map);map.setView([la,ln],17);
  lay.acc=L.circle([la,ln],{radius:acc||20,stroke:false,fillColor:'#0a84ff',fillOpacity:.12,interactive:false}).addTo(map)}
 else{lay.me.setLatLng([la,ln]);lay.acc.setLatLng([la,ln]);lay.acc.setRadius(Math.min(acc||20,150))}
 if(Date.now()-lastSend>2000){lastSend=Date.now();send({type:'pos',lat:la,lng:ln})}
 nativeStart()}
function gps(){
 if(gpsOn)return;gpsOn=true;
 navigator.geolocation.watchPosition(p=>setPos(p.coords.latitude,p.coords.longitude,p.coords.accuracy),
  e=>feed(e.code==1?'Locația este blocată. Permite accesul la locație din setări.':'Nu pot obține locația. Ieși în aer liber.'),{enableHighAccuracy:true,maximumAge:1000,timeout:30000});
}
function pinCls(p){
 if(isLost(p))return'pin dead';
 if(p.role=='seeker')return'pin seeker';
 return'pin '+(M&&M.role=='seeker'&&!isLost(M)&&S.phase=='playing'?'ghost':'hider')}
function mapUpdate(){
 if(!map)return;
 if(lay.me&&M){const c=meCls();if(lay.me._c!==c){lay.me._c=c;lay.me.setIcon(L.divIcon({className:'',html:'<div class="'+c+'"></div>',iconSize:[22,22]}));lay.acc.setStyle({fillColor:ROLEC[c.split(' ')[1]]||'#0a84ff'})}}
 const ids=new Set(S.players.map(p=>p.u)),sos=S.phase=='sos'?S.sos:null;
 for(const k in lay.p)if(!ids.has(k)){map.removeLayer(lay.p[k]);delete lay.p[k]}
 for(const k in lay.ring)if(!ids.has(k)){map.removeLayer(lay.ring[k]);delete lay.ring[k]}
 for(const p of S.players){const k=p.u;
  if(k==I.user||p.lat==null){if(lay.p[k]){map.removeLayer(lay.p[k]);delete lay.p[k]}if(lay.ring[k]){map.removeLayer(lay.ring[k]);delete lay.ring[k]}continue}
  const cls=pinCls(p),ic=L.divIcon({className:'',html:`<div class="${cls}"></div>`,iconSize:[22,22]});
  if(!lay.p[k])lay.p[k]=L.marker([p.lat,p.lng],{icon:ic}).bindTooltip('',{permanent:true,direction:'top',offset:[0,-12],className:'tip'}).addTo(map);
  else lay.p[k].setLatLng([p.lat,p.lng]);
  if(lay.p[k]._c!=cls){lay.p[k]._c=cls;lay.p[k].setIcon(ic)}lay.p[k]._p=p;
  // hiderii văzuți de Seekeri: cerc „zonă posibilă” care crește cu vechimea locației
  if(p.pt&&cls=='pin ghost'){if(!lay.ring[k])lay.ring[k]=L.circle([p.lat,p.lng],{radius:20,color:'#ff3b30',weight:1.5,dashArray:'5 6',fillColor:'#ff3b30',fillOpacity:.08,interactive:false}).addTo(map);else lay.ring[k].setLatLng([p.lat,p.lng])}
  else if(lay.ring[k]){map.removeLayer(lay.ring[k]);delete lay.ring[k]}}
 const pid=new Set(S.photos.map(x=>x.id)),cid=new Set(S.caps.map(x=>x.id)),capN=new Set(S.caps.map(x=>x.n)),xs=new Set();
 for(const p of S.players)if(isLost(p)&&p.lat!=null&&!capN.has(p.n))xs.add('x:'+p.u);
 for(const k in lay.ph)if(!pid.has(k)){map.removeLayer(lay.ph[k]);delete lay.ph[k]}
 for(const k in lay.cp)if(!cid.has(k)&&!xs.has(k)){map.removeLayer(lay.cp[k]);delete lay.cp[k]}
 for(const ph of S.photos)if(!lay.ph[ph.id])lay.ph[ph.id]=L.marker([ph.lat,ph.lng],{icon:L.divIcon({className:'',html:'<div class="pulse"></div>',iconSize:[22,22]})}).addTo(map).on('click',()=>openPhoto(ph));
 // checkpoint „X” la fiecare loc unde a fost prins un jucător
 for(const c of S.caps)if(!lay.cp[c.id])lay.cp[c.id]=L.marker([c.lat,c.lng],{icon:xIcon(),zIndexOffset:500}).bindTooltip(esc(c.n)+' · prins',{className:'tip',direction:'top',offset:[0,-14]}).addTo(map).on('click',()=>openPhoto(c));
 // jucător pierdut fără poză de captură: X la ultima lui poziție (fixat la prima vedere)
 for(const p of S.players)if(isLost(p)&&p.lat!=null&&!capN.has(p.n)&&!lay.cp['x:'+p.u])lay.cp['x:'+p.u]=L.marker([p.lat,p.lng],{icon:xIcon(),zIndexOffset:500,interactive:true}).bindTooltip(esc(p.n)+' · pierdut',{className:'tip',direction:'top',offset:[0,-14]}).addTo(map);
 sosLayers(sos)}

/* ---------- SOS: marker, direcții, rută ---------- */
function sosLayers(s){
 if(!s||s.lat==null){clearSos();return}
 const ll=[s.lat,s.lng];
 if(!lay.sosPin)lay.sosPin=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="sosm">SOS</div>',iconSize:[30,30]}),zIndexOffset:2000}).bindTooltip('',{permanent:true,direction:'top',offset:[0,-16],className:'tip red'}).addTo(map);
 else lay.sosPin.setLatLng(ll);
 lay.sosPin.setTooltipContent(esc(s.n));
 const mine=s.u==I.user,seen=new Set();
 // direcție de la fiecare jucător către persoana în pericol
 for(const p of S.players){if(p.u==s.u||p.u==I.user||p.lat==null)continue;seen.add(p.u);
  const pts=[[p.lat,p.lng],ll];
  if(!lay.sosLines[p.u])lay.sosLines[p.u]=L.polyline(pts,{color:'#fff',weight:2,opacity:.5,dashArray:'4 8',interactive:false}).addTo(map);else lay.sosLines[p.u].setLatLngs(pts)}
 for(const k in lay.sosLines)if(!seen.has(k)){map.removeLayer(lay.sosLines[k]);delete lay.sosLines[k]}
 // traseul meu
 if(mine||!pos){if(lay.route){map.removeLayer(lay.route);lay.route=null}if(lay.line){map.removeLayer(lay.line);lay.line=null}return}
 if(route&&route.pts.length>1){
  if(lay.line){map.removeLayer(lay.line);lay.line=null}
  if(!lay.route)lay.route=L.polyline(route.pts,{color:'#ff3b30',weight:6,opacity:.9,lineCap:'round',interactive:false}).addTo(map);else lay.route.setLatLngs(route.pts)}
 else{
  if(lay.route){map.removeLayer(lay.route);lay.route=null}
  const pts=[[pos.lat,pos.lng],ll];
  if(!lay.line)lay.line=L.polyline(pts,{color:'#ff3b30',weight:5,opacity:.9,dashArray:'2 10',lineCap:'round',interactive:false}).addTo(map);else lay.line.setLatLngs(pts)}
 fetchRoute(s)}
function clearSos(){
 if(!map)return;
 if(lay.sosPin){map.removeLayer(lay.sosPin);lay.sosPin=null}
 for(const k in lay.sosLines){map.removeLayer(lay.sosLines[k]);delete lay.sosLines[k]}
 if(lay.route){map.removeLayer(lay.route);lay.route=null}if(lay.line){map.removeLayer(lay.line);lay.line=null}
 route=routeFrom=routeTo=null}
async function fetchRoute(s){
 if(!pos||s.lat==null||s.u==I.user)return;const t=Date.now();
 if(t-routeAt<15000)return;
 if(route&&routeFrom&&routeTo&&hav(routeFrom.lat,routeFrom.lng,pos.lat,pos.lng)<30&&hav(routeTo.lat,routeTo.lng,s.lat,s.lng)<30)return;
 routeAt=t;routeFrom={lat:pos.lat,lng:pos.lng};routeTo={lat:s.lat,lng:s.lng};
 try{const c=new AbortController();setTimeout(()=>c.abort(),8000);
  const r=await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${pos.lng},${pos.lat};${s.lng},${s.lat}?overview=full&geometries=geojson`,{signal:c.signal}),j=await r.json(),rt=j.routes&&j.routes[0];
  if(!rt)throw 0;route={pts:rt.geometry.coordinates.map(c=>[c[1],c[0]]),d:rt.distance,t:rt.duration}}
 catch(e){route=null}
 if(S&&S.phase=='sos')sosLayers(S.sos)}
function fitAll(){
 if(!map)return;
 const pts=[];if(pos)pts.push([pos.lat,pos.lng]);for(const k in lay.p)pts.push(lay.p[k].getLatLng());
 if(S&&S.sos&&S.sos.lat!=null)pts.push([S.sos.lat,S.sos.lng]);
 if(pts.length>1)map.fitBounds(L.latLngBounds(pts),{paddingTopLeft:[44,170],paddingBottomRight:[44,S&&S.phase=='sos'?330:180],maxZoom:17});
 else if(pts.length)map.setView(pts[0],17)}

/* ---------- conexiune ---------- */
function connect(){
 if(ws&&ws.readyState<2)return;
 ws=new WebSocket((API?API.replace(/^http/,'ws'):(location.protocol=='https:'?'wss':'ws')+'://'+location.host)+`/ws/${I.code}/${I.user}?t=${TOK}`);
 ws.onopen=()=>{fails=0;hideOffline();if(!$('#boot').hidden)st_('#bmsg','Se sincronizează jucătorii…');send({type:'join',name:I.name});if(pos)send({type:'pos',lat:pos.lat,lng:pos.lng})};
 ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.type=='state')onState(m);
  else if(m.type=='event'){
   if(m.kind=='lost'){pop('Te-a tras șnuru','Ești spectator (albastru): urmărești jocul, poți posta indicii foto și poți da SOS.');vib([300,120,300,120,600]);beep()}
   else if(m.kind=='caught'){pop(m.text,m.sub);vib([200,100,400]);beep()}
   else if(m.kind=='win')vib([300,100,300]);
   else if(m.kind=='go'){feed(m.text);vib([200,80,200])}
   else if(m.kind=='ping'){feed(M&&M.role=='hider'?'Ești vizibil pentru Seekeri chiar acum!':'Locațiile Hiderilor s-au reîmprospătat');vib(M&&M.role=='hider'?[150,80,150]:80)}
   else if(m.kind!='sos')feed(m.text)}
  else if(m.type=='error')bail(m.text)};
 ws.onclose=()=>{if(noRe||!I)return;fails++;if(fails>=3||!navigator.onLine)showOffline();setTimeout(connect,2000)};
}
function bail(t){noRe=true;try{ws.close()}catch(e){}I=null;lsig='';psig=csig='';gone=0;delete LS.dn_active;nativeStop();siren(false);ldOff();clearSosUI();$('#sosconf').hidden=$('#sheet').hidden=$('#pop').hidden=true;show('intro');go(2);err(t||'')}
function show(v){if(v==lastView)return;lastView=v;
 ['intro','lobby','over'].forEach(x=>$('#'+x).hidden=x!=v);$('#game').hidden=v!='game';
 $('#map').classList.toggle('idle',v!='game');$('#shade').hidden=v=='game';if(v=='game'&&map)setTimeout(()=>map.invalidateSize(),50)}
function onState(m){
 if(!I)return;
 const mp=m.players.find(p=>p.u==I.user);
 if(m.phase!='over'&&(!mp||mp.left)){if(++gone>=2||(mp&&mp.left))return bail('Ai ieșit din joc');return}else gone=0;
 S=m;M=m.me;off=m.now*1000-Date.now();
 ldOff();LS.dn_active=I.code;
 const vis=!document.hidden;
 if(m.phase=='lobby'){clearSosUI();lobby();if(vis)mapUpdate()}
 else if(m.phase=='over'){clearSosUI();show('over');over();if(vis)mapUpdate()}
 else{show('game');game();if(vis)mapUpdate()}
}
function clearSosUI(){if(sosPhoto&&Date.now()-sosPhotoT>8000){sosPhoto=false;clearTimeout(sosPhotoW);$('#cam').hidden=true;stopCam()}
if(sosSeen){sosSeen='';siren(false);$('#sosov').hidden=true;$('#sospanel').hidden=true;panelOpen=true;clearSos()}}

/* ---------- lobby ---------- */
const OPT={hide:[[60,'1 min'],[120,'2 min'],[180,'3 min'],[300,'5 min'],[600,'10 min']],dur:[[1800,'30 min'],[2700,'45 min'],[3600,'1 oră'],[7200,'2 ore'],[0,'Nelimitat']]};
function lobby(){
 show('lobby');st_('#lcode',S.code);st_('#llive',S.live+' live');st_('#lcount','· '+S.players.length+' în cameră');
 const host=S.host==I.user,ps=JSON.stringify([S.players.map(p=>[p.u,p.n,p.gps,p.live]),S.host]),cs=JSON.stringify([S.cfg,host]);
 if(ps!=psig){psig=ps;
  $('#plist').innerHTML=S.players.map(p=>`<div class="pc"><div class="av ${p.live?'on':''}">${esc(p.n.trim()[0]||'?').toUpperCase()}</div><div><b>${esc(p.n)}</b><small>@${esc(p.u)}</small></div>${p.u==S.host?'<span class="tag">Admin</span>':''}<span class="gps ${p.gps?'on':''}"><i></i>GPS</span></div>`).join('')}
 if(cs!=csig){csig=cs;
  for(const k of['hide','dur']){const el=$('#c-'+k);
   if(!el.children.length)for(const[v,l]of OPT[k]){const b=document.createElement('button');b.textContent=l;b.dataset.v=v;b.onclick=()=>send({type:'settings',[k]:+v});el.append(b)}
   for(const b of el.children){b.className='chip'+(S.cfg[k]==b.dataset.v?' on':'');b.disabled=!host}}}
 const ok=S.players.length>=2&&S.players.every(p=>p.gps);
 $('#go').hidden=!host;$('#go').disabled=!ok;
 st_('#lnote',host?(S.players.length<2?'Ai nevoie de minim 2 jucători.':!ok?'Așteptăm locația tuturor jucătorilor.':'Rolurile se aleg aleatoriu la start.'):'Setările le alege gazda. Așteptăm startul.');
}
$('#go').onclick=()=>send({type:'start'});
$('#lcopy').onclick=()=>{copyTxt(roomLink(S.code),()=>feed('Link copiat'))};

/* ---------- joc ---------- */
function game(){
 const sos=S.phase=='sos',role=M&&M.role,st=M&&M.st,lo=!!M&&isLost(M);
 $('#hrole').textContent=sos?'SOS':lo?'Spectator':role=='seeker'?'Seeker':'Hider';$('#hrole').className=sos?'sosr':lo?'lost':role=='seeker'?'seek':'hid';
 $('#hlive').textContent=S.live;$('#hh').textContent='Hideri '+S.nh;$('#hs').textContent='Seekeri '+S.ns;$('#hsp').hidden=!S.nsp;$('#hsp').textContent='Spectatori '+(S.nsp||0);
 $('#bcam').hidden=sos||!(role=='hider');
 $('#caught').hidden=sos||!(M&&M.near&&st=='alive');
 const near=!sos&&!!(M&&M.near&&st=='alive');$('#alert').hidden=!near;
 if(near&&!alerted){alerted=true;vib([300,100,300,100,600]);beep()}if(!near)alerted=false;
 if(sos){sosView();return}
 const key=S.rid+':'+S.round; 
 if(role&&LS.dn_rv!=key){LS.dn_rv=key;reveal(role);setTimeout(fitAll,400)}
}
setInterval(()=>{if(document.hidden||!S||!M||S.phase=='lobby'||S.phase=='over')return;const t=now(),h=M.role=='hider',lo=isLost(M),bar=$('#pbar i');let pb=0;
 if(S.phase=='sos'&&S.sos){st_('#hlab','SOS activ de');st_('#hbig',fmt(t-S.sos.t));st_('#hsub',S.sos.u==I.user?'Ai cerut ajutor':S.sos.n+' are nevoie de ajutor');st_('#hplab','');st_('#hping','');sosPanel()}
 else if(S.phase=='hiding'){const r=S.hide_end-t;st_('#hlab',h?'Ascunde-te':'Ascundere');st_('#hbig',fmt(r));st_('#hsub',h?'Seekerii pornesc după cronometru':'Hiderii se ascund');st_('#hplab','');st_('#hping','');
  pb=Math.max(0,Math.min(100,(1-r/Math.max(1,S.cfg.hide))*100))}
 else{
  if(S.end_at){st_('#hlab','Până la final');st_('#hbig',fmt(S.end_at-t));st_('#hsub',lo?'Ai pierdut · urmărești jocul':h?'Rămâi ascuns până expiră timpul':'Găsește toți Hiderii înainte de final')}
  else{st_('#hlab','Joc nelimitat');st_('#hbig','∞');st_('#hsub',lo?'Ai pierdut · urmărești jocul':h?'Nu te lăsa prins':'Găsește toți Hiderii')}
  st_('#hplab',h?'Ești vizibil în':'Ping hideri');st_('#hping',fmt(S.ping_at-t));
  pb=Math.max(0,Math.min(100,(1-(S.ping_at-t)/180)*100))}
 const w=Math.round(pb)+'%';if(bar.style.width!==w)bar.style.width=w;
 const msg=[];
 if(S.phase!='sos'){
  if(M.st=='caught')msg.push('Te-a tras șnuru · Ești spectator: poți posta indicii și da SOS');
  else if(h&&M.out)msg.push('Peste 1 km de Seeker. Revino în '+fmt(S.grace-(t-M.out)))}
 const wr=$('#warn');wr.hidden=!msg.length;st_('#warn',msg.join(' · '));
 for(const k in lay.p){const p=lay.p[k]._p;if(!p)continue;const tx=esc(p.n)+(p.pt?' · '+ago(t-p.pt):'');if(lay.p[k]._t!==tx){lay.p[k]._t=tx;lay.p[k].setTooltipContent(tx)}
  if(p.pt&&lay.ring[k])lay.ring[k].setRadius(Math.min(450,Math.max(20,(t-p.pt)*1.5)))}
},500);
function over(){
 const W={time:'Timpul s-a scurs — doar Hiderii câștigă când cronometrul expiră.',all_caught:'Toți Hiderii au fost prinși.',seekers_left:'Toți Seekerii au părăsit jocul.'};
 $('#owin').textContent=S.winner=='seekers'?'Seekerii au câștigat':'Hiderii au câștigat';$('#owhy').textContent=W[S.why]||'';
 $('#olist').innerHTML=S.players.map(p=>`<div class="sr ${isLost(p)?'dead':''}"><div class="av ${p.live?'on':''}">${esc(p.n.trim()[0]||'?').toUpperCase()}</div><div><b>${esc(p.n)}</b><small>${rl(p)} · ${p.left?'a ieșit':p.st=='alive'?'a rămas în joc':'prins'}</small></div></div>`).join('');
 const host=S.host==I.user;$('#oback').textContent=host?'Înapoi în cameră':'Așteptăm gazda…';$('#oback').disabled=!host;
}
$('#oback').onclick=()=>send({type:'reset'});
$('#bfit').onclick=fitAll;
$('#bloc').onclick=()=>pos&&map&&map.setView([pos.lat,pos.lng],17);
$('#bplayers').onclick=()=>{$('#shlive').innerHTML='<i class="livedot"></i>'+S.live+' live';
 $('#slist').innerHTML=S.players.map(p=>`<div class="sr ${isLost(p)?'dead':''}"><div class="av ${p.live?'on':''}">${esc(p.n.trim()[0]||'?').toUpperCase()}</div><div><b><i class="rd ${rc(p)}"></i>${esc(p.n)}</b><small>@${esc(p.u)}${S.phase=='sos'?'':' · '+rl(p)}</small></div><span class="tag">${p.left?'Ieșit':p.live?'Live':'Offline'}</span></div>`).join('');$('#sstop').hidden=S.host!=I.user;$('#sheet').hidden=false};
$('#sstop').onclick=()=>cfm('Închizi jocul?','Jocul se oprește pentru toți și revii în cameră.','Închide jocul',()=>{send({type:'reset'});$('#sheet').hidden=true});
$('#hmenu').onclick=$('#hlivebtn').onclick=()=>$('#bplayers').click();
$('#sexit').onclick=$('#lexit').onclick=()=>cfm('Închizi aplicația?','Ieși din joc, iar notificările și GPS-ul din fundal se opresc.','Închide aplicația',exitApp);
if(NATIVE){$('#sexit').hidden=false;$('#lexit').hidden=false}
function exitApp(){noRe=true;send({type:'leave'});siren(false);delete LS.dn_active;LS.dn_code='';setTimeout(()=>{if(Game)Game.exitApp().catch(()=>{});else leave()},200)}
$('#sclose').onclick=()=>$('#sheet').hidden=true;$('#sheet').onclick=e=>{if(e.target.id=='sheet')e.target.hidden=true};

/* ---------- SOS: trimitere, alertă, panou ---------- */
function askSos(){if(!I||!S||S.phase=='over'||S.phase=='sos')return;$('#sosconf').hidden=false}
function sendSos(){if(!I)return;send({type:'sos'});
 fetch(API+`/api/room/${I.code}/sos`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:I.user,tok:TOK})}).catch(()=>{})}
$('#bsos').onclick=()=>{if(S&&S.phase=='sos'){panelOpen=true;sosPanel()}else askSos()};
$('#lsos').onclick=askSos;
$('#sosno').onclick=()=>$('#sosconf').hidden=true;
const hb=$('#sosHold'),harc=$('#hArc');
function holdStart(e){e.preventDefault();if(hold)return;const t0=performance.now();vib(25);
 const f=t=>{const k=Math.min(1,(t-t0)/2000);harc.style.strokeDashoffset=339.3*(1-k);if(k>=1){hold=null;holdDone();return}hold=requestAnimationFrame(f)};hold=requestAnimationFrame(f)}
function holdEnd(){if(hold){cancelAnimationFrame(hold);hold=null}harc.style.strokeDashoffset=339.3}
function holdDone(){holdEnd();$('#sosconf').hidden=true;vib([200,100,400]);
 // întâi pornim fluxul foto (ca alerta proprie să nu acopere camera), apoi trimitem SOS-ul imediat – poza nu întârzie alerta
 sosPhoto=true;sosPhotoT=Date.now();sendSos();feed('SOS trimis…');
 openCam('SOS · fă o poză unde ești',async b=>upload('photo',await stampSos(b),{sos:1}))}
function endSosPhoto(){if(!sosPhoto)return;sosPhoto=false;clearTimeout(sosPhotoW);if(I&&S&&S.phase=='sos')sosView()}
hb.addEventListener('pointerdown',holdStart);['pointerup','pointercancel','pointerleave'].forEach(ev=>hb.addEventListener(ev,holdEnd));hb.oncontextmenu=e=>e.preventDefault();
function siren(on){
 clearInterval(sirenT);sirenT=null;try{sirenO&&sirenO.stop()}catch(e){}sirenO=null;
 if(!on){vib(0);return}
 try{actx=actx||new AudioContext();actx.resume&&actx.resume();const o=actx.createOscillator(),g=actx.createGain();o.type='sawtooth';o.frequency.value=650;g.gain.value=.22;o.connect(g);g.connect(actx.destination);o.start();sirenO=o;
  let k=0;sirenT=setInterval(()=>{k++;try{o.frequency.setValueAtTime(k%2?650:950,actx.currentTime)}catch(e){}vib([400,150,400]);if(Date.now()>sirenStop)siren(false)},450)}catch(e){}}
function sosView(){
 const s=S.sos;if(!s)return;const key=s.u+':'+s.t,mine=s.u==I.user;
 if(mine&&sosPhoto&&sosSeen!=key){$('#sosconf').hidden=true;$('#sheet').hidden=true;sosPanel();return}   // în timp ce faci poza, nu acoperim camera
 if(sosSeen!=key){sosSeen=key;panelOpen=true;route=routeFrom=routeTo=null;routeAt=0;
  if(!mine&&sosPhoto){sosPhoto=false;clearTimeout(sosPhotoW)}
  $('#sosconf').hidden=true;$('#sheet').hidden=true;$('#cam').hidden=true;stopCam();
  $('#sotitle').textContent=mine?'SOS trimis':'SOS de la '+s.n;
  $('#sotext').textContent=mine?'Jocul s-a oprit pentru toți. Rămâi pe loc — ceilalți vin spre tine.':'Jocul s-a oprit. Mergeți imediat la '+s.n+'! Locația tuturor este acum vizibilă pe hartă.';
  $('#sogo').textContent=mine?'Am înțeles':'Arată-mi drumul';
  $('#sosov').hidden=false;sirenStop=Date.now()+(mine?4000:14000);siren(true)}
 sosPanel()}
$('#sogo').onclick=()=>{$('#sosov').hidden=true;siren(false);panelOpen=true;sosPanel();fitAll()};
$('#spclose').onclick=()=>{panelOpen=false;$('#sospanel').hidden=true};
$('#spend').onclick=()=>cfm('Închizi SOS-ul?','Alerta se oprește și toți revin în cameră.','Închide SOS',()=>send({type:'reset'}));
function sosPanel(){
 const s=S&&S.phase=='sos'?S.sos:null,p=$('#sospanel');
 if(!s||!panelOpen||!$('#sosov').hidden){p.hidden=true;return}
 p.hidden=false;const mine=s.u==I.user;
 const sph=(S.photos||[]).filter(x=>x.n==s.n&&(!x.t||x.t>=s.t-60)).slice(-1)[0];$('#spphoto').hidden=!sph;$('#spphoto').onclick=()=>sph&&openPhoto(sph);
 $('#spname').textContent=mine?'Tu ai cerut ajutor':s.n;
 $('#sptag').textContent=mine?'SOS TRIMIS · AȘTEPȚI AJUTOR':'SOS ACTIV · MERGI LA EL';
 $('#spend').hidden=!(mine||S.host==I.user);$('#spnav').hidden=mine||s.lat==null;
 if(mine){$('#spdist').textContent='Rămâi pe loc';$('#spdir').textContent='';$('#spmeta').textContent=S.live+' jucători live văd locația ta';$('#sparrow').style.transform='none';return}
 if(!pos||s.lat==null){$('#spdist').textContent='—';$('#spdir').textContent='';$('#spmeta').textContent=pos?'Locația lui '+s.n+' nu este disponibilă':'Aștept locația ta GPS…';return}
 const d=hav(pos.lat,pos.lng,s.lat,s.lng),b=brg(pos.lat,pos.lng,s.lat,s.lng);
 $('#sparrow').style.transform='rotate('+(heading==null?b:b-heading)+'deg)';
 $('#spdir').textContent=DIR[Math.round(b/45)%8];
 $('#spdist').textContent=dist(route?route.d:d);
 $('#spmeta').textContent=route?'~'+Math.max(1,Math.round(route.t/60))+' min pe jos · traseu pe străzi':'~'+Math.max(1,Math.round(d/1.25/60))+' min pe jos · linie dreaptă ('+dist(d)+')'}
$('#spnav').onclick=()=>{const s=S&&S.sos;if(s&&s.lat!=null)openUrl(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`)};

/* ---------- mesaje ---------- */
function feed(t){const f=document.createElement('div');f.className='fi';f.textContent=t;$('#feed').append(f);while($('#feed').children.length>3)$('#feed').firstChild.remove();setTimeout(()=>f.remove(),5000)}
function pop(t,s){popCb=null;$('#pno').hidden=true;$('#pok').textContent='OK';$('#pt').textContent=t;$('#ps').textContent=s||'';$('#pop').hidden=false}
function cfm(t,s,ok,cb){popCb=cb;$('#pno').hidden=false;$('#pok').textContent=ok;$('#pt').textContent=t;$('#ps').textContent=s||'';$('#pop').hidden=false}
$('#pok').onclick=()=>{$('#pop').hidden=true;const c=popCb;popCb=null;if(c)c()};
$('#pno').onclick=()=>{$('#pop').hidden=true;popCb=null};
function reveal(role){const r=$('#reveal');r.hidden=false;$('#rv1').hidden=false;$('#rv2').hidden=true;
 const RT={seeker:['SEEKER','Găsește-i pe Hiders înainte să expire timpul.'],hider:['HIDER','Ascunde-te și nu te lăsa prins până expiră timpul.']},q=RT[role]||RT.hider;
 $('#rrole').textContent=q[0];$('#rrole').className=role;$('#rsub').textContent=q[1];
 
 setTimeout(()=>{$('#rv1').hidden=true;$('#rv2').hidden=false;vib([120,60,250])},1900);
 setTimeout(()=>r.hidden=true,6200);r.onclick=()=>{if(!$('#rv2').hidden)r.hidden=true}}

/* ---------- cameră (obiectiv principal „wide”, nu ultra-wide) ---------- */
const camNo=d=>{const m=/camera\d*\s+(\d+)/i.exec(d.label||'');return m?+m[1]:99};   // „camera2 0, facing back” → 0
/* Alege obiectivul principal: iOS „Back Camera”; Android: cel mai mic id dintre camerele spate, fără ultra-wide/macro/tele/depth. */
async function pickBack(){
 try{const ds=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'&&d.deviceId);
  if(ds.length<2||!ds.some(d=>d.label))return null;
  const lab=d=>(d.label||'').toLowerCase();
  const back=ds.filter(d=>/back|rear|environment|world|spate/.test(lab(d))&&!/front|user|selfie|face/.test(lab(d)));
  if(!back.length)return null;
  let best=back.find(d=>/^back camera$/.test(lab(d)));
  if(!best){const good=back.filter(d=>!/ultra|wide.?angle|ultrawide|0\.5|macro|depth|tele|zoom|infrared|\bir\b|mono/.test(lab(d)));
   best=(good.length?good:back).slice().sort((x,y)=>camNo(x)-camNo(y))[0]}
  return best?best.deviceId:null}catch(e){return null}}
const ULTRA=/ultra|0\.5|wide.?angle|macro|depth|tele|zoom|infrared|\bir\b|mono/i;
async function getStream(){
 const md=navigator.mediaDevices;if(!md||!md.getUserMedia)throw new Error('no-cam');
 const base={width:{ideal:2048},height:{ideal:1536},aspectRatio:{ideal:4/3}};
 let s=null,last=null;
 // „environment” = camera principală (standard, wide), cadru 4:3 ca în aplicația foto a telefonului
 for(const v of[Object.assign({facingMode:{exact:'environment'}},base),Object.assign({facingMode:{ideal:'environment'}},base),{facingMode:'environment'},true]){
  try{s=await md.getUserMedia({video:v,audio:false});break}catch(e){last=e;if(e&&(e.name=='NotAllowedError'||e.name=='SecurityError'))break}}
 if(!s)throw last||new Error('no-cam');
 // doar dacă sistemul a ales totuși ultra-wide/macro/tele/frontală, trecem pe obiectivul principal
 const tr=s.getVideoTracks()[0],lab=(tr&&tr.label)||'';
 if(ULTRA.test(lab)||/front|user|selfie/i.test(lab)){const id=await pickBack(),cid=(tr.getSettings&&tr.getSettings().deviceId)||'';
  if(id&&id!==cid){try{const s2=await md.getUserMedia({video:Object.assign({deviceId:{exact:id}},base),audio:false});s.getTracks().forEach(x=>x.stop());s=s2}catch(e){}}}
 try{const x=s.getVideoTracks()[0],c=x.getCapabilities&&x.getCapabilities();
  if(c&&c.zoom&&c.zoom.min<1&&c.zoom.max>=1)x.applyConstraints({advanced:[{zoom:1}]}).catch(()=>{})}catch(e){}
 return s}
function stopCam(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null}try{$('#cvid').srcObject=null}catch(e){}}
function camUI(prev){$('#cvid').hidden=prev;$('#cprev').hidden=!prev;$('#cshoot').hidden=prev;$('#cretake').hidden=$('#csend').hidden=!prev}
function closeCam(){stopCam();$('#cam').hidden=true;if(sosPhoto)endSosPhoto()}
async function openCam(title,cb){camCb=cb;camBlob=null;$('#ctitle').textContent=title;
 try{camStream=await getStream();
  const v=$('#cvid');v.srcObject=camStream;v.muted=true;v.setAttribute('playsinline','');camUI(false);$('#cam').hidden=false;
  try{await v.play()}catch(e){}}
 catch(e){stopCam();
  if(e&&e.name=='NotAllowedError')feed('Accesul la cameră e blocat în setări — folosesc camera telefonului.');
  // rezervă pentru orice dispozitiv: camera sistemului (obiectiv principal)
  const f=$('#ffile');f.onchange=async ev=>{const x=ev.target.files[0];ev.target.value='';if(x){try{cb(await shrink(x))}catch(er){feed('Poza nu a putut fi procesată')}}else if(sosPhoto)endSosPhoto()};
  f.oncancel=()=>{if(sosPhoto)endSosPhoto()};
  if(sosPhoto){clearTimeout(sosPhotoW);sosPhotoW=setTimeout(()=>{if(sosPhoto&&$('#cam').hidden)endSosPhoto()},60000)}
  f.click()}}
function shrink(f,max=1280){return new Promise((r,j)=>{const i=new Image();i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(b=>b?r(b):j(),'image/jpeg',.82)};i.onerror=j;i.src=URL.createObjectURL(f)})}
$('#cshoot').onclick=()=>{const v=$('#cvid');if(!v.videoWidth){feed('Camera nu e încă gata, mai așteaptă o secundă.');return}
 const k=Math.min(1,1280/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement('canvas');c.width=v.videoWidth*k;c.height=v.videoHeight*k;c.getContext('2d').drawImage(v,0,0,c.width,c.height);
 c.toBlob(b=>{if(!b){feed('Poza nu a reușit, încearcă din nou.');return}camBlob=b;$('#cprev').src=URL.createObjectURL(b);camUI(true)},'image/jpeg',.85);vib(40)};
$('#cretake').onclick=()=>camUI(false);
$('#cx').onclick=closeCam;
$('#csend').onclick=()=>{const b=camBlob,f=camCb;stopCam();$('#cam').hidden=true;if(f)f(b);if(sosPhoto)endSosPhoto()};
async function upload(kind,blob,extra){
 if(!pos)return feed('Aștept locația GPS…');
 const fd=new FormData();fd.append('file',blob,'p.jpg');fd.append('user',I.user);fd.append('tok',TOK);fd.append('lat',pos.lat);fd.append('lng',pos.lng);
 if(extra&&extra.sos)fd.append('sos','1');
 const fail=d=>{if(extra&&extra.sos)feed('Poza SOS nu a putut fi trimisă: '+d);else pop('Nu s-a putut trimite',d)};
 try{const r=await fetch(API+`/api/room/${I.code}/${kind}`,{method:'POST',body:fd});
  if(!r.ok){let d='Trimiterea a eșuat';try{d=(await r.json()).detail||d}catch(e){}fail(d)}
  else if(extra&&extra.sos)feed('Poza SOS a fost trimisă')}
 catch(e){fail('Verifică conexiunea la internet și încearcă din nou.')}}
$('#bcam').onclick=()=>openCam('Indiciu foto',b=>upload('photo',b));
$('#caught').onclick=()=>openCam('Fă o poză unde ai fost prins',b=>upload('capture',b));

/* ---------- vizualizare + descărcare foto ---------- */
function openPhoto(ph){cur=ph;$('#mimg').src=API+ph.url;$('#mname').textContent=ph.n;
 $('#mcap').textContent=`${ph.lat.toFixed(5)}, ${ph.lng.toFixed(5)}${ph.t?' · '+new Date(ph.t*1000).toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'}):''}`;$('#photo').hidden=false}
$('#mclose').onclick=()=>$('#photo').hidden=true;
const loadImg=u=>new Promise((r,j)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>j(new Error('img'));i.src=u});
const FNT='Inter, Helvetica, Arial, sans-serif';
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
/* „SOS” scris direct pe poză, înainte de trimitere (nu e nevoie de nimic pe server) */
async function stampSos(blob){try{const u=URL.createObjectURL(blob),im=await loadImg(u),c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
 const s=Math.max(16,im.width/28),fs=s*2.6;x.strokeStyle='#ff3b30';x.lineWidth=s*.5;x.strokeRect(s*.25,s*.25,im.width-s*.5,im.height-s*.5);
 x.font=`800 ${fs}px ${FNT}`;const pw=x.measureText('SOS').width+s*2.6,ph=fs*1.5,px=(im.width-pw)/2,py=s*.9;
 x.fillStyle='rgba(255,59,48,.96)';rr(x,px,py,pw,ph,ph/2);x.fill();x.lineWidth=s*.16;x.strokeStyle='#fff';x.stroke();
 x.fillStyle='#fff';x.textBaseline='middle';x.textAlign='center';x.fillText('SOS',im.width/2,py+ph/2+fs*.04);
 URL.revokeObjectURL(u);return await new Promise(r=>c.toBlob(b=>r(b||blob),'image/jpeg',.88))}catch(e){return blob}}
/* pătrat 1:1 din OpenStreetMap, centrat pe locația celui care a postat */
function osmSquare(lat,lng,z=17){return new Promise(res=>{
 const n=2**z,fx=(lng+180)/360*n,la=lat*Math.PI/180,fy=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n,tx=Math.floor(fx),ty=Math.floor(fy),
  c=document.createElement('canvas');c.width=c.height=384;const x=c.getContext('2d');x.fillStyle='#e9e5dc';x.fillRect(0,0,384,384);
 const ox=192-(fx-tx)*256,oy=192-(fy-ty)*256;let ok=0;const jobs=[];
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)jobs.push(new Promise(r=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{x.drawImage(im,ox+dx*256,oy+dy*256);ok++;r()};im.onerror=()=>r();im.src=`https://tile.openstreetmap.org/${z}/${tx+dx}/${ty+dy}.png`}));
 Promise.all(jobs).then(()=>{if(!ok)return res(null);
  x.beginPath();x.arc(192,192,15,0,7);x.fillStyle='rgba(255,59,48,.28)';x.fill();
  x.beginPath();x.arc(192,192,9,0,7);x.fillStyle='#ff3b30';x.fill();x.lineWidth=3.5;x.strokeStyle='#fff';x.stroke();res(c)})})}
function stamp(im,ph,mp,lg){
 const W=im.width,H=im.height,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0);
 const s=Math.max(16,W/28),h=s*4.9,y0=H-h-s*.2;
 const g=x.createLinearGradient(0,H-h*1.5,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.45,'rgba(0,0,0,.72)');g.addColorStop(1,'rgba(0,0,0,.9)');x.fillStyle=g;x.fillRect(0,H-h*1.5,W,h*1.5);
 const hh=(ph.t?new Date(ph.t*1000):new Date()).toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'});
 x.fillStyle='#fff';x.textBaseline='top';x.textAlign='left';
 x.font=`500 ${s*.8}px ${FNT}`;x.fillText(`Locație: ${ph.lat.toFixed(5)}, ${ph.lng.toFixed(5)}`,s,y0+s*.5);
 x.font=`800 ${s*1.45}px ${FNT}`;x.fillText('DE-A ȘNURU',s,y0+s*1.6);
 x.font=`600 ${s*.9}px ${FNT}`;x.fillText(`${ph.n} · ${hh}`,s,y0+s*3.5);
 if(lg){const lh=s*3.8,lw=lh*lg.width/lg.height;x.drawImage(lg,W-s-lw,y0+s*2.45-lh/2,lw,lh)}
 if(mp){const m=W*.27,mx=W-m-s*.7,my=s*.7;x.save();rr(x,mx,my,m,m,s*.7);x.clip();x.drawImage(mp,mx,my,m,m);x.restore();x.lineWidth=s*.14;x.strokeStyle='#fff';rr(x,mx,my,m,m,s*.7);x.stroke()}
 const pl=S&&S.players.find(p=>p.n==ph.n),role=pl&&pl.role,lab=role=='seeker'?'SEEKER':role=='hider'?'HIDER':'';
 if(lab){x.font=`800 ${s*1.05}px ${FNT}`;const pw=x.measureText(lab).width+s*1.8,ph2=s*2;x.fillStyle=role=='seeker'?'#ffd60a':'#ff3b30';rr(x,s*.7,s*.7,pw,ph2,ph2/2);x.fill();
  x.fillStyle=role=='seeker'?'#1a1400':'#fff';x.textBaseline='middle';x.fillText(lab,s*1.6,s*.7+ph2/2+s*.04)}
 return c}
$('#dl').onclick=async()=>{const ph=cur,done=m=>{$('#dl').textContent=m;setTimeout(()=>$('#dl').textContent='Descarcă',2500)};$('#dl').textContent='Se pregătește…';
 let im,lg=null,mp=null;
 try{im=await loadImg(API+ph.url)}catch(e){return done('Nu s-a putut încărca poza')}
 try{lg=await loadImg('logo.png')}catch(e){}
 try{mp=await Promise.race([osmSquare(ph.lat,ph.lng),new Promise(r=>setTimeout(()=>r(null),8000))])}catch(e){}
 let c=stamp(im,ph,mp,lg),b64;
 try{b64=c.toDataURL('image/jpeg',.92)}catch(e){c=stamp(im,ph,null,lg);b64=c.toDataURL('image/jpeg',.92)}
 if(NATIVE&&plug('SaveImage')){plug('SaveImage').save({data:b64.split(',')[1],name:'de-a-snuru-'+Date.now()+'.jpg'}).then(()=>done('Salvat în galerie'),()=>done('Nu s-a putut salva'));return}
 c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='de-a-snuru.jpg';a.click();done('Descărcat')},'image/jpeg',.92)};

function showOffline(){$('#offline').hidden=false}
function hideOffline(){$('#offline').hidden=true}
addEventListener('offline',showOffline);
addEventListener('online',()=>{hideOffline();if(I&&(!ws||ws.readyState>1)){fails=0;connect()}});
$('#retry').onclick=()=>{if(!navigator.onLine)return;hideOffline();if(I){fails=0;connect()}};
function leave(){noRe=true;send({type:'leave'});siren(false);nativeStop();delete LS.dn_active;LS.dn_code='';setTimeout(()=>{try{ws.close()}catch(e){}location.reload()},150)}
$('#lleave').onclick=$('#oleave').onclick=leave;$('#chg').onclick=()=>go(0);$('#bleave').onclick=leave;$('#sleave').onclick=()=>cfm('Ieși din joc?','Vei părăsi runda și revii la ecranul de start.','Ieși',leave);
go(hasProfile()?2:0);try{initMap()}catch(e){map=null;showErr('Harta: '+e.message)}if(!navigator.onLine)showOffline();
if(LS.dn_active&&LS.dn_name&&LS.dn_user){I={name:LS.dn_name.trim(),user:LS.dn_user,code:LS.dn_active};ld('Reconectare','Revin în camera '+I.code+'…');connect();gps();wake()}
checkPending();
