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
        url: 'hockey-game-1.JPG'
      },
      {
        id: 'keychain',
        title: 'Cross Keychain',
        url: 'keychain.JPG'
      },
      {
        id: 'hockey2',
        title: 'Hockey Game Defense',
        url: 'hockey-game-2.JPG'
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

  // PRICE UPDATED TO $50
  const BOOKING_PRICE = 50.00;

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
      
      confirmBooking(dateStr, hour, name, address);
    }
  }

  window.confirmBookingFromCheckout = function(bookingData, customerInfo) {
    const { date, hour } = bookingData;
    const { fullName, email, address } = customerInfo;
    
    set(ref(db, 'bookings/' + date + '/' + hour), {
      booked: true,
      name: fullName,
      email: email,
      address: address,
      timestamp: Date.now()
    })
      .then(()=> {
        console.log('Booking confirmed in Firebase');
      })
      .catch(err=> {
        console.error('Firebase booking error:', err);
      });
  };

  function confirmBooking(dateStr, hour, name, address){
    set(ref(db, 'bookings/' + dateStr + '/' + hour), {
      booked: true,
      name: name.trim(),
      address: address.trim(),
      timestamp: Date.now()
    })
      .then(()=> alert('Booking confirmed for ' + name + '!'))
      .catch(err=> { console.error(err); alert('Booking failed'); });
  }

  function cancelSlot(dateStr, hour){
    if(!canCancel(dateStr)){ 
      alert('You may only cancel at least 1 day before the booking.'); 
      return; 
    }
    const ok = confirm('Cancel booking ' + dateStr + ' @ ' + hourLabel(hour) + '?');
    if(!ok) return;
    remove(ref(db, 'bookings/' + dateStr + '/' + hour))
      .then(()=> alert('Cancellation confirmed!'))
      .catch(err=> { console.error(err); alert('Cancellation failed'); });
  }

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

  if(monthBtn) monthBtn.addEventListener('click', ()=> { 
    view='month'; 
    if(monthView) monthView.style.display='block'; 
    if(weekView) weekView.style.display='none'; 
    renderCalendar(); 
  });
  
  if(weekBtn) weekBtn.addEventListener('click', ()=> { 
    view='week'; 
    if(monthView) monthView.style.display='none'; 
    if(weekView) weekView.style.display='block'; 
    renderCalendar(); 
  });
  
  if(prevBtn) prevBtn.addEventListener('click', ()=> { 
    if(view==='week') cursor.setDate(cursor.getDate()-7); 
    else cursor.setMonth(cursor.getMonth()-1); 
    renderCalendar(); 
  });
  
  if(nextBtn) nextBtn.addEventListener('click', ()=> { 
    if(view==='week') cursor.setDate(cursor.getDate()+7); 
    else cursor.setMonth(cursor.getMonth()+1); 
    renderCalendar(); 
  });

  function renderCalendar(){ 
    if(view==='week') renderWeek(); 
    else renderMonth(); 
  }

  function renderMonth(){
    if(!monthGrid) return;
    monthGrid.innerHTML = '';
    if(labelEl) labelEl.textContent = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });

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
      card.innerHTML = '<div class="day-num">' + d.getDate() + '</div><div class="day-week">' + d.toLocaleDateString(undefined, { weekday: 'short' }) + '</div>';

      const wrap = document.createElement('div');
      wrap.style.marginTop = '10px';

      for (let h = START_HOUR; h < Math.min(END_HOUR, START_HOUR + 6); h++){
        const booked = isBooked(key, h);
        const slot = document.createElement('div');
        slot.className = 'slot ' + (booked ? 'booked' : 'available');
        
        if (booked) {
          slot.innerHTML = '';
          const label = document.createElement('div');
          label.textContent = 'Booked';
          label.style.marginBottom = '4px';
          slot.appendChild(label);
          
          if(isAdmin){
            const data = bookings[key][h];
            if(data && data.name){
              const details = document.createElement('div');
              details.style.fontSize = '10px';
              details.style.color = '#aaa';
              details.style.marginTop = '4px';
              details.innerHTML = '<strong>' + data.name + '</strong><br>' + data.address;
              slot.appendChild(details);
            }
          }
          
          if (canCancel(key)){
            const btn = document.createElement('button');
            btn.className = 'cancel-btn';
            btn.textContent = '✕ Cancel';
            btn.addEventListener('click', function(ev){ 
              ev.stopPropagation(); 
              cancelSlot(key, h); 
            });
            slot.appendChild(btn);
          }
        } else {
          slot.textContent = hourLabel(h);
          slot.addEventListener('click', function(){ 
            bookSlot(key, h); 
          });
        }

        wrap.appendChild(slot);
      }

      card.appendChild(wrap);
      monthGrid.appendChild(card);
    }
  }

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

    if(labelEl) labelEl.textContent = dates[0].toLocaleDateString() + ' — ' + dates[6].toLocaleDateString();

    for (let h = START_HOUR; h < END_HOUR; h++){
      const timeCol = document.createElement('div');
      timeCol.className = 'time-cell';
      timeCol.innerHTML = '<strong>' + hourLabel(h) + '</strong>';
      weekBody.appendChild(timeCol);

      for (let i = 0; i < 7; i++){
        const key = ymd(dates[i]);
        const cell = document.createElement('div');
        cell.className = 'day-col';

        const booked = isBooked(key, h);
        const box = document.createElement('div');
        box.className = booked ? 'hour-box hour-booked' : 'hour-box hour-available';

        if (booked){
          box.innerHTML = '';
          const label = document.createElement('div');
          label.textContent = 'Booked';
          label.style.marginBottom = '8px';
          box.appendChild(label);
          
          if(isAdmin){
            const data = bookings[key][h];
            if(data && data.name){
              const details = document.createElement('div');
              details.style.fontSize = '11px';
              details.style.color = '#aaa';
              details.style.marginBottom = '8px';
              details.innerHTML = '<strong>' + data.name + '</strong><br>' + data.address;
              box.appendChild(details);
            }
          }
          
          if (canCancel(key)){
            const btn = document.createElement('button');
            btn.className = 'cancel-btn';
            btn.textContent = '✕ Cancel';
            btn.style.fontSize = '12px';
            btn.addEventListener('click', function(ev){ 
              ev.stopPropagation(); 
              cancelSlot(key, h); 
            });
            box.appendChild(btn);
          }
        } else {
          box.textContent = 'Available';
          box.addEventListener('click', function(){ 
            bookSlot(key, h); 
          });
        }

        cell.appendChild(box);
        weekBody.appendChild(cell);
      }
    }
  }

  renderCalendar();
});
