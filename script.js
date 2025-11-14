/* Huanger Films - static site script
   - Handles calendar (localStorage demo + firebase template commented)
   - Handles media lists (local-only add + display from assets)
   - Handles merch products (PayPal live form and Stripe payment link redirect)
*/

/* -----------------------
   Basic site setup
   ----------------------- */
const today = new Date();
const YEAR = today.getFullYear();
document.getElementById('year-home')?.textContent = YEAR;
document.getElementById('year-cal')?.textContent = YEAR;
document.getElementById('year-video')?.textContent = YEAR;
document.getElementById('year-photo')?.textContent = YEAR;
document.getElementById('year-merch')?.textContent = YEAR;

/* -----------------------
   PRODUCTS (Merch)
   - Edit prices & images here.
   - For Stripe: paste Stripe Payment Link URL in `stripeLink` for each product.
   - For PayPal: email uses lucas042213@gmail.com (YOU SUPPLIED)
   ----------------------- */
const products = [
  {
    id: 'shirt001',
    title: 'Huanger Films Tee',
    price: 25.00,           // price in USD, shown on page and used for PayPal form
    img: 'assets/merch-shirt.jpg', // put an image at this path or change
    stripeLink: ''          // paste your Stripe Payment Link here (example: https://buy.stripe.com/test_... )
  },
  {
    id: 'print001',
    title: '8x10 Photo Print',
    price: 15.00,
    img: 'assets/8x10-print.jpg',
    stripeLink: ''
  }
];

// PayPal merchant email (live)
const PAYPAL_EMAIL = 'lucas042213@gmail.com';

/* -----------------------
   Render merch grid
   ----------------------- */
function renderMerchGrid(){
  const grid = document.getElementById('merch-grid');
  if(!grid) return;
  grid.innerHTML = '';
  products.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'product';
    card.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.title)}" onerror="this.style.display='none'">
      <h4>${escapeHtml(p.title)}</h4>
      <p>$${p.price.toFixed(2)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" data-stripe="${p.stripeLink}">Buy with Stripe</button>
        <form class="paypal-form" method="post" target="_blank">
          <input type="hidden" name="cmd" value="_xclick">
          <input type="hidden" name="business" value="${PAYPAL_EMAIL}">
          <input type="hidden" name="item_name" value="${escapeHtml(p.title)}">
          <input type="hidden" name="amount" value="${p.price}">
          <input type="hidden" name="currency_code" value="USD">
          <button class="btn ghost" type="submit">Buy with PayPal</button>
        </form>
      </div>
    `;
    grid.appendChild(card);

    // Wire Stripe button
    card.querySelector('button[data-stripe]')?.addEventListener('click', e=>{
      const link = e.currentTarget.getAttribute('data-stripe');
      if(!link){
        alert('No Stripe Payment Link configured for this product yet. Create a Payment Link in Stripe and paste it into script.js.');
        return;
      }
      // Redirect to Stripe Payment Link (Payment Links are hosted by Stripe)
      window.location.href = link;
    });
    // Wire PayPal form action to PayPal live checkout
    const paypalForm = card.querySelector('.paypal-form');
    // PayPal checkout URL uses paypal.com for live
    paypalForm.action = 'https://www.paypal.com/cgi-bin/webscr';
  });
}
renderMerchGrid();

/* -----------------------
   MEDIA (Photos & Videos)
   - Place files in /assets and optionally add to localStorage via the small add forms below
   ----------------------- */

const defaultMedia = {
  photos: [
    // Example: { id:'p1', title: 'Sample', url: 'assets/sample-photo.jpg' }
  ],
  videos: [
    // Example: { id:'v1', title:'Demo', url: 'assets/sample-video.mp4' }
  ]
};

function loadLocalMedia(){
  const raw = localStorage.getItem('huanger_media_v1');
  if(!raw) {
    localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia));
    return defaultMedia;
  }
  try {
    return JSON.parse(raw);
  } catch(e){
    localStorage.setItem('huanger_media_v1', JSON.stringify(defaultMedia));
    return defaultMedia;
  }
}

function saveLocalMedia(obj){
  localStorage.setItem('huanger_media_v1', JSON.stringify(obj));
}

function renderPhotos(){
  const grid = document.getElementById('photos-grid');
  if(!grid) return;
  const media = loadLocalMedia().photos;
  grid.innerHTML = '';
  media.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<img src="${m.url}" alt="${escapeHtml(m.title)}"><p>${escapeHtml(m.title)}</p>`;
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
    card.className = 'card';
    card.innerHTML = `<video controls src="${m.url}" style="width:100%"></video><p>${escapeHtml(m.title)}</p>`;
    grid.appendChild(card);
  });
}

renderPhotos();
renderVideos();

/* Quick-add handlers (local-only) */
document.getElementById('add-photo-btn')?.addEventListener('click', ()=>{
  const title = document.getElementById('photo-title').value || 'Untitled';
  const fileEl = document.getElementById('photo-file');
  if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick an image file (this stores locally only).');
  const file = fileEl.files[0];
  const reader = new FileReader();
  reader.onload = function(evt){
    const media = loadLocalMedia();
    const id = 'p' + Date.now();
    media.photos.unshift({id, title, url: evt.target.result});
    saveLocalMedia(media);
    renderPhotos();
    fileEl.value = '';
    document.getElementById('photo-title').value = '';
  };
  reader.readAsDataURL(file);
});

document.getElementById('add-video-btn')?.addEventListener('click', ()=>{
  const title = document.getElementById('video-title').value || 'Untitled';
  const fileEl = document.getElementById('video-file');
  if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick a video file (this stores locally only).');
  const file = fileEl.files[0];
  const reader = new FileReader();
  reader.onload = function(evt){
    const media = loadLocalMedia();
    const id = 'v' + Date.now();
    media.videos.unshift({id, title, url: evt.target.result});
    saveLocalMedia(media);
    renderVideos();
    fileEl.value = '';
    document.getElementById('video-title').value = '';
  };
  reader.readAsDataURL(file);
});

/* -----------------------
   CALENDAR (localStorage-backed)
   - Full-year view; click a day to view bookings or add a booking
   - To enable real-time shared bookings, uncomment the Firebase block below,
     create a Firebase project, enable Firestore, then paste your config and remove localStorage usage.
   ----------------------- */

const calendarWrapper = document.getElementById('calendar-wrapper');
const yearSelect = document.getElementById('year-select');
const todayBtn = document.getElementById('today-btn');

const CAL_KEY = 'huanger_cal_v1';

// Fill year select: from current-3 to current+3 years
function populateYearSelect(){
  const cur = new Date().getFullYear();
  for(let y = cur-3; y <= cur+3; y++){
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if(y === cur) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}
populateYearSelect();

yearSelect.addEventListener('change', ()=> renderYearCalendar(parseInt(yearSelect.value)));
todayBtn?.addEventListener('click', ()=> {
  yearSelect.value = new Date().getFullYear();
  renderYearCalendar(parseInt(yearSelect.value));
});

function loadLocalBookings(){
  const raw = localStorage.getItem(CAL_KEY);
  if(!raw) return {};
  try { return JSON.parse(raw); } catch(e){ return {}; }
}
function saveLocalBookings(obj){
  localStorage.setItem(CAL_KEY, JSON.stringify(obj));
}

/* Firebase template (commented)
   If you want shared (real-time) bookings for everyone using the site, do:
   1) Create a Firebase project at https://console.firebase.google.com/
   2) Enable Firestore (mode: production)
   3) Enable Firebase Hosting or just use Firestore rules
   4) Replace the firebaseConfig below and uncomment the code to initialize Firestore
   5) Then remove localStorage load/save and use Firestore listeners instead

// --- Firebase example (UNCOMMENT after you provide your config) ---
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
// const firebaseConfig = {
//   apiKey: 'REPLACE_ME',
//   authDomain: 'REPLACE_ME',
//   projectId: 'REPLACE_ME',
//   storageBucket: 'REPLACE_ME',
//   messagingSenderId: 'REPLACE_ME',
//   appId: 'REPLACE_ME'
// };
// firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();
// // Use db.collection('events') to listen and write.
// // Example realtime listener:
// // db.collection('events').onSnapshot(snapshot => {
// //   const bookings = {};
// //   snapshot.forEach(doc => {
// //     const data = doc.data();
// //     const date = data.date; // 'YYYY-MM-DD'
// //     if(!bookings[date]) bookings[date] = [];
// //     bookings[date].push(data);
// //   });
// //   // now merge/update UI from bookings
// // });
//*/

function renderYearCalendar(year = new Date().getFullYear()){
  if(!calendarWrapper) return;
  calendarWrapper.innerHTML = '';
  for(let m = 0; m < 12; m++){
    const monthDiv = document.createElement('div');
    monthDiv.className = 'month';
    const d = new Date(year, m, 1);
    const monthName = d.toLocaleString('default', { month: 'long' });
    const header = document.createElement('h4');
    header.textContent = `${monthName} ${year}`;
    monthDiv.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'month-grid';

    const days = new Date(year, m+1, 0).getDate();
    for(let day = 1; day <= days; day++){
      const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const btn = document.createElement('button');
      btn.className = 'day-cell';
      btn.textContent = day;
      btn.dataset.date = dateStr;
      btn.addEventListener('click', ()=> onDayClick(dateStr));
      grid.appendChild(btn);
    }
    monthDiv.appendChild(grid);
    calendarWrapper.appendChild(monthDiv);
  }
  markBookedDays();
}
renderYearCalendar(YEAR);

function markBookedDays(){
  const bookings = loadLocalBookings();
  document.querySelectorAll('.day-cell').forEach(btn=>{
    const date = btn.dataset.date;
    if(bookings[date] && bookings[date].length > 0) btn.classList.add('booked');
    else btn.classList.remove('booked');
  });
}

const bookingPanel = document.getElementById('booking-panel');
const bookingsList = document.getElementById('bookings-list');
const bookingPanelDate = document.getElementById('booking-panel-date');
const bookingTitleInput = document.getElementById('booking-title');
const bookingTimeInput = document.getElementById('booking-time');
const addBookingBtn = document.getElementById('add-booking-btn');
const closePanelBtn = document.getElementById('close-panel-btn');

let activeDate = null;
function onDayClick(dateStr){
  activeDate = dateStr;
  bookingPanelDate.textContent = dateStr;
  bookingPanel.classList.remove('hidden');
  renderBookingsForDate(dateStr);
}
function renderBookingsForDate(dateStr){
  const bookings = loadLocalBookings();
  const list = bookings[dateStr] || [];
  bookingsList.innerHTML = '';
  if(list.length === 0) {
    bookingsList.innerHTML = '<li><small>No bookings</small></li>';
  } else {
    list.forEach((b, i)=>{
      const li = document.createElement('li');
      li.textContent = `${b.time || '—'} — ${b.title}`;
      bookingsList.appendChild(li);
    });
  }
}
addBookingBtn?.addEventListener('click', ()=>{
  const title = bookingTitleInput.value.trim();
  const time = bookingTimeInput.value;
  if(!title) return alert('Please enter a booking title');
  if(!activeDate) return alert('No date selected');
  // Save locally
  const bookings = loadLocalBookings();
  bookings[activeDate] = bookings[activeDate] || [];
  // Simple conflict prevention: disallow same time duplicates
  const conflict = bookings[activeDate].find(b => b.time === time && time);
  if(conflict) return alert('A booking already exists at that time for this date.');
  bookings[activeDate].push({title, time, created: Date.now()});
  saveLocalBookings(bookings);
  renderBookingsForDate(activeDate);
  markBookedDays();
  bookingTitleInput.value = '';
  bookingTimeInput.value = '';
  alert('Booking saved locally. To sync bookings across users, enable Firebase (see script.js comments).');
});
closePanelBtn?.addEventListener('click', ()=> bookingPanel.classList.add('hidden'));

/* -----------------------
   Utilities
   ----------------------- */
function escapeHtml(str){
  if(!str) return '';
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}
