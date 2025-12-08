// script.js — unified module for merch, media, calendar (Firebase Realtime)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
  /* FIREBASE */
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

  /* FOOTER YEARS */
  ['year-home','year-photo','year-video','year-merch','year'].forEach(id => {
    document.getElementById(id)?.textContent = new Date().getFullYear();
  });

  /* MERCH (unchanged) */
  const products = [
    { id: 'shirt001', title: 'Huanger Films Tee', price: 25.00, img: 'assets/merch-shirt.jpg', stripeLink: '' },
    { id: 'print001', title: '8x10 Photo Print', price: 15.00, img: 'assets/8x10-print.jpg', stripeLink: '' }
  ];
  function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
  function renderMerchGrid(){
    const grid = document.getElementById('merch-grid'); if(!grid) return;
    grid.innerHTML = '';
    products.forEach(p=>{
      const card = document.createElement('div'); card.className='product-card';
      card.innerHTML =
        `<img src="${p.img}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none'">
         <h3 class="product-name">${escapeHtml(p.title)}</h3>
         <div class="product-price">$${p.price.toFixed(2)}</div>
         <button class="pay-btn mockpay-btn">Buy (Mock)</button>`;
      grid.appendChild(card);
      card.querySelector('.mockpay-btn').addEventListener('click', ()=> alert('Mock purchase: ' + p.title + ' — $' + p.price.toFixed(2)));
    });
  }
  renderMerchGrid();

  /* MEDIA (unchanged) */
  const defaultMedia = { photos: [], videos: [] };
  function loadLocalMedia(){ const raw = localStorage.getItem('huanger_media_v1'); if(!raw){ localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia)); return defaultMedia; } try{ return JSON.parse(raw); } catch(e){ localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia)); return defaultMedia; } }
  function saveLocalMedia(obj){ localStorage.setItem('huanger_media_v1', JSON.stringify(obj)); }
  function renderPhotos(){ const grid = document.getElementById('photos-grid'); if(!grid) return; const media = loadLocalMedia().photos; grid.innerHTML = ''; media.forEach(m=>{ const card = document.createElement('div'); card.className='photo-card'; card.innerHTML = `<img src="${m.url}" alt="${escapeHtml(m.title)}"><div class="media-title">${escapeHtml(m.title)}</div>`; grid.appendChild(card); }); }
  function renderVideos(){ const grid = document.getElementById('videos-grid'); if(!grid) return; const media = loadLocalMedia().videos; grid.innerHTML = ''; media.forEach(m=>{ const card = document.createElement('div'); card.className='video-card'; card.innerHTML = `<video controls src="${m.url}"></video><div class="media-title">${escapeHtml(m.title)}</div>`; grid.appendChild(card); }); }
  renderPhotos(); renderVideos();

  document.getElementById('add-photo-btn')?.addEventListener('click', ()=>{
    const title = document.getElementById('photo-title')?.value || 'Untitled';
    const fileEl = document.getElementById('photo-file'); if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick an image file (local only).');
    const file = fileEl.files[0]; const reader = new FileReader();
    reader.onload = function(evt){ const media = loadLocalMedia(); const id = 'p' + Date.now(); media.photos.unshift({id, title, url: evt.target.result}); saveLocalMedia(media); renderPhotos(); fileEl.value = ''; document.getElementById('photo-title').value = ''; };
    reader.readAsDataURL(file);
  });

  document.getElementById('add-video-btn')?.addEventListener('click', ()=>{
    const title = document.getElementById('video-title')?.value || 'Untitled';
    const fileEl = document.getElementById('video-file'); if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick a video file (local only).');
    const file = fileEl.files[0]; const reader = new FileReader();
    reader.onload = function(evt){ const media = loadLocalMedia(); const id = 'v' + Date.now(); media.videos.unshift({id, title, url: evt.target.result}); saveLocalMedia(media); renderVideos(); fileEl.value = ''; document.getElementById('video-title').value = ''; };
    reader.readAsDataURL(file);
  });

  /* CALENDAR */
  const START_HOUR = 7, END_HOUR = 20;
  let bookings = {};

  // listen for realtime bookings and re-render when they change
  onValue(ref(db, "bookings"), snap => {
    bookings = snap.exists() ? snap.val() : {};
    renderCalendar();
  });

  // helpers
  function pad(n){ return String(n).padStart(2,'0'); }
  function ymd(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function hourLabel(h){ return `${pad(h)}:00`; }
  function isBooked(date, hour){ return bookings?.[date]?.[hour] === true; }

  // check cancellation rule: must be at least 1 full day before booking date
  function canCancel(dateStr){
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    const diffDays = (d - today) / (1000*60*60*24);
    return diffDays >= 1;
  }

  // booking write (Firebase authoritative)
  function bookSlot(dateStr, hour){
    const ok = confirm(`Book ${dateStr} @ ${hourLabel(hour)}? (Mock payment)`);
    if(!ok) return;
    // write to firebase — on success the realtime onValue will update bookings and UI
    set(ref(db, `bookings/${dateStr}/${hour}`), true)
      .then(()=> {
        // optional: show a confirmation; UI will update when DB emits new state
        alert('Booking confirmed!');
      })
      .catch(err=>{
        console.error('Firebase write error:', err);
        alert('Booking failed — check console for details.');
      });
  }

  function cancelSlot(dateStr, hour){
    if(!canCancel(dateStr)){ alert('You may only cancel at least 1 day before the booking.'); return; }
    const ok = confirm(`Cancel booking ${dateStr} @ ${hourLabel(hour)}?`);
    if(!ok) return;
    remove(ref(db, `bookings/${dateStr}/${hour}`))
      .then(()=> alert('Cancellation confirmed!'))
      .catch(err=> { console.error('Cancel error:', err); alert('Cancellation failed — check console.'); });
  }

  // state + refs
  let view = 'week';
  let cursor = new Date();
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

  monthBtn?.addEventListener('click', ()=> { view='month'; if(monthView) monthView.style.display='block'; if(weekView) weekView.style.display='none'; renderCalendar(); });
  weekBtn?.addEventListener('click', ()=> { view='week'; if(monthView) monthView.style.display='none'; if(weekView) weekView.style.display='block'; renderCalendar(); });
  prevBtn?.addEventListener('click', ()=> { if(view==='week') cursor.setDate(cursor.getDate()-7); else cursor.setMonth(cursor.getMonth()-1); renderCalendar(); });
  nextBtn?.addEventListener('click', ()=> { if(view==='week') cursor.setDate(cursor.getDate()+7); else cursor.setMonth(cursor.getMonth()+1); renderCalendar(); });

  function renderCalendar(){ view==='week' ? renderWeek(): renderMonth(); }

  // MONTH
  function renderMonth(){
    if(!monthGrid) return;
    monthGrid.innerHTML = '';
    labelEl && (labelEl.textContent = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' }));

    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startDay = first.getDay();
    const start = new Date(first);
    start.setDate(first.getDate() - startDay);

    for (let i = 0; i < 42; i++){
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = ymd(d);

      const card = document.createElement('div');
      card.className = 'day-card';
      card.innerHTML = `<div class="day-num">${d.getDate()}</div><div class="day-week">${d.toLocaleDateString(undefined, { weekday: 'short' })}</div>`;

      const wrap = document.createElement('div');
      wrap.style.marginTop = '10px';

      // show a compact subset of hours in month (change to full by replacing END_HOUR)
      for (let h = START_HOUR; h < Math.min(END_HOUR, START_HOUR + 6); h++){
        const booked = isBooked(key, h);
        const slot = document.createElement('div');
        slot.className = 'slot ' + (booked ? 'booked' : 'available');
        
        if (booked) {
          slot.innerHTML = ''; // Clear text content
          const label = document.createElement('div');
          label.textContent = 'Booked';
          label.style.marginBottom = '4px';
          slot.appendChild(label);
          
          // Cancel is only allowed if canCancel && booked
          if (canCancel(key)){
            const btn = document.createElement('button');
            btn.className = 'cancel-btn';
            btn.textContent = '✕ Cancel';
            btn.onclick = (ev) => { ev.stopPropagation(); cancelSlot(key, h); };
            slot.appendChild(btn);
          } else {
            const note = document.createElement('div');
            note.textContent = '(Non-refundable)';
            note.style.fontSize = '10px';
            note.style.color = '#999';
            note.style.marginTop = '4px';
            slot.appendChild(note);
          }
        } else {
          slot.textContent = hourLabel(h);
          // Available slots allow booking - THIS IS THE KEY FIX
          slot.addEventListener('click', () => { bookSlot(key, h); });
        }

        wrap.appendChild(slot);
      }

      card.appendChild(wrap);
      monthGrid.appendChild(card);
    }
  }

  // WEEK
  function getWeekStart(d){
    const dd = new Date(d);
    const day = dd.getDay();
    const monday = new Date(dd);
    monday.setDate(dd.getDate() - (day === 0 ? 6 : day - 1));
    return monday;
  }

  function renderWeek(){
    if(!weekHeader || !weekBody) return;
    weekHeader.innerHTML = '';
    weekBody.innerHTML = '';

    const monday = getWeekStart(cursor);
    const dates = [];

    // corner cell
    const corner = document.createElement('div');
    weekHeader.appendChild(corner);

    for (let i = 0; i < 7; i++){
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      dates.push(dt);

      const head = document.createElement('div');
      head.className = 'week-head';
      head.textContent = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      weekHeader.appendChild(head);
    }

    labelEl && (labelEl.textContent = `${dates[0].toLocaleDateString()} — ${dates[6].toLocaleDateString()}`);

    for (let h = START_HOUR; h < END_HOUR; h++){
      const timeCol = document.createElement('div');
      timeCol.className = 'time-cell';
      timeCol.innerHTML = `<strong>${hourLabel(h)}</strong>`;
      weekBody.appendChild(timeCol);

      for (let i = 0; i < 7; i++){
        const key = ymd(dates[i]);
        const cell = document.createElement('div');
        cell.className = 'day-col';

        const booked = isBooked(key, h);
        const box = document.createElement('div');
        box.className = booked ? 'hour-box hour-booked' : 'hour-box hour-available';
        box.textContent = booked ? 'Booked' : 'Available';

        if (booked){
          box.innerHTML = ''; // Clear content
          const label = document.createElement('div');
          label.textContent = 'Booked';
          label.style.marginBottom = '8px';
          box.appendChild(label);
          
          // allow cancellation via button only if cancellation rule permits
          if (canCancel(key)){
            const btn = document.createElement('button');
            btn.className = 'cancel-btn';
            btn.textContent = '✕ Cancel Booking';
            btn.style.fontSize = '12px';
            btn.onclick = (ev) => { ev.stopPropagation(); cancelSlot(key, h); };
            box.appendChild(btn);
          } else {
            const note = document.createElement('div');
            note.textContent = 'Cannot cancel';
            note.style.fontSize = '11px';
            note.style.color = '#999';
            box.appendChild(note);
          }
        } else {
          // THIS IS THE KEY FIX - use addEventListener instead of onclick
          box.addEventListener('click', () => { bookSlot(key, h); });
        }

        cell.appendChild(box);
        weekBody.appendChild(cell);
      }
    }
  }

  // initial render
  renderCalendar();

  // expose for debugging
  window._huanger = { products, renderMerchGrid, loadLocalMedia, saveLocalMedia, renderPhotos, renderVideos, renderCalendar };
});
