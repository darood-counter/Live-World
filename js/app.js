import { auth, db, firebaseReady } from "./firebase.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged,
  updateProfile, sendEmailVerification, sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = id => document.getElementById(id);
const authView = $("auth-view"), profileView = $("profile-view");
$("year").textContent = new Date().getFullYear();

function message(id, text, error=false) {
  const el=$(id); el.textContent=text; el.classList.toggle("error",error);
}
function initials(name="LW") {
  return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase() || "LW";
}
function showLogin() { authView.classList.remove("hidden"); profileView.classList.add("hidden"); }
function showProfile() { authView.classList.add("hidden"); profileView.classList.remove("hidden"); }
function friendlyError(err) {
  const map = {
    "auth/email-already-in-use":"This email is already registered.",
    "auth/invalid-email":"Please enter a valid email address.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/user-not-found":"No account was found for this email.",
    "auth/wrong-password":"Email or password is incorrect.",
    "auth/weak-password":"Please use a stronger password (at least 8 characters).",
    "auth/too-many-requests":"Too many attempts. Please try again later.",
    "auth/network-request-failed":"Network error. Check your internet connection.",
    "auth/operation-not-allowed":"Enable Email/Password sign-in in Firebase Authentication."
  };
  return map[err.code] || err.message || "Something went wrong.";
}
function setBusy(form, busy) {
  const btn=form.querySelector('button[type="submit"]');
  if(btn){if(!btn.dataset.original) btn.dataset.original=btn.textContent;btn.disabled=busy;btn.textContent=busy?"Please wait…":btn.dataset.original;}
}

$("login-tab").addEventListener("click",()=> {
  $("login-tab").classList.add("active"); $("signup-tab").classList.remove("active");
  $("login-form").classList.remove("hidden"); $("signup-form").classList.add("hidden"); message("auth-message","");
});
$("signup-tab").addEventListener("click",()=> {
  $("signup-tab").classList.add("active"); $("login-tab").classList.remove("active");
  $("signup-form").classList.remove("hidden"); $("login-form").classList.add("hidden"); message("auth-message","");
});

$("login-form").addEventListener("submit", async e=>{
  e.preventDefault(); const form=e.currentTarget; setBusy(form,true); message("auth-message","");
  try {
    await signInWithEmailAndPassword(auth,$("login-email").value.trim(),$("login-password").value);
  } catch(err){ message("auth-message",friendlyError(err),true); }
  finally { setBusy(form,false); }
});

$("signup-form").addEventListener("submit", async e=>{
  e.preventDefault(); const form=e.currentTarget; setBusy(form,true); message("auth-message","");
  const name=$("signup-name").value.trim(), email=$("signup-email").value.trim(), phone=$("signup-phone").value.trim();
  const password=$("signup-password").value, confirm=$("signup-confirm").value;
  if(password!==confirm){message("auth-message","Passwords do not match.",true);setBusy(form,false);return;}
  try {
    const cred=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(cred.user,{displayName:name});
    await setDoc(doc(db,"users",cred.user.uid),{
      uid:cred.user.uid, userId:cred.user.uid.slice(0,8).toUpperCase(),
      name, email, phone, country:"", city:"", bio:"",
      photoURL:"", createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
      profileComplete:true, accountStatus:"active"
    });
    await sendEmailVerification(cred.user);
    message("auth-message","Account created. A verification email has been sent.");
  } catch(err){ message("auth-message",friendlyError(err),true); }
  finally { setBusy(form,false); }
});

$("forgot-button").addEventListener("click",async()=>{
  const email=$("login-email").value.trim();
  if(!email){message("auth-message","Enter your email first, then select Forgot password.",true);return;}
  try{await sendPasswordResetEmail(auth,email);message("auth-message","Password reset email sent. Check your inbox.");}
  catch(err){message("auth-message",friendlyError(err),true);}
});

async function renderProfile(user) {
  showProfile();
  let data={};
  try {
    const snap=await getDoc(doc(db,"users",user.uid));
    if(snap.exists()) data=snap.data();
    else {
      data={uid:user.uid,userId:user.uid.slice(0,8).toUpperCase(),name:user.displayName||"",email:user.email||"",phone:"",country:"",city:"",bio:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp(),accountStatus:"active"};
      await setDoc(doc(db,"users",user.uid),data);
    }
  } catch(err){ message("profile-message","Could not load profile: "+friendlyError(err),true); }
  const name=data.name||user.displayName||"Live World User";
  $("profile-name").textContent=name; $("profile-email").textContent=user.email||"";
  $("profile-uid").textContent=data.userId||user.uid;
  $("avatar").textContent=initials(name);
  $("edit-name").value=data.name||user.displayName||"";
  $("edit-phone").value=data.phone||"";
  $("edit-country").value=data.country||"";
  $("edit-city").value=data.city||"";
  $("edit-bio").value=data.bio||"";
  $("verify-button").textContent=user.emailVerified?"Email verified":"Send verification email";
  $("verify-button").disabled=user.emailVerified;
}

$("profile-form").addEventListener("submit",async e=>{
  e.preventDefault(); const user=auth.currentUser; if(!user)return;
  const name=$("edit-name").value.trim();
  if(!name){message("profile-message","Name is required.",true);return;}
  try{
    await updateDoc(doc(db,"users",user.uid),{
      name,phone:$("edit-phone").value.trim(),country:$("edit-country").value.trim(),
      city:$("edit-city").value.trim(),bio:$("edit-bio").value.trim(),updatedAt:serverTimestamp()
    });
    await updateProfile(user,{displayName:name});
    $("profile-name").textContent=name; $("avatar").textContent=initials(name);
    message("profile-message","Profile updated successfully.");
  }catch(err){message("profile-message",friendlyError(err),true);}
});

$("verify-button").addEventListener("click",async()=>{
  try{await sendEmailVerification(auth.currentUser);message("profile-message","Verification email sent.");}
  catch(err){message("profile-message",friendlyError(err),true);}
});
$("logout-button").addEventListener("click",async()=>{
  try{await signOut(auth);message("auth-message","You have been logged out.");showLogin();}
  catch(err){message("profile-message",friendlyError(err),true);}
});

if(!firebaseReady){
  showLogin();
  message("auth-message","Setup required: add Firebase Web App settings in js/firebase-config.js, then reload.",true);
} else {
  onAuthStateChanged(auth,user=>{
    if(user) renderProfile(user);
    else showLogin();
  });
}
