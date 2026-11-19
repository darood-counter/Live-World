import {auth,db} from './firebase.js';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,onAuthStateChanged,updateProfile,sendPasswordResetEmail,signOut,EmailAuthProvider,reauthenticateWithCredential,updatePassword,deleteUser} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {doc,getDoc,setDoc,updateDoc,collection,query,where,orderBy,limit,getDocs,addDoc,onSnapshot,serverTimestamp,writeBatch,increment,runTransaction} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const $=id=>document.getElementById(id);
let currentUser=null,profile={},creatingAccount=false,map=null,mapLayer=null,chatUnsub=null,msgUnsub=null,presenceUnsub=null,activeChat=null,activeOther=null,markers=new Map(),loadedUid=null,pinMode=false,gpsWatchId=null,gpsMarker=null,ownSavedMarker=null;
$('year').textContent=new Date().getFullYear();
function msg(id,text,error=false){const el=$(id);if(el){el.textContent=text;el.classList.toggle('error',error)}}
function initials(s='D'){return String(s).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'D'}
function phoneValid(v){return /^\+?[0-9][0-9\s()-]{7,17}$/.test(v.trim())}
function normalizeDriverId(v){return v.trim().toUpperCase()}
function shiftLabel(v){return v==='night'?'Night Shift':'Day Shift'}
function errorText(e){const code=e?.code||'';const messages={'auth/email-already-in-use':'This email is already registered.','auth/invalid-email':'Enter a valid email address.','auth/invalid-credential':'Email or password is incorrect.','auth/weak-password':'Use at least 8 characters for your password.','auth/operation-not-allowed':'Enable Email/Password sign-in in Firebase Authentication.','auth/too-many-requests':'Too many attempts. Please try again later.','auth/expired-action-code':'This password reset link has expired. Request a new email and use the newest link.','auth/invalid-action-code':'This password reset link is invalid or has already been used. Request a new email.','permission-denied':'Firebase permission denied. Publish the updated Firestore Rules, then try again.','failed-precondition':'A Firestore index may be required. Check the browser console for details.','unavailable':'Firebase is temporarily unavailable. Check your internet connection.'};return messages[code]||e?.message||'Something went wrong.'}
function busy(form,on){const b=form.querySelector('[type=submit]');if(b){if(on){b.disabled=true;b.dataset.oldText=b.textContent;b.textContent='Please wait…'}else{b.disabled=false;if(b.dataset.oldText)b.textContent=b.dataset.oldText}}}
function setAuthTab(signup){$('login-tab').classList.toggle('active',!signup);$('signup-tab').classList.toggle('active',signup);$('login-form').classList.toggle('hidden',signup);$('signup-form').classList.toggle('hidden',!signup);msg('auth-message','')}
$('login-tab').onclick=()=>setAuthTab(false);$('signup-tab').onclick=()=>setAuthTab(true);
$('login-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;busy(f,true);try{await signInWithEmailAndPassword(auth,$('login-email').value.trim(),$('login-password').value)}catch(x){msg('auth-message',errorText(x),true)}finally{busy(f,false)}};
$('signup-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const name=$('signup-name').value.trim(),email=$('signup-email').value.trim(),phone=$('signup-phone').value.trim(),userId=normalizeDriverId($('signup-driverid').value),pw=$('signup-password').value;if(!phoneValid(phone)){msg('auth-message','Enter a valid mobile number, including +971 when possible.',true);return}if(!/^[A-Z0-9_-]{3,20}$/.test(userId)){msg('auth-message','Driver ID must be 3–20 letters, numbers, hyphens or underscores.',true);return}if(pw!==$('signup-confirm').value){msg('auth-message','Passwords do not match.',true);return}busy(f,true);creatingAccount=true;let credential=null;try{credential=await createUserWithEmailAndPassword(auth,email,pw);await updateProfile(credential.user,{displayName:name});const uid=credential.user.uid,driverIdRef=doc(db,'driverIds',userId),userData={uid,userId,name,email,phone,city:'Dubai',shift:'day',bio:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),accountStatus:'active',onlineStatus:'offline',savedLocation:null,locationSharing:false};await runTransaction(db,async tx=>{const idSnap=await tx.get(driverIdRef);if(idSnap.exists())throw new Error('This Driver ID is already in use. Please choose another one.');tx.set(driverIdRef,{uid,userId,createdAt:serverTimestamp()});tx.set(doc(db,'users',uid),userData);tx.set(doc(db,'publicProfiles',uid),{uid,userId,name,city:'Dubai',shift:'day',bio:'',phone,onlineStatus:'offline',savedLocation:null,updatedAt:serverTimestamp()})});profile=userData;currentUser=credential.user;creatingAccount=false;await loadUser(credential.user);msg('auth-message','Account created successfully. You can start using DriverLink now.');}catch(x){msg('auth-message',errorText(x),true);if(credential){try{await deleteUser(credential.user)}catch(_){}try{await signOut(auth)}catch(_){}}}finally{creatingAccount=false;busy(f,false)}};
$('forgot-button').onclick=async()=>{const email=$('login-email').value.trim();if(!email)return msg('auth-message','Enter your email first.',true);try{await sendPasswordResetEmail(auth,email);msg('auth-message','Password reset email sent. Use the newest email link once. Firebase controls link expiry; if the link has expired or was already used, request a fresh reset email.')}catch(e){msg('auth-message',errorText(e),true)}};

async function loadUser(user){if(!user||loadedUid===user.uid)return;try{const snap=await getDoc(doc(db,'users',user.uid));if(!snap.exists()){await signOut(auth);msg('auth-message','Your driver profile is missing. Please create your account again or contact support.',true);return}currentUser=user;profile=snap.data();loadedUid=user.uid;showApp()}catch(e){showAuth();msg('auth-message',errorText(e),true)}}
onAuthStateChanged(auth,async user=>{if(creatingAccount)return;if(!user){currentUser=null;loadedUid=null;showAuth();return}await loadUser(user)});
function showAuth(){ stopGpsWatch();if(gpsMarker&&map){map.removeLayer(gpsMarker);gpsMarker=null;} $('auth-view').classList.remove('hidden');$('app-view').classList.add('hidden');$('user-chip').classList.add('hidden');$('online-toggle-map').classList.add('hidden');if(presenceUnsub){presenceUnsub();presenceUnsub=null}if(chatUnsub){chatUnsub();chatUnsub=null}if(msgUnsub){msgUnsub();msgUnsub=null}}
function showApp(){
  $('auth-view').classList.add('hidden');$('app-view').classList.remove('hidden');
  $('user-chip').textContent=profile.name||currentUser.displayName||'Driver';$('user-chip').classList.remove('hidden');$('online-toggle-map').classList.remove('hidden');
  $('profile-name').value=profile.name||'';$('profile-shift').value=profile.shift||'day';$('profile-bio').value=profile.bio||'';$('profile-phone').value=profile.phone||'';$('profile-city').value=profile.city||'Dubai';$('profile-userid').value=profile.userId||currentUser.uid.slice(0,8).toUpperCase();$('profile-avatar').textContent=initials(profile.name||'D');$('profile-summary-name').textContent=profile.name||'Driver';$('profile-summary-id').textContent=`Driver ID: ${profile.userId||currentUser.uid.slice(0,8).toUpperCase()}`;$('profile-summary-status').textContent=profile.onlineStatus==='online'?'ONLINE':'OFFLINE';$('profile-summary-status').className='status-pill '+(profile.onlineStatus==='online'?'online':'offline');
  profile.onlineStatus=profile.onlineStatus==='online'?'online':'offline';
  updateOnlineUi();updateLocationHint();initMap();updatePinModeUi();listenMap();listenChats();if(profile.onlineStatus==='online')startGpsWatch();
}
$('logout').onclick=async()=>{try{await signOut(auth)}catch(e){alert(errorText(e))}};
document.querySelectorAll('.nav-btn[data-page]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav-btn[data-page]').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hidden',p.id!==b.dataset.page));
  if(b.dataset.page==='map-page'){if(map)setTimeout(()=>{map.invalidateSize();focusSavedLocation()},180);}
});
$('back-to-map').onclick=()=>{ $('people-page').classList.add('hidden');$('map-page').classList.remove('hidden');if(map)setTimeout(()=>map.invalidateSize(),180); };
function initMap(){
  if(map)return;
  const saved=profile.savedLocation;
  map=L.map('map',{zoomControl:false,preferCanvas:true}).setView(saved&&Number.isFinite(saved.lat)&&Number.isFinite(saved.lng)?[saved.lat,saved.lng]:[25.2048,55.2708],saved?14:12);
  // OpenStreetMap base layer: no API key required. If its public tile service
  // cannot deliver tiles, switch once to CARTO's OSM-based light map.
  let tileErrors=0,fallbackStarted=false;
  const osmTiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    subdomains:'abc',maxZoom:19,attribution:'© OpenStreetMap contributors',
    keepBuffer:3,updateWhenIdle:true
  });
  osmTiles.on('tileerror',()=>{
    tileErrors++;
    if(tileErrors>=5&&!fallbackStarted){
      fallbackStarted=true;
      map.removeLayer(osmTiles);
      const lightTiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
        subdomains:'abcd',maxZoom:20,attribution:'© OpenStreetMap contributors © CARTO',
        keepBuffer:3,updateWhenIdle:true
      });
      lightTiles.on('tileerror',()=>showMapMessage('Map tiles could not load. Check your internet connection.',true));
      lightTiles.addTo(map);
      showMapMessage('Switching to the backup map…');
    }
  });
  osmTiles.addTo(map);
  mapLayer=L.layerGroup().addTo(map);
  showOwnSavedPin();
}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function showMapMessage(text,error=false){const el=$('map-message');if(!el)return;el.textContent=text;el.classList.toggle('error',error);el.classList.add('visible');clearTimeout(el._hideTimer);el._hideTimer=setTimeout(()=>el.classList.remove('visible'),4200)}
function updateOnlineUi(){
  const online=profile.onlineStatus==='online';$('my-status').textContent=online?'ONLINE':'OFFLINE';$('my-status').className='status-pill '+(online?'online':'offline');
  const toggle=$('online-toggle-map');if(toggle){toggle.title=online?'Go Offline':'Go Online';toggle.setAttribute('aria-label',online?'Go Offline':'Go Online');toggle.classList.toggle('is-online',online);toggle.querySelector('.status-toggle-label').textContent=online?'OFFLINE':'GO ONLINE';toggle.querySelector('.status-toggle-icon').textContent=online?'Ⅱ':'●';}
  if($('profile-summary-status')){$('profile-summary-status').textContent=online?'ONLINE':'OFFLINE';$('profile-summary-status').className='status-pill '+(online?'online':'offline');}
  updatePinModeUi();
}
function updatePinModeUi(){
  const online=profile.onlineStatus==='online';
  const button=$('set-on-map'),crosshair=$('map-center-pin');
  if(!button||!crosshair)return;
  button.disabled=online;button.classList.toggle('hidden',online);
  crosshair.classList.toggle('hidden',online);
  $('map')?.classList.toggle('pin-mode',!online);
}
function updateLocationHint(){const loc=profile.savedLocation;$('location-hint').textContent=loc&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lng)?`${loc.address||'Saved location'} · ${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}`:'No saved location yet. Choose a pin point before going Online.'}
function focusSavedLocation(){const loc=profile.savedLocation;if(map&&loc&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lng)){map.setView([loc.lat,loc.lng],Math.max(map.getZoom(),14));showMapMessage('Showing your saved Pin Point.');}else if(map){map.setView([25.2048,55.2708],12);showMapMessage('No Saved Pin yet. Use the Pin button to choose one.');}}
function showOwnSavedPin(){
  if(!map)return;
  if(ownSavedMarker){map.removeLayer(ownSavedMarker);ownSavedMarker=null;}
  const loc=profile.savedLocation;
  if(!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lng))return;
  const icon=L.divIcon({className:'saved-pin-wrap',html:'<div class="saved-pin-marker"><span></span></div>',iconSize:[34,42],iconAnchor:[17,38]});
  ownSavedMarker=L.marker([loc.lat,loc.lng],{icon,zIndexOffset:800,draggable:false,keyboard:false}).addTo(map);
  ownSavedMarker.bindPopup(`<div class="map-popup"><b>Your Saved Pin Point</b><div><b>Name:</b> ${safe(profile.name||'Driver')}</div><div><b>Working in:</b> ${safe(shiftLabel(profile.shift))}</div><div><b>About me:</b> ${safe(profile.bio||'No description added.')}</div><div><b>Contact number:</b> ${safe(profile.phone||'Not provided')}</div><div>${safe(profile.city||'UAE')} · <span class="online-word">${profile.onlineStatus==='online'?'ONLINE':'OFFLINE'}</span></div><small>Fixed saved location. Go Offline to choose a new location.</small></div>`);
}
function setGpsDot(lat,lng,accuracy){
  if(!map)return;
  const icon=L.divIcon({className:'gps-dot-wrap',html:'<div class="gps-dot-pulse"><span></span></div>',iconSize:[28,28],iconAnchor:[14,14]});
  if(!gpsMarker)gpsMarker=L.marker([lat,lng],{icon,interactive:false,zIndexOffset:1200}).addTo(map);
  else gpsMarker.setLatLng([lat,lng]);
  gpsMarker.bindTooltip('Your GPS location',{direction:'top',offset:[0,-10]});
}
function stopGpsWatch(){if(gpsWatchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null;}}
function gpsError(error){const messages={1:'Please allow location permission to use GPS.',2:'GPS location is unavailable. Try again in an open area.',3:'GPS request timed out. Please try again.'};showMapMessage(messages[error?.code]||'Unable to get GPS location.',true)}
function locateWithGps(){
  if(!map)return;
  if(!navigator.geolocation){showMapMessage('GPS is not supported by this browser.',true);return;}
  showMapMessage('Finding your current GPS location…');
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude,accuracy}=pos.coords;setGpsDot(latitude,longitude,accuracy);map.setView([latitude,longitude],Math.max(map.getZoom(),16));
    showMapMessage(profile.onlineStatus==='online'?'Blue dot shows your live GPS position. Saved Pin stays fixed.':'Blue dot shows your current GPS position.');
    if(profile.onlineStatus==='online'){
      stopGpsWatch();
      gpsWatchId=navigator.geolocation.watchPosition(p=>{setGpsDot(p.coords.latitude,p.coords.longitude,p.coords.accuracy);},gpsError,{enableHighAccuracy:true,maximumAge:3000,timeout:15000});
    }
  },gpsError,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
}
async function reverseGeocode(lat,lng){try{const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=en`;const response=await fetch(url,{headers:{'Accept':'application/json'}});if(!response.ok)return '';const data=await response.json();return data.display_name||'';}catch(_){return '';}}
function startGpsWatch(){
  stopGpsWatch();
  if(!navigator.geolocation)return;
  gpsWatchId=navigator.geolocation.watchPosition(pos=>setGpsDot(pos.coords.latitude,pos.coords.longitude,pos.coords.accuracy),gpsError,{enableHighAccuracy:true,maximumAge:3000,timeout:20000});
}
$('online-toggle-map').onclick=async()=>{
  if(!currentUser)return;
  const next=profile.onlineStatus==='online'?'offline':'online';
  const button=$('online-toggle-map');button.disabled=true;
  try{
    let savedPin=profile.savedLocation||null;
    // Every time the driver goes Online, replace the previous saved pin with
    // the newly selected map-center position. Never use device GPS for this.
    if(next==='online'){
      if(!map)throw new Error('Map is not ready. Please wait and try again.');
      const selectedPoint=map.getCenter();
      if(!selectedPoint||!Number.isFinite(selectedPoint.lat)||!Number.isFinite(selectedPoint.lng))
        throw new Error('The selected map location is not valid.');
      await saveDriverLocation(selectedPoint.lat,selectedPoint.lng,'map',false);
      savedPin=profile.savedLocation;
      if(!savedPin||!Number.isFinite(savedPin.lat)||!Number.isFinite(savedPin.lng))
        throw new Error('Could not save the new map location. Please try again.');
    }
    const batch=writeBatch(db);
    if(next==='online'){
      // Publish exactly the manually saved coordinates. GPS is used only for the blue dot.
      batch.update(doc(db,'users',currentUser.uid),{onlineStatus:'online',savedLocation:savedPin,updatedAt:serverTimestamp()});
      batch.set(doc(db,'publicProfiles',currentUser.uid),{uid:currentUser.uid,onlineStatus:'online',savedLocation:savedPin,updatedAt:serverTimestamp()},{merge:true});
    }else{
      batch.update(doc(db,'users',currentUser.uid),{onlineStatus:'offline',updatedAt:serverTimestamp()});
      batch.set(doc(db,'publicProfiles',currentUser.uid),{uid:currentUser.uid,onlineStatus:'offline',updatedAt:serverTimestamp()},{merge:true});
    }
    await batch.commit();
    if(next==='online')profile.savedLocation=savedPin;
    profile.onlineStatus=next;updateOnlineUi();
    if(next==='offline'){
      stopGpsWatch();
      if(gpsMarker&&map){map.removeLayer(gpsMarker);gpsMarker=null;}
      showOwnSavedPin();
      updatePinModeUi();
      showMapMessage('You are Offline. Move the map under the fixed center pin, then tap Save Pin.');
    }else{
      showOwnSavedPin();
      updatePinModeUi();
      // This watch updates only the blue GPS dot; it never writes to savedLocation or Firestore.
      startGpsWatch();
      showMapMessage('You are Online. Your newly selected map location replaced the previous Saved Pin. Blue dot shows live GPS separately.');
      if(map)map.setView([savedPin.lat,savedPin.lng],Math.max(map.getZoom(),14));
    }
  }catch(e){showMapMessage(errorText(e),true);console.error(e);}
  finally{button.disabled=false;}
};
async function saveDriverLocation(lat,lng,source,refreshMap=true){
  if(!currentUser)throw new Error('Please log in first.');
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat>90||lng < -180||lng>180)throw new Error('The selected map location is not valid.');
  const address=await reverseGeocode(lat,lng);
  const savedLocation={lat,lng,address:address||(source==='gps'?'Current GPS location':'Selected map location'),source:source==='gps'?'gps':'map',updatedAt:serverTimestamp()};
  const batch=writeBatch(db);
  batch.update(doc(db,'users',currentUser.uid),{savedLocation,updatedAt:serverTimestamp()});
  batch.set(doc(db,'publicProfiles',currentUser.uid),{uid:currentUser.uid,savedLocation,updatedAt:serverTimestamp()},{merge:true});
  await batch.commit();profile.savedLocation={...savedLocation,updatedAt:null};updateLocationHint();
  if(map&&refreshMap){showOwnSavedPin();map.setView([lat,lng],Math.max(map.getZoom(),14));}
}
$('current-location').onclick=locateWithGps;
$('set-on-map').onclick=async()=>{
  if(profile.onlineStatus==='online'){showMapMessage('Go Offline before changing your Saved Pin.',true);return;}
  if(!map)return;
  const center=map.getCenter(),button=$('set-on-map');button.disabled=true;
  try{await saveDriverLocation(center.lat,center.lng,'map');showMapMessage('Saved Pin updated at the center of the map.');}
  catch(err){showMapMessage(errorText(err),true);}
  finally{button.disabled=false;}
};
function listenMap(){
  if(presenceUnsub)presenceUnsub();
  presenceUnsub=onSnapshot(collection(db,'publicProfiles'),snap=>{
    if(!mapLayer)return;mapLayer.clearLayers();markers.clear();
    const drivers=[];
    snap.forEach(d=>{const p=d.data(),loc=p.savedLocation;if(p.onlineStatus!=='online'||!loc||typeof loc.lat!=='number'||typeof loc.lng!=='number')return;drivers.push({uid:d.id,p,lat:loc.lat,lng:loc.lng,isMe:d.id===currentUser.uid})});
    const groups=[];drivers.forEach(driver=>{let group=groups.find(g=>distanceMeters(g.lat,g.lng,driver.lat,driver.lng)<=75);if(!group){group={lat:driver.lat,lng:driver.lng,drivers:[]};groups.push(group)}group.drivers.push(driver)});
    groups.forEach(group=>{
      const visibleDrivers=group.drivers.filter(d=>!d.isMe);
      if(!visibleDrivers.length)return;
      const many=visibleDrivers.length>1;const icon=many?L.divIcon({className:'driver-cluster-wrap',html:`<div class="driver-cluster">${visibleDrivers.length}</div>`,iconSize:[42,42],iconAnchor:[21,21]}):undefined;
      const marker=L.marker([group.lat,group.lng],icon?{icon}:{}).addTo(mapLayer);visibleDrivers.forEach(d=>markers.set(d.uid,marker));
      if(!many){
        const d=visibleDrivers[0],name=safe(d.p.name||'Driver');
        marker.bindPopup(`<div class="map-popup driver-popup"><div class="popup-heading"><span class="popup-avatar">${safe(initials(d.p.name||'Driver'))}</span><span><b>${name}</b><small>${safe(d.p.city||'UAE')} · <span class="online-word">ONLINE</span></small></span></div><div class="popup-detail"><b>Working in</b><span>${safe(shiftLabel(d.p.shift))}</span></div><div class="popup-detail"><b>About me</b><span>${safe(d.p.bio||'No description added.')}</span></div><div class="popup-detail"><b>Contact number</b><span>${safe(d.p.phone||'Not provided')}</span></div><div class="popup-actions"><button type="button" class="popup-profile" data-profile="${safe(d.uid)}">View Profile</button><button type="button" class="popup-chat" data-chat="${safe(d.uid)}">✉ Message</button></div></div>`,{maxWidth:310});
        marker.on('popupopen',ev=>{const root=ev.popup.getElement();root.querySelector('[data-profile]')?.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();map.closePopup();viewProfile(d.uid)});root.querySelector('[data-chat]')?.addEventListener('click',()=>startChat(d.uid,d.p.name||'Driver'))});
      }else{
        marker.bindPopup(`<div class="cluster-popup"><div class="cluster-popup-title"><b>${visibleDrivers.length} drivers at this location</b><small>Choose a driver to view their profile or message them</small></div>${visibleDrivers.map(d=>`<div class="cluster-driver-name"><span class="cluster-avatar">${safe(initials(d.p.name||'Driver'))}</span><span class="cluster-name-copy"><b>${safe(d.p.name||'Driver')}</b><small>${safe(d.p.city||'UAE')} · ONLINE</small></span><button type="button" class="cluster-profile-btn" data-profile="${safe(d.uid)}">Details</button><button type="button" class="cluster-chat-btn" data-chat="${safe(d.uid)}" aria-label="Message ${safe(d.p.name||'Driver')}">✉</button></div>`).join('')}</div>`,{maxWidth:350});
        marker.on('popupopen',ev=>{const root=ev.popup.getElement();root.querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();const uid=b.dataset.profile;map.closePopup();viewProfile(uid)}));root.querySelectorAll('[data-chat]').forEach(b=>b.addEventListener('click',()=>{const d=visibleDrivers.find(x=>x.uid===b.dataset.chat);if(d)startChat(d.uid,d.p.name||'Driver')}))});
      }
    });
    $('map-online-count').textContent=`${drivers.length} ${drivers.length===1?'driver':'drivers'}`;
  },e=>{console.warn('Driver map listener:',e);$('location-hint').textContent=errorText(e)});
}
function distanceMeters(a,b,c,d){const r=x=>x*Math.PI/180,lat1=r(a),lat2=r(c),dlat=r(c-a),dlng=r(d-b),h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}

async function searchPeople(){const term=$('people-search').value.trim().toLowerCase(),box=$('people-list');box.innerHTML='';if(term.length<2){box.textContent='Enter at least 2 characters.';return}try{const snap=await getDocs(query(collection(db,'publicProfiles'),limit(200)));const found=snap.docs.map(d=>d.data()).filter(p=>p.uid!==currentUser.uid&&((p.name||'').toLowerCase().includes(term)||(p.userId||'').toLowerCase().includes(term)));if(!found.length){box.textContent='No drivers found.';return}found.forEach(p=>{const el=document.createElement('article');el.className='person-card';el.innerHTML=`<div class="person-top"><div class="avatar">${safe(initials(p.name||'D'))}</div><div><b>${safe(p.name||'Driver')}</b><div class="muted">${safe(p.city||'UAE')} · ${safe(p.userId||'')}</div></div></div><p>${safe(p.bio||'Taxi driver')}</p><div class="card-actions"><button class="secondary profile-action" type="button">View Profile</button><button class="primary chat-action" type="button">Chat</button></div>`;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',`View ${p.name||'driver'} profile`);el.onclick=()=>viewProfile(p.uid);el.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();viewProfile(p.uid)}};el.querySelector('.profile-action').onclick=ev=>{ev.stopPropagation();viewProfile(p.uid)};el.querySelector('.chat-action').onclick=ev=>{ev.stopPropagation();startChat(p.uid,p.name||'Driver')};box.append(el)})}catch(e){box.textContent=errorText(e)}}
$('people-search-btn').onclick=searchPeople;$('people-search').onkeydown=e=>{if(e.key==='Enter')searchPeople()};
async function viewProfile(uid){try{const snap=await getDoc(doc(db,'publicProfiles',uid));let p=snap.exists()?snap.data():null;if(uid===currentUser.uid){const own=await getDoc(doc(db,'users',uid));if(own.exists())p={...own.data(),...(p||{})}}if(!p){alert('This driver profile is not available.');return}const loc=p.savedLocation,online=p.onlineStatus==='online',name=p.name||'Driver';$('modal-avatar').textContent=initials(name);$('modal-name').textContent=name;$('modal-userid').textContent=p.userId?`Driver ID: ${p.userId}`:'Driver ID not provided';$('modal-city').textContent=p.city||'Not provided';$('modal-shift').textContent=shiftLabel(p.shift);$('modal-bio').textContent=p.bio||'No description added.';$('modal-status').textContent=online?'ONLINE':'OFFLINE';$('modal-status').className='status-pill '+(online?'online':'offline');$('modal-location').textContent=online&&loc?`${loc.address||`${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}`} · Saved Pin`:'Not currently visible';$('modal-phone').textContent=p.phone||'Not provided';$('modal-chat').textContent='✉  Message';$('modal-chat').classList.toggle('hidden',uid===currentUser.uid);$('modal-chat').onclick=()=>{closeProfile();startChat(uid,name)};$('profile-modal').classList.remove('hidden')}catch(e){alert(errorText(e))}}
function closeProfile(){$('profile-modal').classList.add('hidden')}$('close-profile').onclick=closeProfile;$('profile-modal').addEventListener('click',e=>{if(e.target===$('profile-modal'))closeProfile()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProfile()});

async function startChat(uid,name){if(uid===currentUser.uid)return;try{const blocks=await getDocs(query(collection(db,'blocks'),where('ownerUid','==',currentUser.uid),where('blockedUid','==',uid),limit(1)));if(!blocks.empty){alert('You have blocked this driver. Unblock them to send messages.');return}const id=[currentUser.uid,uid].sort().join('_'),ref=doc(db,'chats',id),snap=await getDoc(ref);if(!snap.exists())await setDoc(ref,{members:[currentUser.uid,uid],memberNames:{[currentUser.uid]:profile.name,[uid]:name},unreadCounts:{[currentUser.uid]:0,[uid]:0},lastMessage:'',updatedAt:serverTimestamp(),createdAt:serverTimestamp()});activeChat=id;activeOther={uid,name};$('chat-empty').classList.add('hidden');$('conversation-view').classList.remove('hidden');$('conversation-title').textContent=name;document.querySelector('[data-page="chat-page"]').click();listenMessages(id);setTimeout(()=>$('message-input')?.focus(),180)}catch(e){alert(errorText(e))}}
function listenChats(){if(chatUnsub)chatUnsub();chatUnsub=onSnapshot(query(collection(db,'chats'),where('members','array-contains',currentUser.uid),limit(50)),snap=>{const box=$('chat-list');box.innerHTML='';if(snap.empty){box.innerHTML='<p class="muted">No conversations yet. Find a driver and select Chat.</p>';$('chat-count').textContent='';return}const rows=snap.docs.map(d=>({id:d.id,data:d.data()})).sort((a,b)=>(b.data.updatedAt?.toMillis?.()||0)-(a.data.updatedAt?.toMillis?.()||0));let totalUnread=0;rows.forEach(row=>{const c=row.data,other=c.members.find(x=>x!==currentUser.uid),name=c.memberNames?.[other]||'Driver',unread=Number(c.unreadCounts?.[currentUser.uid]||0);totalUnread+=unread;const el=document.createElement('button');el.type='button';el.className='chat-person';el.innerHTML=`<span class="avatar">${safe(initials(name))}</span><span class="chat-person-copy"><b>${safe(name)}</b><small class="muted">${safe(c.lastMessage||'Start chatting')}</small></span>${unread?`<span class="unread-badge">${unread>99?'99+':unread}</span>`:''}`;el.onclick=()=>{activeChat=row.id;activeOther={uid:other,name};$('chat-empty').classList.add('hidden');$('conversation-view').classList.remove('hidden');$('conversation-title').textContent=name;updateDoc(doc(db,'chats',row.id),{[`unreadCounts.${currentUser.uid}`]:0}).catch(console.warn);listenMessages(row.id)};box.append(el)});$('chat-count').textContent=totalUnread?`(${totalUnread>99?'99+':totalUnread})`:''},e=>{console.warn(e);$('chat-list').textContent=errorText(e)})}
$('conversation-title').title='Click to view driver profile';$('conversation-title').style.cursor='pointer';$('conversation-title').onclick=()=>{if(activeOther?.uid)viewProfile(activeOther.uid)};
function listenMessages(id){if(msgUnsub)msgUnsub();msgUnsub=onSnapshot(query(collection(db,'chats',id,'messages'),orderBy('createdAt','asc'),limit(100)),snap=>{const box=$('messages');box.innerHTML='';snap.forEach(d=>{const m=d.data(),el=document.createElement('div');el.className='bubble'+(m.senderUid===currentUser.uid?' mine':'');el.innerHTML=`${safe(m.text)}<small>${m.senderUid===currentUser.uid?'You':safe(activeOther?.name||'Driver')}</small>`;box.append(el)});box.scrollTop=box.scrollHeight;updateDoc(doc(db,'chats',id),{[`unreadCounts.${currentUser.uid}`]:0}).catch(()=>{})},e=>msg('conversation-title',errorText(e),true))}
$('clear-chat').onclick=async()=>{if(!activeChat||!activeOther)return;if(!confirm(`Clear the entire chat history with ${activeOther.name||'this driver'}? This removes messages for both participants and cannot be undone.`))return;const button=$('clear-chat');button.disabled=true;try{const snap=await getDocs(collection(db,'chats',activeChat,'messages'));const docs=snap.docs;for(let i=0;i<docs.length;i+=450){const batch=writeBatch(db);docs.slice(i,i+450).forEach(d=>batch.delete(d.ref));await batch.commit()}await updateDoc(doc(db,'chats',activeChat),{lastMessage:'',updatedAt:serverTimestamp(),[`unreadCounts.${currentUser.uid}`]:0,[`unreadCounts.${activeOther.uid}`]:0});$('messages').innerHTML='';showChatNotice('Chat history cleared for both participants.')}catch(e){alert(errorText(e))}finally{button.disabled=false}};
function showChatNotice(text){const el=document.createElement('p');el.className='chat-notice muted';el.textContent=text;$('messages').prepend(el)}
$('send-form').onsubmit=async e=>{e.preventDefault();const text=$('message-input').value.trim();if(!text||!activeChat||!activeOther)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{const blocked=await getDocs(query(collection(db,'blocks'),where('ownerUid','==',activeOther.uid),where('blockedUid','==',currentUser.uid),limit(1)));if(!blocked.empty)throw new Error('This driver is not accepting messages from you.');const batch=writeBatch(db),messageRef=doc(collection(db,'chats',activeChat,'messages')),chatRef=doc(db,'chats',activeChat);batch.set(messageRef,{senderUid:currentUser.uid,text:text.slice(0,2000),createdAt:serverTimestamp()});batch.update(chatRef,{lastMessage:text.slice(0,100),updatedAt:serverTimestamp(),[`unreadCounts.${activeOther.uid}`]:increment(1)});await batch.commit();$('message-input').value=''}catch(x){alert(errorText(x))}finally{btn.disabled=false}};
$('block-user').onclick=async()=>{if(!activeOther||!confirm('Block this driver? They will no longer be able to message you.'))return;try{await setDoc(doc(db,'blocks',`${currentUser.uid}_${activeOther.uid}`),{ownerUid:currentUser.uid,blockedUid:activeOther.uid,createdAt:serverTimestamp()});alert('Driver blocked.')}catch(e){alert(errorText(e))}};
$('report-user').onclick=async()=>{if(!activeOther)return;const reason=prompt('Tell us why you are reporting this conversation:');if(!reason?.trim())return;try{await addDoc(collection(db,'reports'),{reporterUid:currentUser.uid,reportedUid:activeOther.uid,chatId:activeChat,reason:reason.trim().slice(0,500),createdAt:serverTimestamp(),status:'open'});alert('Report submitted. Thank you.')}catch(e){alert(errorText(e))}};
$('profile-form').onsubmit=async e=>{e.preventDefault();const name=$('profile-name').value.trim(),shift=$('profile-shift').value==='night'?'night':'day',bio=$('profile-bio').value.trim(),phone=$('profile-phone').value.trim(),city=$('profile-city').value;if(!phoneValid(phone))return msg('profile-message','Enter a valid mobile number.',true);try{await updateDoc(doc(db,'users',currentUser.uid),{name,shift,bio,phone,city,updatedAt:serverTimestamp()});await setDoc(doc(db,'publicProfiles',currentUser.uid),{uid:currentUser.uid,userId:profile.userId,name,shift,bio,city,phone,onlineStatus:profile.onlineStatus||'offline',savedLocation:profile.savedLocation||null,updatedAt:serverTimestamp()},{merge:true});await updateProfile(currentUser,{displayName:name});profile={...profile,name,shift,bio,phone,city};$('user-chip').textContent=name;$('profile-avatar').textContent=initials(name);$('profile-summary-name').textContent=name;msg('profile-message','Profile saved. Your mobile number is visible to signed-in DriverLink users.')}catch(x){msg('profile-message',errorText(x),true)}};

$('change-password').onclick=async()=>{const current=$('current-password').value,newPass=$('new-password').value,confirmPass=$('confirm-new-password').value;if(!current||!newPass||!confirmPass)return msg('password-message','Complete all password fields.',true);if(newPass.length<8)return msg('password-message','New password must be at least 8 characters.',true);if(newPass!==confirmPass)return msg('password-message','New passwords do not match.',true);const btn=$('change-password');btn.disabled=true;try{const credential=EmailAuthProvider.credential(currentUser.email,current);await reauthenticateWithCredential(currentUser,credential);await updatePassword(currentUser,newPass);$('current-password').value='';$('new-password').value='';$('confirm-new-password').value='';msg('password-message','Password updated successfully.')}catch(e){const code=e?.code;msg('password-message',code==='auth/wrong-password'||code==='auth/invalid-credential'?'Current password is incorrect.':errorText(e),true)}finally{btn.disabled=false}};
