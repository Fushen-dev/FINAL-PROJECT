// script.js — single module for merch, media, calendar (Firebase realtime)
// Usage: include as <script type="module" src="script.js"></script> on pages

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
  /* ===========================
     FIREBASE (Realtime DB)
     =========================== */
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

  /* ===========================
     YEAR IN FOOTERS
     =========================== */
  document.getElementById('year-home')?.textContent = new Date().getFullYear();
  document.getElementById('year-photo')?.textContent = new Date().getFullYear();
  document.getElementById('year-video')?.textContent = new Date().getFullYear();
  document.getElementById('year-merch')?.textContent = new Date().getFullYear();
  document.getElementById('year')?.textContent = new Date().getFullYear();

  /* ===========================
     PRODUCTS (Merch)
     Edit product objects to change pictures/prices/stripeLink
     =========================== */
  const products = [
    { id: 'shirt001', title: 'Huanger Films Tee', price: 25.00, img: 'assets/merch-shirt.jpg', stripeLink: '' },
    { id: 'print001', title: '8x10 Photo Print', price: 15.00, img: 'assets/8x10-print.jpg', stripeLink: '' }
  ];

  function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }

  function renderMerchGrid(){
    const grid = document.getElementById('merch-grid');
    if(!grid) return;
    grid.innerHTML = '';
    products.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.img}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none'">
        <h3 class="product-name">${escapeHtml(p.title)}</h3>
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <button class="pay-btn mockpay-btn">Buy (Mock)</button>
      `;
      grid.appendChild(card);
      card.querySelector('.mockpay-btn').addEventListener('click', ()=>{
        alert('Mock purchase: ' + p.title + ' — $' + p.price.toFixed(2));
      });
    });
  }
  renderMerchGrid();

  /* ===========================
     MEDIA (Photos & Videos)
     LocalStorage-based media collection for preview & local add
     =========================== */
  const defaultMedia = { photos: [], videos: [] };

  function loadLocalMedia(){
    const raw = localStorage.getItem('huanger_media_v1');
    if(!raw){ localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia)); return defaultMedia; }
    try{ return JSON.parse(raw); } catch(e){ localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia)); return defaultMedia; }
  }
  function saveLocalMedia(obj){ localStorage.setItem('huanger_media_v1', JSON.stringify(obj)); }

  function renderPhotos(){
    const grid = document.getElementById('photos-grid');
    if(!grid) return;
    const media = loadLocalMedia().photos;
    grid.innerHTML = '';
    media.forEach(m=>{
      const card = document.createElement('div'); card.className='photo-card';
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
      const card = document.createElement('div'); card.className='video-card';
      card.innerHTML = `<video controls src="${m.url}"></video><div class="media-title">${escapeHtml(m.title)}</div>`;
      grid.appendChild(card);
    });
  }
  renderPhotos();
  renderVideos();

  document.getElementById('add-photo-btn')?.addEventListener('click', ()=>{
    const title = document.getElementById('photo-title').value || 'Untitled';
    const fileEl = document.getElementById('photo-file');
    if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick an image file (local only).');
    const file = fileEl.files[0]; const reader = new FileReader();
    reader.onload = function(evt){
      const media = loadLocalMedia();
      const id = 'p' + Date.now();
      media.photos.unshift({id, title, url: evt.target.result});
      saveLocalMedia(media);
      renderPhotos();
      fileEl.value = ''; document.getElementById('photo-title').value = '';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('add-video-btn')?.addEventListener('click', ()=>{
    const title = document.getElementById('video-title').value || 'Untitled';
    const fileEl = document.getElementById('video-file');
    if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick a video file (local only).');
    const file = fileEl.files[0]; const reader = new FileReader();
    reader.onload = function(evt){
      const media = loadLocalMedia();
      const id = 'v' + Date.now();
      media.videos.unshift({id, title, url: evt.target.result});
      saveLocalMedia(media);
      renderVideos();
      fileEl.value = ''; document.getElementById('video-title').value = '';
    };
    reader.readAsDataURL(file);
  });

  /* ===========================
     CALENDAR (Firebase Realtime)
     - real-time bookings, mock-pay flow (client writes 'true' to bookings/date/hour)
     - works across all pages that include calendar markup
     =========================== */
  const START_HOUR = 7, END_HOUR = 20;
  let bookings = {}; // will be replaced by realtime listener

  // realtime listener
  onValue(ref(db, "bookings"), snap => {
    bookings = snap.exists() ? snap.val() : {};
    // if calendar elements exist — re-render
    if(document.getElementById('monthGrid') || document.getElementById('weekBody')) {
      renderCalendar(); // shared renderer
    }
  });

  // helper functions
  function pad(n){ return String(n).padStart(2,'0'); }
  function ymd(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function hourLabel(h){ return `${pad(h)}:00`; }
  function isBooked(date, hour){ return bookings?.[date]?.[hour] === true; }

  // calendar state (shared)
  let view = 'week';
  let cursor = new Date();

  // wire controls (if present)
  const monthBtn = document.getElementById('monthBtn');
  const weekBtn = document.getElementById('weekBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const labelEl = document.getElementById('label');
  const monthGrid = document.getElementById('monthGrid');
  const weekHeader = document.getElementById('weekHeader');
  const weekBody = document.getElementById('weekBody');
  const monthView = document.getElementById('monthView');
  const weekView = document.getElementById('weekView');

  monthBtn?.addEventListener('click', ()=> { view='month'; monthView && (monthView.style.display='block'); weekView && (weekView.style.display='none'); renderCalendar(); });
  weekBtn?.addEventListener('click', ()=> { view='week'; monthView && (monthView.style.display='none'); weekView && (weekView.style.display='block'); renderCalendar(); });
  prevBtn?.addEventListener('click', ()=> { if(view==='week') cursor.setDate(cursor.getDate()-7); else cursor.setMonth(cursor.getMonth()-1); renderCalendar(); });
  nextBtn?.addEventListener('click', ()=> { if(view==='week') cursor.setDate(cursor.getDate()+7); else cursor.setMonth(cursor.getMonth()+1); renderCalendar(); });

  // mock payment — writes to firebase
  function mockPay(date, hour){
    const ok = confirm(`Mock payment (no real money)\n\nBook ${date} @ ${hourLabel(hour)}?`);
    if(!ok) return;
    set(ref(db, `bookings/${date}/${hour}`), true);
    alert('Booking confirmed (mock).');
  }

  // render helper for calendar pages
  function renderCalendar(){
    if(view === 'month') renderMonth();
    else renderWeek();
  }

  // Month rendering (if monthGrid present)
  function renderMonth(){
    if(!monthGrid) return;
    monthGrid.innerHTML = '';
    labelEl && (labelEl.textContent = cursor.toLocaleString(undefined, { month:'long', year:'numeric' }));
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y,m,1);
    const startDay = first.getDay();
    const start = new Date(first); start.setDate(first.getDate() - startDay);
    for(let i=0;i<42;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const key = ymd(d);
      const card = document.createElement('div'); card.className='day-card';
      card.innerHTML = `<div class="day-num">${d.getDate()}</div><div class="small-muted">${d.toLocaleDateString(undefined,{weekday:'short'})}</div>`;
      const wrap = document.createElement('div'); wrap.style.marginTop='8px';
      for(let h = START_HOUR; h < Math.min(END_HOUR, START_HOUR+6); h++){
        const s = document.createElement('span');
        const booked = isBooked(key, h);
        s.className = 'slot ' + (booked ? 'booked' : 'available');
        s.textContent = hourLabel(h);
        if(!booked) s.addEventListener('click', ev=> { ev.stopPropagation(); mockPay(key,h); });
        wrap.appendChild(s);
      }
      card.appendChild(wrap);
      monthGrid.appendChild(card);
    }
  }

  // Week rendering (if weekHeader/weekBody present)
  function getWeekStart(d){
    const dd = new Date(d);
    const day = dd.getDay();
    const mon = new Date(dd);
    mon.setDate(dd.getDate() - (day===0 ? 6 : day-1));
    return mon;
  }

  function renderWeek(){
    if(!weekHeader || !weekBody) return;
    weekHeader.innerHTML = ''; weekBody.innerHTML = '';
    const mon = getWeekStart(cursor);
    const dates = [];
    const corner = document.createElement('div'); weekHeader.appendChild(corner);
    for(let i=0;i<7;i++){
      const dt = new Date(mon); dt.setDate(mon.getDate()+i); dates.push(dt);
      const th = document.createElement('div'); th.className='week-head'; th.textContent = dt.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'});
      weekHeader.appendChild(th);
    }
    labelEl && (labelEl.textContent = `${dates[0].toLocaleDateString()} — ${dates[6].toLocaleDateString()}`);
    for(let h=START_HOUR; h<END_HOUR; h++){
      const timeCell = document.createElement('div'); timeCell.className='time-cell'; timeCell.innerHTML = `<strong>${hourLabel(h)}</strong>`; weekBody.appendChild(timeCell);
      for(let i=0;i<7;i++){
        const key = ymd(dates[i]);
        const cell = document.createElement('div'); cell.className='day-col';
        const box = document.createElement('div');
        const booked = isBooked(key,h);
        if(booked){ box.className='hour-box hour-booked'; box.textContent='Booked'; }
        else { box.className='hour-box hour-available'; box.textContent='Available'; box.addEventListener('click', ()=> mockPay(key,h)); }
        cell.appendChild(box); weekBody.appendChild(cell);
      }
    }
  }

  // always try to render calendar if elements exist
  renderCalendar();

  /* ===========================
     expose for debugging
     =========================== */
  window._huanger = {
    products, renderMerchGrid, loadLocalMedia, saveLocalMedia, renderPhotos, renderVideos, renderCalendar
  };
});
