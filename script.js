// script.js — Calendar with checkout integration
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
  // FIREBASE
  const firebaseConfig = {
    apiKey: "AIzaSyDB4SOUmddsEbhs_HHsrRGUBDX5PLU9hiE",
    authDomain: "huanger-films.firebaseapp.com",
    databaseURL: "https://huanger-films-default-rtdb.firebaseio.com",
    projectId: "huanger-films",
    storageBucket: "huanger-films.firebasestorage.app",
    messagingSenderId: "790500951380",
    appId: "1:790500951380:web:c8a93a4b21caef24d174c1"
  };
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // FOOTER YEAR
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  /* MEDIA */
  const defaultMedia = { 
    photos: [
      {
        id: 'hockey1',
        title: 'Hockey Game Action - Player 13',
        url: 'images/hockey-game-1.jpg'
      },
      {
        id: 'keychain',
        title: 'Cross Keychain',
        url: 'images/keychain.jpg'
      },
      {
        id: 'hockey2',
        title: 'Hockey Game Defense',
        url: 'images/hockey-game-2.jpg'
      }
    ], 
    videos: [] 
  };

  function loadLocalMedia(){ 
    const raw = localStorage.getItem('huanger_media_v1'); 
    if(!raw){ 
      localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia)); 
      return defaultMedia; 
    } 
    try{ 
      return JSON.parse(raw); 
    } catch(e){ 
      localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia)); 
      return defaultMedia; 
    } 
  }
  
  function saveLocalMedia(obj){ 
    localStorage.setItem('huanger_media_v1', JSON.stringify(obj)); 
  }

  function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
  
  function renderPhotos(){ 
    const grid = document.getElementById('photos-grid'); 
    if(!grid) return; 
    const media = loadLocalMedia().photos; 
    grid.innerHTML = ''; 
    media.forEach(m=>{ 
      const card = document.createElement('div'); 
      card.className='photo-card'; 
      card.innerHTML = `<img src="${m.url}" alt="${escapeHtml(m.title)}"><div class="media-title">${escapeHtml(m.title)}</div>`; 
      grid.appendChild(card); 
    }); 
  }
  
  function renderVideos(){ 
    const grid = document.getElementById('videos-grid'); 
    if(!grid) return; 
    const media = loadLocalMedia().videos; 
    grid.innerHTML = ''; 
    media.forEach(m=>{ 
      const card = document.createElement('div'); 
      card.className='video-card'; 
      card.innerHTML = `<video controls src="${m.url}"></video><div class="media-title">${escapeHtml(m.title)}</div>`; 
      grid.appendChild(card); 
    }); 
  }
  
  renderPhotos(); 
  renderVideos();

  const photoBtn = document.getElementById('add-photo-btn');
  if(photoBtn){
    photoBtn.addEventListener('click', ()=>{
      const title = document.getElementById('photo-title')?.value || 'Untitled';
      const fileEl = document.getElementById('photo-file'); 
      if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick an image file (local only).');
      const file = fileEl.files[0]; 
      const reader = new FileReader();
      reader.onload = function(evt){ 
        const media = loadLocalMedia(); 
        const id = 'p' + Date.now(); 
        media.photos.unshift({id, title, url: evt.target.result}); 
        saveLocalMedia(media); 
        renderPhotos(); 
        fileEl.value = ''; 
        const titleEl = document.getElementById('photo-title');
        if(titleEl) titleEl.value = ''; 
      };
      reader.readAsDataURL(file);
    });
  }

  const videoBtn = document.getElementById('add-video-btn');
  if(videoBtn){
    videoBtn.addEventListener('click', ()=>{
      const title = document.getElementById('video-title')?.value || 'Untitled';
      const fileEl = document.getElementById('video-file'); 
      if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick a video file (local only).');
      const file = fileEl.files[0]; 
      const reader = new FileReader();
      reader.onload = function(evt){ 
        const media = loadLocalMedia(); 
        const id = 'v' + Date.now(); 
        media.videos.unshift({id, title, url: evt.target.result}); 
        saveLocalMedia(media); 
        renderVideos(); 
        fileEl.value = ''; 
        const titleEl = document.getElementById('video-title');
        if(titleEl) titleEl.value = ''; 
      };
      reader.readAsDataURL(file);
    });
  }

  // CALENDAR
  const START_HOUR = 7;
  const END_HOUR = 20;
  const BOOKING_PRICE = 150.00;
  let bookings = {};
  let isAdmin = false;
  let pendingBooking = null;

  // Admin login button
  const adminBtn = document.getElementById('adminBtn');
  if(adminBtn){
    adminBtn.addEventListener('click', ()=> {
      const password = prompt('Enter admin password:');
      if(password === 'huanger2024'){
        isAdmin = true;
        alert('Admin mode enabled - you can now see booking details');
        adminBtn.textContent = '🔓 Admin (ON)';
        adminBtn.style.background = '#00c977';
        renderCalendar();
      } else {
        alert('Incorrect password');
      }
    });
  }

  onValue(ref(db, "bookings"), snap => {
    bookings = snap.exists() ? snap.val() : {};
    renderCalendar();
  });

  function pad(n){ return String(n).padStart(2,'0'); }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function hourLabel(h){ return pad(h) + ':00'; }
  
  function isBooked(date, hour){ 
    if(!bookings || !bookings[date] || !bookings[date][hour]) return false;
    return bookings[date][hour] === true || bookings[date][hour].booked === true;
  }

  function canCancel(dateStr){
    const today = new Date(); 
    today.setHours(0,0,0,0);
    const d = new Date(dateStr); 
    d.setHours(0,0,0,0);
    const diffDays = (d - today) / (1000*60*60*24);
    return diffDays >= 1;
  }

  function bookSlot(dateStr, hour){
    pendingBooking = { 
      date: dateStr, 
      hour: hour,
      dateTime: `${dateStr} @ ${hourLabel(hour)}`
    };
    
    if(typeof checkout !== 'undefined'){
      checkout.addToCart({
        id: 'booking-' + Date.now(),
        name: 'Video Session: ' + pendingBooking.dateTime,
        price: BOOKING_PRICE,
        type: 'booking',
        bookingData: pendingBooking
      });
    } else {
      const name = prompt('Enter your full name:');
      if(!name || name.trim() === '') return;
      
      const address = prompt('Enter the event location/address:');
      if(!address || address.trim() === '') return;
      
      confirmBooking(d
