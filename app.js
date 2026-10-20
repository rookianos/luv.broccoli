import {createSvg} from "./engine.js";
const $=s=>document.querySelector(s);
const KEY='vktn-demo-v1';
function store(){try{return JSON.parse(localStorage.getItem(KEY))||{users:{},images:{},events:[]}}catch{return {users:{},images:{},events:[]}}}
function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
function current(d){return d.active?d.users[d.active]||null:null}
function mockError(message){throw new Error(message)}
const api=async(path,opts={})=>{
 const d=store(),u=current(d),payload=opts.body?JSON.parse(opts.body):{};
 if(path==='/api/config')return {images:d.images||{},demoPayments:true,price:.49,packs:[{qty:2,usd:.98},{qty:10,usd:2.99}]};
 if(path==='/api/me')return {user:u};
 if(path==='/api/logout'){d.active=null;save(d);return {ok:true}};
 if(path==='/api/login'){
   const email=String(payload.email||'').toLowerCase().trim();if(!/^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(email))mockError('Please enter a valid email');
   if(!d.users[email])d.users[email]={email,credits:1,freeClaimed:true,paid:false,paidCount:0,referralCode:'REF-'+Math.random().toString(36).slice(2,10).toUpperCase(),referredBy:payload.referral||'',testPromoRedeemed:false};
   d.active=email;d.events.unshift({at:new Date().toISOString(),kind:'demo_login',email});save(d);return {ok:true,demo:true,user:d.users[email]};
 }
 if(path==='/api/preview')return new Response(createSvg(payload,{watermark:true}),{headers:{'content-type':'image/svg+xml'}});
 if(path==='/api/png'){
   const svg=createSvg({...payload,width:600,height:900});const img=new Image();const blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});let c=document.createElement('canvas');c.width=600;c.height=900;c.getContext('2d').drawImage(img,0,0,600,900);URL.revokeObjectURL(url);let png=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!png)mockError('PNG rendering failed');return new Response(png,{headers:{'content-type':'image/png'}});
 }
 if(path==='/api/export'){
   if(!u)mockError('Sign in first');if(u.credits<1)mockError('No export credits');if(payload.format!=='svg')mockError('Invalid vector format');u.credits--;d.events.unshift({at:new Date().toISOString(),kind:'vector_export',email:u.email,format:payload.format});save(d);
   return new Response(createSvg(payload.config||{}),{headers:{'content-type':'image/svg+xml'}});
 }
 if(path==='/api/checkout')return {demo:true,qty:payload.qty,usd:payload.qty===2?.98:2.99};
 if(path==='/api/mock/checkout'){
   if(!u)mockError('Sign in first');const qty=Number(payload.qty);if(![2,10].includes(qty))mockError('Invalid pack');u.credits+=qty;u.paid=true;u.paidCount=(u.paidCount||0)+1;
   if(u.referredBy&&u.paidCount===1){const ref=Object.values(d.users).find(x=>x.referralCode===u.referredBy&&x.email!==u.email);if(ref){ref.credits++;d.events.unshift({at:new Date().toISOString(),kind:'referral_reward',email:ref.email,from:u.email})}}
   const receipt='MOCK-'+Math.random().toString(36).slice(2,10).toUpperCase();d.events.unshift({at:new Date().toISOString(),kind:'test_payment',email:u.email,qty,receipt});save(d);return {ok:true,user:u,receipt};
 }
 if(path==='/api/promo/redeem'){
   if(!u)mockError('Sign in to redeem');if(String(payload.code||'').trim().toUpperCase()!=='VKTN-TEST-UNLIMITED')mockError('Invalid test code');if(u.testPromoRedeemed)mockError('Already redeemed on this demo account');u.testPromoRedeemed=true;u.credits++;d.events.unshift({at:new Date().toISOString(),kind:'demo_promo',email:u.email});save(d);return {message:'Test promo applied: +1 credit',user:u};
 }
 mockError('Unknown demo request: '+path);
};
const post=(url,o)=>api(url,{method:'POST',body:JSON.stringify(o)});
let user=null,settings={},phase=0,playing=true,previewTimer=0,previewBusy=false,previewWait=false,lastRendered=0;
let customFont=null;
let state={text:'VKTN',mode:'grid',font:'Arial Black',width:600,height:900,size:340,grid:90,shift:33,intensity:38,density:24,angle:28,speed:1,seed:420,ink:'#161616',paper:'#f1f0ec'};
const sliderDefs=[['size','SIZE',40,950,1],['grid','GRID',16,220,1],['shift','SHIFT',-130,130,1],['intensity','INTENSITY',0,100,1],['density','DENSITY',5,100,1],['angle','ANGLE',-90,90,1],['speed','SPEED',0,5,.1]];
function locale(){ $('#accountBtn').textContent=user?'SIGN OUT':'SIGN IN'; }
const slot=$('#sliders');for(const [id,label,min,max,step] of sliderDefs){slot.insertAdjacentHTML('beforeend',`<div class="slider-line"><span>${label}</span><b id="v-${id}">${state[id]}</b></div><input type="range" id="r-${id}" min="${min}" max="${max}" step="${step}" value="${state[id]}">`);$(`#r-${id}`).addEventListener('input',e=>{state[id]=Number(e.target.value);$(`#v-${id}`).textContent=state[id];queuePreview()})}
['txt','mode','font','ink','paper'].forEach(id=>$('#'+id).addEventListener('input',e=>{state[id==='txt'?'text':id]=e.target.value;queuePreview()}));
const fontInput=$('#fontFile');
fontInput.addEventListener('change',async()=>{
 const file=fontInput.files?.[0];if(!file)return;
 const status=$('#fontStatus');
 if(!/\.(ttf|otf|woff2?)$/i.test(file.name)){status.textContent='Unsupported format. Use TTF, OTF, WOFF or WOFF2.';fontInput.value='';return}
 if(file.size>8*1024*1024){status.textContent='Font exceeds 8 MB. Please select a smaller file.';fontInput.value='';return}
 const mime=/\.woff2$/i.test(file.name)?'font/woff2':/\.woff$/i.test(file.name)?'font/woff':/\.otf$/i.test(file.name)?'font/otf':'font/ttf';
 try{
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Unable to read file'));reader.readAsDataURL(file)});
  const family='VKTNCustomFont';const face=new FontFace(family,`url(${data})`,{weight:'900'});
  await face.load();document.fonts.add(face);
  customFont={family,data,mime};state.font=family;
  let opt=$('#font').querySelector('option[value="VKTNCustomFont"]');if(!opt){opt=document.createElement('option');opt.value=family;$('#font').appendChild(opt)}
  opt.textContent='UPLOADED · '+file.name.slice(0,48);$('#font').value=family;
  status.textContent='Ready: '+file.name+' · Embedded in SVG (text not outlined).';queuePreview();
 }catch(e){status.textContent='Could not load font: '+e.message; fontInput.value=''}
});
function renderingConfig(){return {...state,phase,customFont:state.font==='VKTNCustomFont'?customFont:null}}
function queuePreview(){if(previewBusy){previewWait=true;return}clearTimeout(previewTimer);previewTimer=setTimeout(updatePreview,180)}
async function updatePreview(){previewBusy=true;try{let r=await post('/api/preview',renderingConfig());let blob=await r.blob(),old=$('#preview img')?.src,url=URL.createObjectURL(blob);$('#preview').innerHTML='';let img=document.createElement('img');img.src=url;img.alt='Live vector preview';$('#preview').append(img);if(old?.startsWith('blob:'))URL.revokeObjectURL(old);$('#notice').textContent='DEMO · LIVE VECTOR PREVIEW'}catch(e){$('#notice').textContent=e.message}finally{previewBusy=false;if(previewWait){previewWait=false;queuePreview()}}}
let last=0;function tick(ts){
  if(playing && state.speed>0 && ts-lastRendered>=260){
    if(last)phase+=Math.min(.35,(ts-last)/1000)*state.speed*15;
    lastRendered=ts;queuePreview();
  }
  last=ts;requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
$('#play').onclick=()=>{playing=!playing;$('#play').textContent=playing?'Ⅱ PAUSE':'▶ PLAY';last=0};
$('#dice').onclick=()=>{state.seed=Math.floor(Math.random()*999999)+1;phase=Math.random()*100;queuePreview()};
function account(){$('#balance').textContent=user?`${user.credits} CREDIT${user.credits!==1?'S':''}`:'1 FREE CREDIT*';$('#refer').textContent=user?`${location.href.split('?')[0].split('#')[0]}?ref=${user.referralCode}`:'SIGN IN TO GET YOUR REFERRAL LINK';$('#refer').title=user?'Click to copy referral link':'';locale()}
$('#refer').onclick=async()=>{if(!user)return showLogin();let l=$('#refer').textContent;try{await navigator.clipboard.writeText(l);$('#notice').textContent='Referral link copied.'}catch(e){$('#notice').textContent='Select and copy your referral link.'}};
function showLogin(){let dlg=$('#loginDialog');if(!dlg.open)dlg.showModal()}
$('#accountBtn').onclick=async()=>{if(!user)return showLogin();await post('/api/logout',{});user=null;account()};
$('#loginForm').onsubmit=async e=>{e.preventDefault();try{let r=await post('/api/login',{email:$('#email').value,referral:new URL(location.href).searchParams.get('ref')||''});user=r.user;account();$('#loginDialog').close();$('#notice').textContent='DEMO SIGN-IN · No email sent · Browser-only credits';}catch(e){$('#loginNotice').textContent=e.message}};
async function exportVector(){
 if(!user)return showLogin();
 if(user.credits<1){$('#notice').textContent='No credits. Choose a pack.';location.hash='tool';return}
 try{
  const r=await post('/api/export',{format:'svg',config:renderingConfig()});
  const blob=await r.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download='vktn.svg';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),10000);user.credits--;account();$('#notice').textContent='SVG downloaded.';
 }catch(e){$('#notice').textContent=e.message}
}
$('#svgBtn').onclick=exportVector;
$('#pngBtn').onclick=async()=>{try{let r=await post('/api/png',renderingConfig());let blob=await r.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='vktn-600x900.png';a.click();setTimeout(()=>URL.revokeObjectURL(href),3000)}catch(e){$('#notice').textContent=e.message}};
async function purchase(qty){if(!user)return showLogin();try{let r=await post('/api/checkout',{qty});if(r.demo){pendingQty=qty;$('#checkoutDetails').textContent=`${qty} credits / US$${r.usd.toFixed(2)}`;$('#checkoutDialog').showModal()}else window.location.href=r.url}catch(e){alert(e.message+'\nPayment setup is required in .env before live transactions.')}}
$('#buyOne').onclick=()=>purchase(2);$('#buyTen').onclick=()=>purchase(10);
$('#redeemPromo').onclick=async()=>{try{let r=await post('/api/promo/redeem',{code:$('#promoCode').value.trim()});user=r.user;account();$('#promoMessage').textContent=r.message}catch(e){$('#promoMessage').textContent=e.message}};
let pendingQty=2;$('#confirmMock').onclick=async()=>{try{let r=await post('/api/mock/checkout',{qty:pendingQty});user=r.user;account();$('#checkoutDialog').close();$('#notice').textContent=`TEST PAYMENT OK · ${r.receipt} · +${pendingQty} credits`;alert('Simulated payment successful. No money was charged.')}catch(e){alert(e.message)}};$('#cancelMock').onclick=()=>$('#checkoutDialog').close();

(async()=>{try{settings=await api('/api/config');const me=await api('/api/me');user=me.user;for(let [slot,path]of Object.entries(settings.images||{})){if(!path)continue;let holder=$('#'+slot+'Visual')||$('#'+slot);if(holder){holder.innerHTML=`<img src="${path}" alt="Visual sample">`}}if(new URL(location.href).searchParams.has('checkout'))$('#notice').textContent='Payment status: sign in and refresh to see credit balance.';account();updatePreview()}catch(e){$('#notice').textContent=e.message}})();
