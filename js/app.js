import {auth,db} from './firebase.js';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,onAuthStateChanged,updateProfile,sendPasswordResetEmail,signOut} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {doc,getDoc,setDoc,updateDoc,collection,query,where,orderBy,limit,getDocs,addDoc,onSnapshot,serverTimestamp,writeBatch,increment} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const $=id=>document.getElementById(id);
let currentUser=null,profile={},creatingAccount=false,map=null,mapLayer=null,chatUnsub=null,msgUnsub=null,presenceUnsub=null,activeChat=null,activeOther=null,markers=new Map(),loadedUid=null,pinMode=false;
$('year').textContent=new Date().getFullYear();
function msg(id,text,error=false){const el=$(id);if(el){el.textContent=text;el.classList.toggle('error',error)}}
function initials(s='D'){return String(s).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'D'}
function phoneValid(v){return /^\+?[0-9][0-9\s()-]{7,17}$/.test(v.trim())}
function errorText(e){const code=e?.code||'';const messages={'auth/email-already-in-use':'This email is already registered.','auth/invalid-email':'Enter a valid email address.','auth/invalid-credential':'Email or password is incorrect.','auth/weak-password':'Use at least 8 characters for your password.','auth/operation-not-allowed':'Enable Email/Password sign-in in Firebase Authentication.','auth/too-many-requests':'Too many attempts. Please try again later.','permission-denied':'Firebase permission denied. Publish the updated Firestore Rules, then try again.','failed-precondition':'A Firestore index may be required. Check the browser console for details.','unavailable':'Firebase is temporarily unavailable. Check your internet connection.'};return messages[code]||e?.message||'Something went wrong.'}
function busy(form,on){const b=form.querySelector('[type=submit]');if(b){if(on){b.disabled=true;b.dataset.oldText=b.textContent;b.textContent='Please wait…'}else{b.disabled=false;if(b.dataset.oldText)b.textContent=b.dataset.oldText}}}
function setAuthTab(signup){$('login-tab').classList.toggle('active',!signup);$('signup-tab').classList.toggle('active',signup);$('login-form').classList.toggle('hidden',signup);$('signup-form').classList.toggle('hidden',!signup);msg('auth-message','')}
$('login-tab').onclick=()=>setAuthTab(false);$('signup-tab').onclick=()=>setAuthTab(true);
$('login-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;busy(f,true);try{await signInWithEmailAndPassword(auth,$('login-email').value.trim(),$('login-password').value)}catch(x){msg('auth-message',errorText(x),true)}finally{busy(f,false)}};
$('signup-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const name=$('signup-name').value.trim(),email=$('signup-email').value.trim(),phone=$('signup-phone').value.trim(),pw=$('signup-password').value;if(!phoneValid(phone)){msg('auth-message','Enter a valid mobile number, including +971 when possible.',true);return}if(pw!==$('signup-confirm').value){msg('auth-message','Passwords do not match.',true);return}busy(f,true);creatingAccount=true;let credential=null;try{credential=await createUserWithEmailAndPassword(auth,email,pw);await updateProfile(credential.user,{displayName:name});const uid=credential.user.uid;const userData={uid,userId:uid.slice(0,8).toUpperCase(),name,email,phone,city:'Dubai',bio:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),accountStatus:'active',onlineStatus:'offline',savedLocation:null,locationSharing:false};await setDoc(doc(db,'users',uid),userData);await setDoc(doc(db,'publicProfiles',uid),{uid,userId:userData.userId,name,city:'Dubai',bio:'',onlineStatus:'offline',savedLocation:null,updatedAt:serverTimestamp()});profile=userData;currentUser=credential.user;creatingAccount=false;await loadUser(credential.user);msg('auth-message','Account created successfully. You can start using DriverLink now.');}catch(x){msg('auth-message',errorText(x),true);if(credential){try{await signOut(auth)}catch(_){}}}finally{creatingAccount=false;busy(f,false)}};
$('forgot-button').onclick=async()=>{const email=$('login-email').value.trim();if(!email)return msg('auth-message','Enter your email first.',true);try{await sendPasswordResetEmail(auth,email);msg('auth-message','Password reset email sent.')}catch(e){msg('auth-message',errorText(e),true)}};

async function loadUser(user){if(!user||loadedUid===user.uid)return;try{const snap=await getDoc(doc(db,'users',user.uid));if(!snap.exists()){await signOut(auth);msg('auth-message','Your driver profile is missing. Please create your account again or contact support.',true);return}currentUser=user;profile=snap.data();loadedUid=user.uid;showApp()}catch(e){showAuth();msg('auth-message',errorText(e),true)}}
onAuthStateChanged(auth,async user=>{if(creatingAccount)return;if(!user){currentUser=null;loadedUid=null;showAuth();return}await loadUser(user)});
function showAuth(){ $('auth-view').classList.remove('hidden');$('app-view').classList.add('hidden');$('user-chip').classList.add('hidden');$('online-toggle').classList.add('hidden');if(presenceUnsub){presenceUnsub();presenceUnsub=null}if(chatUnsub){chatUnsub();chatUnsub=null}if(msgUnsub){msgUnsub();msgUnsub=null}}
function showApp(){
  $('auth-view').classList.add('hidden');$('app-view').classList.remove('hidden');
  $('user-chip').textContent=profile.name||currentUser.displayName||'Driver';$('user-chip').classList.remove('hidden');$('online-toggle').classList.remove('hidden');
  $('profile-name').value=profile.name||'';$('profile-bio').value=profile.bio||'';$('profile-phone').value=profile.phone||'';$('profile-city').value=profile.city||'Dubai';$('profile-userid').value=profile.userId||currentUser.uid.slice(0,8).toUpperCase();$('profile-avatar').textContent=initials(profile.name||'D');$('profile-summary-name').textContent=profile.name||'Driver';$('profile-summary-id').textContent=`Driver ID: ${profile.userId||currentUser.uid.slice(0,8).toUpperCase()}`;$('profile-summary-status').textContent=profile.onlineStatus==='online'?'ONLINE':'OFFLINE';$('profile-summary-status').className='status-pill '+(profile.onlineStatus==='online'?'online':'offline');
  profile.onlineStatus=profile.onlineStatus==='online'?'online':'offline';
  updateOnlineUi();updateLocationHint();initMap();listenMap();listenChats();
}
$('logout').onclick=async()=>{try{await signOut(auth)}catch(e){alert(errorText(e))}};
document.querySelectorAll('.nav-btn[data-page]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.nav-btn[data-page]').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hidden',p.id!==b.dataset.page));
  if(b.dataset.page==='map-page'){if(map)setTimeout(()=>{map.invalidateSize();focusSavedLocation()},180);}
});
$('find-drivers').onclick=()=>{ $('map-page').classList.add('hidden');$('people-page').classList.remove('hidden');setTimeout(()=>$('people-search').focus(),50); };
$('back-to-map').onclick=()=>{ $('people-page').classList.add('hidden');$('map-page').classList.remove('hidden');if(map)setTimeout(()=>map.invalidateSize(),180); };
function initMap(){
  if(map)return;
  const saved=profile.savedLocation;map=L.map('map',{zoomControl:true}).setView(saved&&Number.isFinite(saved.lat)&&Number.isFinite(saved.lng)?[saved.lat,saved.lng]:[25.2048,55.2708],saved?14:11);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri — Sources: Esri, HERE, Garmin, USGS, and the GIS community'}).addTo(map);
  mapLayer=L.layerGroup().addTo(map);
  map.on('click',async e=>{if(!pinMode)return;pinMode=false;$('set-on-map').classList.remove('selected');try{await saveDriverLocation(e.latlng.lat,e.latlng.lng,'map');$('location-hint').textContent='Your map location has been saved.'}catch(err){msg('location-hint',errorText(err),true)}});
}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function updateOnlineUi(){
  const online=profile.onlineStatus==='online';$('my-status').textContent=online?'ONLINE':'OFFLINE';$('my-status').className='status-pill '+(online?'online':'offline');
  $('online-toggle').textContent=online?'Go Offline':'Go Online';$('online-toggle').classList.toggle('is-online',online);if($('profile-summary-status')){$('profile-summary-status').textContent=online?'ONLINE':'OFFLINE';$('profile-summary-status').className='status-pill '+(online?'online':'offline');}
}
function updateLocationHint(){const loc=profile.savedLocation;$('location-hint').textContent=loc&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lng)?`${loc.address||'Saved location'} · ${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}`:'No saved location yet. Tap Set on Map and choose your fixed location before going Online.'}
function focusSavedLocation(){const loc=profile.savedLocation;if(map&&loc&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lng)){map.setView([loc.lat,loc.lng],Math.max(map.getZoom(),14));$('location-hint').textContent=`Showing your saved location: ${loc.address||`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`}`;}else if(map){map.setView([25.2048,55.2708],11);$('location-hint').textContent='No saved location yet. Tap Set on Map to choose one.';}}
async function reverseGeocode(lat,lng){try{const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;const response=await fetch(url,{headers:{'Accept':'application/json'}});if(!response.ok)return '';const data=await response.json();return data.display_name||'';}catch(_){return '';}}
$('online-toggle').onclick=async()=>{
  if(!currentUser)return;
  const next=profile.onlineStatus==='online'?'offline':'online';
  const button=$('online-toggle');button.disabled=true;
  try{
    if(next==='online'){
      const loc=profile.savedLocation;
      if(!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lng)){
        $('share-status').textContent='First tap Set on Map and save your fixed location. Online will not use GPS.';
        $('location-hint').textContent='Choose your saved location on the map before going Online.';
        return;
      }
    }
    const batch=writeBatch(db);
    batch.update(doc(db,'users',currentUser.uid),{onlineStatus:next,updatedAt:serverTimestamp()});
    batch.set(doc(db,'publicProfiles',currentUser.uid),{uid:currentUser.uid,onlineStatus:next,updatedAt:serverTimestamp()},{merge:true});
    await batch.commit();
    profile.onlineStatus=next;updateOnlineUi();
    if(next==='offline'){
      $('share-status').textContent='You are Offline. Your saved location is kept, but hidden from the map.';
    }else{
      $('share-status').textContent='You are Online at your saved map location. GPS and live tracking are not used.';
      if(map)map.setView([profile.savedLocation.lat,profile.savedLocation.lng],Math.max(map.getZoom(),14));
    }
  }catch(e){$('share-status').textContent=errorText(e);console.error(e);}
  finally{button.disabled=false;}
};
async function saveDriverLocation(lat,lng,source){
  if(!currentUser)throw new Error('Please log in first.');
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat>90||lng < -180||lng>180)throw new Error('The selected map location is not valid.');
  const address=await reverseGeocode(lat,lng);
  const savedLocation={lat,lng,address:address||'Selected map location',source:'map',updatedAt:serverTimestamp()};
  const batch=writeBatch(db);
  batch.update(doc(db,'users',currentUser.uid),{savedLocation,updatedAt:serverTimestamp()});
  batch.set(doc(db,'publicProfiles',currentUser.uid),{uid:currentUser.uid,savedLocation,updatedAt:serverTimestamp()},{merge:true});
  await batch.commit();profile.savedLocation={...savedLocation,updatedAt:null};updateLocationHint();
  if(map)map.setView([lat,lng],Math.max(map.getZoom(),14));
}
$('current-location').onclick=()=>{
  if(!map)return;
  const loc=profile.savedLocation;
  if(loc&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lng)){map.setView([loc.lat,loc.lng],Math.max(map.getZoom(),15));$('location-hint').textContent=`Showing saved location: ${loc.address||`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`} · This does not use live GPS.`;}
  else{$('location-hint').textContent='No saved location yet. Tap Set on Map to choose your fixed location.';}
};
$('set-on-map').onclick=()=>{pinMode=!pinMode;$('set-on-map').classList.toggle('selected',pinMode);$('location-hint').textContent=pinMode?'Tap anywhere on the map to save your location.':'Map pin selection cancelled.'};
function listenMap(){
  if(presenceUnsub)presenceUnsub();
  presenceUnsub=onSnapshot(collection(db,'publicProfiles'),snap=>{
    if(!mapLayer)return;mapLayer.clearLayers();markers.clear();
    const drivers=[];
    snap.forEach(d=>{const p=d.data(),loc=p.savedLocation;if(p.onlineStatus!=='online'||!loc||typeof loc.lat!=='number'||typeof loc.lng!=='number')return;drivers.push({uid:d.id,p,lat:loc.lat,lng:loc.lng,isMe:d.id===currentUser.uid})});
    const groups=[];drivers.forEach(driver=>{let group=groups.find(g=>distanceMeters(g.lat,g.lng,driver.lat,driver.lng)<=75);if(!group){group={lat:driver.lat,lng:driver.lng,drivers:[]};groups.push(group)}group.drivers.push(driver)});
    groups.forEach(group=>{
      const many=group.drivers.length>1;const icon=many?L.divIcon({className:'driver-cluster-wrap',html:`<div class="driver-cluster">${group.drivers.length}</div>`,iconSize:[42,42],iconAnchor:[21,21]}):undefined;
      const marker=L.marker([group.lat,group.lng],icon?{icon}:{}).addTo(mapLayer);group.drivers.forEach(d=>markers.set(d.uid,marker));
      if(!many){
        const d=group.drivers[0],name=safe(d.p.name||'Driver');
        const actions=d.isMe?'<div class="online-word">YOUR SAVED LOCATION</div>':'<div class="popup-actions"><button type="button" class="popup-profile">View Profile</button><button type="button" class="popup-chat">Chat</button></div>';
        marker.bindPopup(`<div class="map-popup"><b>${d.isMe?'You':name}</b><div>${safe(d.p.city||'UAE')} · <span class="online-word">ONLINE</span></div>${actions}</div>`);
        marker.on('popupopen',ev=>{const root=ev.popup.getElement();root.querySelector('.popup-profile')?.addEventListener('click',()=>viewProfile(d.uid));root.querySelector('.popup-chat')?.addEventListener('click',()=>startChat(d.uid,d.p.name||'Driver'))});
      }else{
        marker.bindPopup(`<div class="cluster-popup"><b>${group.drivers.length} drivers at this location</b>${group.drivers.map(d=>`<div class="cluster-driver"><span><b>${d.isMe?'You':safe(d.p.name||'Driver')}</b><small>${safe(d.p.city||'UAE')} · ${safe(d.p.userId||'')}</small></span><span><button type="button" data-profile="${safe(d.uid)}">View Profile</button>${d.isMe?'':`<button type="button" data-chat="${safe(d.uid)}" data-name="${safe(d.p.name||'Driver')}">Chat</button>`}</span></div>`).join('')}</div>`);
        marker.on('popupopen',ev=>{const root=ev.popup.getElement();root.querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>viewProfile(b.dataset.profile)));root.querySelectorAll('[data-chat]').forEach(b=>b.addEventListener('click',()=>startChat(b.dataset.chat,b.dataset.name||'Driver')))});
      }
    });
    $('map-online-count').textContent=`${drivers.length} ${drivers.length===1?'driver':'drivers'} online`;
  },e=>{console.warn('Driver map listener:',e);$('location-hint').textContent=errorText(e)});
}
function distanceMeters(a,b,c,d){const r=x=>x*Math.PI/180,lat1=r(a),lat2=r(c),dlat=r(c-a),dlng=r(d-b),h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}

async function searchPeople(){const term=$('people-search').value.trim().toLowerCase(),box=$('people-list');box.innerHTML='';if(term.length<2){box.textContent='Enter at least 2 characters.';return}try{const snap=await getDocs(query(collection(db,'publicProfiles'),limit(200)));const found=snap.docs.map(d=>d.data()).filter(p=>p.uid!==currentUser.uid&&((p.name||'').toLowerCase().includes(term)||(p.userId||'').toLowerCase().includes(term)));if(!found.length){box.textContent='No drivers found.';return}found.forEach(p=>{const el=document.createElement('article');el.className='person-card';el.innerHTML=`<div class="person-top"><div class="avatar">${safe(initials(p.name||'D'))}</div><div><b>${safe(p.name||'Driver')}</b><div class="muted">${safe(p.city||'UAE')} · ${safe(p.userId||'')}</div></div></div><p>${safe(p.bio||'Taxi driver')}</p><div class="card-actions"><button class="secondary profile-action" type="button">View Profile</button><button class="primary chat-action" type="button">Chat</button></div>`;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',`View ${p.name||'driver'} profile`);el.onclick=()=>viewProfile(p.uid);el.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();viewProfile(p.uid)}};el.querySelector('.profile-action').onclick=ev=>{ev.stopPropagation();viewProfile(p.uid)};el.querySelector('.chat-action').onclick=ev=>{ev.stopPropagation();startChat(p.uid,p.name||'Driver')};box.append(el)})}catch(e){box.textContent=errorText(e)}}
$('people-search-btn').onclick=searchPeople;$('people-search').onkeydown=e=>{if(e.key==='Enter')searchPeople()};
async function viewProfile(uid){try{const snap=await getDoc(doc(db,'publicProfiles',uid));if(!snap.exists()){alert('This driver profile is not available.');return}const p=snap.data(),loc=p.savedLocation,online=p.onlineStatus==='online';$('modal-avatar').textContent=initials(p.name||'D');$('modal-name').textContent=p.name||'Driver';$('modal-userid').textContent=`Driver ID: ${p.userId||uid.slice(0,8).toUpperCase()}`;$('modal-city').textContent=p.city||'Not provided';$('modal-bio').textContent=p.bio||'No description added.';$('modal-status').textContent=online?'ONLINE':'OFFLINE';$('modal-status').className='status-pill '+(online?'online':'offline');$('modal-location').textContent=online&&loc?`${loc.address||`${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}`} · Saved location`:'Not currently visible';$('modal-chat').classList.toggle('hidden',uid===currentUser.uid);$('modal-chat').onclick=()=>{closeProfile();startChat(uid,p.name||'Driver')};$('profile-modal').classList.remove('hidden')}catch(e){alert(errorText(e))}}
function closeProfile(){$('profile-modal').classList.add('hidden')}$('close-profile').onclick=closeProfile;$('profile-modal').addEventListener('click',e=>{if(e.target===$('profile-modal'))closeProfile()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProfile()});

async function startChat(uid,name){if(uid===currentUser.uid)return;try{const blocks=await getDocs(query(collection(db,'blocks'),where('ownerUid','==',currentUser.uid),where('blockedUid','==',uid),limit(1)));if(!blocks.empty){alert('You have blocked this driver. Unblock them to send messages.');return}const id=[currentUser.uid,uid].sort().join('_'),ref=doc(db,'chats',id),snap=await getDoc(ref);if(!snap.exists())await setDoc(ref,{members:[currentUser.uid,uid],memberNames:{[currentUser.uid]:profile.name,[uid]:name},unreadCounts:{[currentUser.uid]:0,[uid]:0},lastMessage:'',updatedAt:serverTimestamp(),createdAt:serverTimestamp()});activeChat=id;activeOther={uid,name};$('chat-empty').classList.add('hidden');$('conversation-view').classList.remove('hidden');$('conversation-title').textContent=name;document.querySelector('[data-page="chat-page"]').click();listenMessages(id)}catch(e){alert(errorText(e))}}
function listenChats(){if(chatUnsub)chatUnsub();chatUnsub=onSnapshot(query(collection(db,'chats'),where('members','array-contains',currentUser.uid),limit(50)),snap=>{const box=$('chat-list');box.innerHTML='';if(snap.empty){box.innerHTML='<p class="muted">No conversations yet. Find a driver and select Chat.</p>';$('chat-count').textContent='';return}const rows=snap.docs.map(d=>({id:d.id,data:d.data()})).sort((a,b)=>(b.data.updatedAt?.toMillis?.()||0)-(a.data.updatedAt?.toMillis?.()||0));let totalUnread=0;rows.forEach(row=>{const c=row.data,other=c.members.find(x=>x!==currentUser.uid),name=c.memberNames?.[other]||'Driver',unread=Number(c.unreadCounts?.[currentUser.uid]||0);totalUnread+=unread;const el=document.createElement('button');el.type='button';el.className='chat-person';el.innerHTML=`<span class="avatar">${safe(initials(name))}</span><span class="chat-person-copy"><b>${safe(name)}</b><small class="muted">${safe(c.lastMessage||'Start chatting')}</small></span>${unread?`<span class="unread-badge">${unread>99?'99+':unread}</span>`:''}`;el.onclick=()=>{activeChat=row.id;activeOther={uid:other,name};$('chat-empty').classList.add('hidden');$('conversation-view').classList.remove('hidden');$('conversation-title').textContent=name;updateDoc(doc(db,'chats',row.id),{[`unreadCounts.${currentUser.uid}`]:0}).catch(console.warn);listenMessages(row.id)};box.append(el)});$('chat-count').textContent=totalUnread?`(${totalUnread>99?'99+':totalUnread})`:''},e=>{console.warn(e);$('chat-list').textContent=errorText(e)})}
$('conversation-title').title='Click to view driver profile';$('conversation-title').style.cursor='pointer';$('conversation-title').onclick=()=>{if(activeOther?.uid)viewProfile(activeOther.uid)};
function listenMessages(id){if(msgUnsub)msgUnsub();msgUnsub=onSnapshot(query(collection(db,'chats',id,'messages'),orderBy('createdAt','asc'),limit(100)),snap=>{const box=$('messages');box.innerHTML='';snap.forEach(d=>{const m=d.data(),el=document.createElement('div');el.className='bubble'+(m.senderUid===currentUser.uid?' mine':'');el.innerHTML=`${safe(m.text)}<small>${m.senderUid===currentUser.uid?'You':safe(activeOther?.name||'Driver')}</small>`;box.append(el)});box.scrollTop=box.scrollHeight;updateDoc(doc(db,'chats',id),{[`unreadCounts.${currentUser.uid}`]:0}).catch(()=>{})},e=>msg('conversation-title',errorText(e),true))}
$('send-form').onsubmit=async e=>{e.preventDefault();const text=$('message-input').value.trim();if(!text||!activeChat||!activeOther)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{const blocked=await getDocs(query(collection(db,'blocks'),where('ownerUid','==',activeOther.uid),where('blockedUid','==',currentUser.uid),limit(1)));if(!blocked.empty)throw new Error('This driver is not accepting messages from you.');const batch=writeBatch(db),messageRef=doc(collection(db,'chats',activeChat,'messages')),chatRef=doc(db,'chats',activeChat);batch.set(messageRef,{senderUid:currentUser.uid,text:text.slice(0,2000),createdAt:serverTimestamp()});batch.update(chatRef,{lastMessage:text.slice(0,100),updatedAt:serverTimestamp(),[`unreadCounts.${activeOther.uid}`]:increment(1)});await batch.commit();$('message-input').value=''}catch(x){alert(errorText(x))}finally{btn.disabled=false}};
$('block-user').onclick=async()=>{if(!activeOther||!confirm('Block this driver? They will no longer be able to message you.'))return;try{await setDoc(doc(db,'blocks',`${currentUser.uid}_${activeOther.uid}`),{ownerUid:currentUser.uid,blockedUid:activeOther.uid,createdAt:serverTimestamp()});alert('Driver blocked.')}catch(e){alert(errorText(e))}};
$('report-user').onclick=async()=>{if(!activeOther)return;const reason=prompt('Tell us why you are reporting this conversation:');if(!reason?.trim())return;try{await addDoc(collection(db,'reports'),{reporterUid:currentUser.uid,reportedUid:activeOther.uid,chatId:activeChat,reason:reason.trim().slice(0,500),createdAt:serverTimestamp(),status:'open'});alert('Report submitted. Thank you.')}catch(e){alert(errorText(e))}};
$('profile-form').onsubmit=async e=>{e.preventDefault();const name=$('profile-name').value.trim(),bio=$('profile-bio').value.trim(),phone=$('profile-phone').value.trim(),city=$('profile-city').value;if(!phoneValid(phone))return msg('profile-message','Enter a valid mobile number.',true);try{await updateDoc(doc(db,'users',currentUser.uid),{name,bio,phone,city,updatedAt:serverTimestamp()});await setDoc(doc(db,'publicProfiles',currentUser.uid),{uid:currentUser.uid,userId:profile.userId,name,bio,city,onlineStatus:profile.onlineStatus||'offline',savedLocation:profile.savedLocation||null,updatedAt:serverTimestamp()},{merge:true});await updateProfile(currentUser,{displayName:name});profile={...profile,name,bio,phone,city};$('user-chip').textContent=name;$('profile-avatar').textContent=initials(name);$('profile-summary-name').textContent=name;msg('profile-message','Profile saved. Your email and mobile number remain private.')}catch(x){msg('profile-message',errorText(x),true)}};
