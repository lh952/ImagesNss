// Image Library - Firebase powered public image gallery.
// 1) Create a Firebase project.
// 2) Enable Authentication > Anonymous, Firestore and Storage.
// 3) Paste your Firebase web config below.
// 4) Deploy this folder to GitHub Pages or another static host.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7mPzZNeeoyEIDexN3Cq7ddkKKumEWPPk",
  authDomain: "imagegnss.firebaseapp.com",
  projectId: "imagegnss",
  storageBucket: "imagegnss.firebasestorage.app",
  messagingSenderId: "804797018278",
  appId: "1:804797018278:web:7ce030b393eada4e120467",
  measurementId: "G-8VL3SC7LRJ"
};
// Upload gate requested by the site owner.
// Important: a password embedded in frontend JavaScript is NOT a secure server-side secret.
// For a production site, use a server/Cloud Function to verify upload credentials.
const UPLOAD_PASSWORD = "333784";

const CATEGORIES = ["All","Logos","Posters","Certificates","NSS","College","Events","Nature","Education","Others"];

let app, auth, db, storage;
let allImages = [];
let activeCategory = "All";

const $ = id => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

function escapeHtml(value="") {
  return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function renderFilters() {
  $("categoryFilters").innerHTML = CATEGORIES.map(c =>
    `<button class="filter ${c===activeCategory?'active':''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join("");
  document.querySelectorAll(".filter").forEach(btn => btn.onclick = () => {
    activeCategory = btn.dataset.category;
    renderFilters();
    renderGallery();
  });
}

function matches(item) {
  const q = $("searchInput").value.trim().toLowerCase();
  const cat = activeCategory === "All" || item.category === activeCategory;
  const hay = `${item.title||""} ${item.category||""} ${item.keywords||""}`.toLowerCase();
  return cat && (!q || hay.includes(q));
}

function renderGallery() {
  const list = allImages.filter(matches);
  $("resultCount").textContent = `${list.length} image${list.length===1?'':'s'} available`;
  $("emptyState").classList.toggle("hidden", list.length !== 0);
  $("gallery").innerHTML = list.map(item => `
    <article class="image-card">
      <div class="thumb" data-id="${item.id}"><img loading="lazy" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title)}"></div>
      <div class="card-body">
        <div class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="meta">${escapeHtml(item.category)}${item.keywords ? " • "+escapeHtml(item.keywords) : ""}</div>
        <div class="card-actions">
          <button class="btn" data-preview="${item.id}">Preview</button>
          <a class="btn btn-primary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener" download>↓ Download</a>
        </div>
      </div>
    </article>`).join("");

  document.querySelectorAll("[data-preview]").forEach(b => b.onclick = () => openPreview(b.dataset.preview));
  document.querySelectorAll(".thumb").forEach(b => b.onclick = () => openPreview(b.dataset.id));
}

function openPreview(id) {
  const item = allImages.find(x => x.id === id);
  if (!item) return;
  $("previewImage").src = item.url;
  $("previewImage").alt = item.title;
  $("previewTitle").textContent = item.title;
  $("previewMeta").textContent = `${item.category}${item.keywords ? " • "+item.keywords : ""}`;
  $("downloadBtn").href = item.url;
  $("downloadBtn").download = item.title.replace(/\s+/g,"-") || "image";
  $("previewModal").classList.remove("hidden");
}

function closePreview(){ $("previewModal").classList.add("hidden"); }

function openUpload(){ $("uploadModal").classList.remove("hidden"); $("passwordInput").focus(); }
function closeUpload(){ $("uploadModal").classList.add("hidden"); }

$("uploadBtn").onclick = openUpload;
document.querySelectorAll("[data-close]").forEach(x => x.onclick = closeUpload);
document.querySelectorAll("[data-close-preview]").forEach(x => x.onclick = closePreview);
$("searchInput").addEventListener("input", renderGallery);

$("passwordForm").addEventListener("submit", e => {
  e.preventDefault();
  if ($("passwordInput").value === UPLOAD_PASSWORD) {
    $("loginPanel").classList.add("hidden");
    $("uploadPanel").classList.remove("hidden");
    $("passwordError").textContent = "";
  } else {
    $("passwordError").textContent = "Password गलत है।";
  }
});

$("imageFile").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  $("uploadPreview").innerHTML = `<img src="${url}" alt="Preview">`;
  $("uploadPreview").classList.remove("hidden");
});

async function initFirebase() {
  try {
    const notConfigured = Object.values(firebaseConfig).some(v => String(v).includes("PASTE_YOUR"));
    if (notConfigured) throw new Error("Firebase web config अभी set नहीं है।");
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    await signInAnonymously(auth);
    await loadImages();
    window.firebaseReady = true;
  } catch (err) {
    console.error(err);
    $("resultCount").textContent = "Firebase configuration required";
    $("gallery").innerHTML = `
      <div style="grid-column:1/-1;background:#fff;border:1px solid #fecdca;padding:20px;border-radius:14px">
        <strong>Setup बाकी है</strong><br>
        <span style="color:#667085;font-size:13px">app.js में Firebase web configuration डालें और Firebase Authentication, Firestore तथा Storage enable करें।</span>
      </div>`;
  }
}

async function loadImages() {
  const q = query(collection(db, "images"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allImages = snap.docs.map(d => ({id:d.id, ...d.data()}));
  renderGallery();
}

$("uploadForm").addEventListener("submit", async e => {
  e.preventDefault();
  const file = $("imageFile").files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    $("uploadStatus").textContent = "कृपया image file चुनें।";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    $("uploadStatus").textContent = "Maximum file size 10 MB है।";
    return;
  }
  if (!storage || !db || !auth?.currentUser) {
    $("uploadStatus").textContent = "Upload service तैयार नहीं है। पहले Firebase configuration, Anonymous Auth, Storage और Firestore setup करें।";
    return;
  }
  $("publishBtn").disabled = true;
  $("uploadStatus").textContent = "Image upload हो रही है… 0%";

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `images/${Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, {contentType:file.type});
    await new Promise((resolve, reject) => {
      uploadTask.on("state_changed", snapshot => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        $("uploadStatus").textContent = `Image upload हो रही है… ${pct}%`;
      }, reject, resolve);
    });
    $("uploadStatus").textContent = "Image upload complete. Details save हो रहे हैं…";
    const url = await getDownloadURL(storageRef);

    const docRef = await addDoc(collection(db, "images"), {
      title: $("imageTitle").value.trim(),
      category: $("imageCategory").value,
      keywords: $("imageKeywords").value.trim(),
      url,
      storagePath: path,
      originalName: file.name,
      size: file.size,
      type: file.type,
      createdAt: serverTimestamp()
    });

    allImages.unshift({
      id: docRef.id,
      title: $("imageTitle").value.trim(),
      category: $("imageCategory").value,
      keywords: $("imageKeywords").value.trim(),
      url
    });

    renderGallery();
    $("uploadStatus").textContent = "✓ Image successfully published!";
    $("uploadForm").reset();
    $("uploadPreview").classList.add("hidden");
  } catch (err) {
    console.error("Upload error:", err);
    const code = err?.code || "unknown";
    const messages = {
      "storage/unauthorized": "Storage permission denied. Firebase Storage Rules में upload permission दें।",
      "storage/unauthenticated": "Authentication नहीं हुई। Firebase Anonymous Authentication enable करें।",
      "storage/quota-exceeded": "Firebase Storage quota समाप्त हो गया है।",
      "storage/unknown": "Storage में unexpected error आया। Firebase console और network check करें।",
      "permission-denied": "Firestore permission denied. Firestore Rules में write permission दें।",
      "unavailable": "Firebase temporarily unavailable या internet connection कमजोर है।",
      "auth/operation-not-allowed": "Firebase Console में Anonymous Authentication enable करें।",
      "auth/network-request-failed": "Authentication network error. Internet connection check करें।"
    };
    $("uploadStatus").textContent = `${messages[code] || `Upload नहीं हुआ (${code}). Firebase configuration/rules check करें।`}`;
  } finally {
    $("publishBtn").disabled = false;
  }
});

renderFilters();
initFirebase();
