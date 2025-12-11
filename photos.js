
// photos.js - Photo gallery functionality
document.addEventListener('DOMContentLoaded', () => {
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

  function escapeHtml(str){ 
    if(!str) return ''; 
    return String(str).replace(/[&<>"']/g, m => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    })[m]); 
  }

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
  
  function renderPhotos(){ 
    const grid = document.getElementById('photos-grid'); 
    if(!grid) return; 
    const media = loadLocalMedia().photos; 
    grid.innerHTML = ''; 
    media.forEach(m=>{ 
      const card = document.createElement('div'); 
      card.className='photo-card'; 
      card.innerHTML = `<img src="${m.url}" alt="${escapeHtml(m.title)}" onerror="this.style.display='none'"><div class="media-title">${escapeHtml(m.title)}</div>`; 
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
      if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick an image file.');
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
      if(!fileEl || !fileEl.files || !fileEl.files[0]) return alert('Pick a video file.');
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

  // Update footer year
  const yearPhoto = document.getElementById('year-photo');
  if(yearPhoto) yearPhoto.textContent = new Date().getFullYear();
});
