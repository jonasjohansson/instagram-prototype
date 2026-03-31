// ── Default State ──────────────────────────────────────────────
const DEFAULT_STATE = {
  profile: {
    picture: '',  // IndexedDB image key or empty
    username: 'yourhandle',
    displayName: 'Your Name',
    category: 'Artist',
    bio: 'Creative mind. Making things happen.\nBased in Stockholm 🇸🇪',
    website: 'yourwebsite.com',
    threads: '@yourhandle',
    followers: '1,234',
    following: '567',
  },
  grid: Array(9).fill(null),  // null or IndexedDB image key string
  highlights: [],             // { name, cover: imageKey }
  view: 'desktop',
};

let state;
let db; // IndexedDB reference
const objectURLCache = new Map(); // imageKey → objectURL

// ── IndexedDB Image Store ────────────────────────────────────
function openImageDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ig-prototype-images', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('images');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeImage(file) {
  return new Promise((resolve, reject) => {
    const key = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').put(file, key);
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
  });
}

function getImage(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly');
    const req = tx.objectStore('images').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteImage(key) {
  if (!key) return;
  const tx = db.transaction('images', 'readwrite');
  tx.objectStore('images').delete(key);
  if (objectURLCache.has(key)) {
    URL.revokeObjectURL(objectURLCache.get(key));
    objectURLCache.delete(key);
  }
}

async function getImageURL(key) {
  if (!key) return '';
  if (objectURLCache.has(key)) return objectURLCache.get(key);
  const blob = await getImage(key);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  objectURLCache.set(key, url);
  return url;
}

// Helper: read a File into a stored image key
async function storeFileAsImage(file) {
  return storeImage(file);
}

// ── Persistence ───────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem('ig-prototype-state');
    if (raw) {
      state = JSON.parse(raw);
      state.profile = { ...DEFAULT_STATE.profile, ...state.profile };
      state.grid = state.grid || Array(9).fill(null);
      state.highlights = state.highlights || [];
      state.view = state.view || 'desktop';
    } else {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } catch {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveState() {
  try {
    localStorage.setItem('ig-prototype-state', JSON.stringify(state));
  } catch (e) {
    console.warn('localStorage save failed', e);
  }
}

// ── Grid Rendering ────────────────────────────────────────────
async function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let index = 0; index < state.grid.length; index++) {
    const slot = state.grid[index];
    const div = document.createElement('div');

    // Drag-and-drop handlers (shared by empty and filled slots)
    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      div.classList.add('drag-over');
      div.classList.add('drag-target');
    });
    div.addEventListener('dragleave', () => {
      div.classList.remove('drag-over');
      div.classList.remove('drag-target');
    });
    div.addEventListener('drop', async (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      div.classList.remove('drag-target');

      // External file drop
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const oldKey = state.grid[index];
        if (oldKey) deleteImage(oldKey);
        const key = await storeFileAsImage(file);
        state.grid[index] = key;
        saveState();
        render();
        return;
      }

      // Internal rearrange
      const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (isNaN(sourceIndex) || sourceIndex === index) return;

      const temp = state.grid[sourceIndex];
      state.grid[sourceIndex] = state.grid[index];
      state.grid[index] = temp;
      saveState();
      render();
    });

    if (slot === null) {
      // Empty slot
      div.className = 'grid-slot-empty';
      if (index === 0) {
        div.title = 'Click or drag image to upload';
      }
      div.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const key = await storeFileAsImage(file);
          state.grid[index] = key;
          saveState();
          render();
        });
        input.click();
      });
    } else {
      // Image slot
      div.className = 'grid-item';
      div.draggable = true;

      div.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        div.classList.add('dragging');
      });
      div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
      });

      const img = document.createElement('img');
      const url = await getImageURL(slot);
      img.src = url;
      div.appendChild(img);

      // Click to open post detail (use mousedown/mouseup to distinguish from drag)
      let mouseDownPos = null;
      div.addEventListener('mousedown', (e) => {
        mouseDownPos = { x: e.clientX, y: e.clientY };
      });
      div.addEventListener('mouseup', (e) => {
        if (!mouseDownPos) return;
        const dx = Math.abs(e.clientX - mouseDownPos.x);
        const dy = Math.abs(e.clientY - mouseDownPos.y);
        mouseDownPos = null;
        // Only open if it wasn't a drag and not the remove button
        if (dx < 5 && dy < 5 && !e.target.closest('.grid-item-remove')) {
          openPostDetail(index);
        }
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'grid-item-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(state.grid[index]);
        state.grid[index] = null;
        saveState();
        render();
      });
      div.appendChild(removeBtn);
    }

    grid.appendChild(div);
  }

  // Update posts count
  const postsCount = document.getElementById('posts-count');
  if (postsCount) {
    postsCount.textContent = state.grid.filter((s) => s !== null).length;
  }
}

// ── Post Detail Modal ───────────────────────────────────────
async function openPostDetail(index) {
  const key = state.grid[index];
  if (!key) return;
  const url = await getImageURL(key);
  const profilePicURL = state.profile.picture ? await getImageURL(state.profile.picture) : '';
  const isMobile = state.view === 'mobile';

  const overlay = document.createElement('div');
  overlay.className = 'post-modal-overlay' + (isMobile ? ' mobile' : '');

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'post-modal-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => overlay.remove());

  const modal = document.createElement('div');
  modal.className = 'post-modal' + (isMobile ? ' mobile' : '');

  const avatarHTML = profilePicURL
    ? `<img src="${profilePicURL}" class="post-modal-avatar-img">`
    : `<div class="post-modal-avatar-placeholder"></div>`;

  const fakeComments = [
    { user: 'user1', text: '🔥', likes: 2 },
    { user: 'user2', text: '❤️', likes: 1 },
    { user: 'user3', text: '🙌🙌', likes: 2 },
    { user: 'user4', text: '🔥', likes: 1 },
    { user: 'user5', text: '👏👏', likes: 1 },
  ];

  const commentsHTML = fakeComments.map(c => `
    <div class="post-comment">
      <div class="post-comment-avatar"></div>
      <div class="post-comment-content">
        <span class="post-comment-user">${c.user}</span> ${c.text}
        <div class="post-comment-meta">3v &middot; ${c.likes} gilla-markeringar &middot; Svara</div>
      </div>
      <button class="post-comment-like">♡</button>
    </div>
  `).join('');

  if (isMobile) {
    // Mobile: stacked layout
    modal.innerHTML = `
      <div class="post-modal-mobile-header">
        <button class="post-modal-back">&lsaquo;</button>
        <span>Inlägg</span>
        <span></span>
      </div>
      <div class="post-modal-mobile-author">
        <div class="post-modal-avatar">${avatarHTML}</div>
        <span class="post-modal-username">${state.profile.username}</span>
        <span class="post-modal-dots">&hellip;</span>
      </div>
      <div class="post-modal-image"><img src="${url}"></div>
      <div class="post-modal-actions">
        <div class="post-modal-actions-left">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
          <svg viewBox="0 0 24 24" width="24" height="24"><line x1="22" y1="3" x2="9.218" y2="10.083" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="22,3 15,22 11,13 2,9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </div>
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M5,2 L19,2 L19,22 L12,17 L5,22 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </div>
      <div class="post-modal-likes">357 gilla-markeringar</div>
      <div class="post-modal-caption">
        <strong>${state.profile.username}</strong> Caption goes here...
        <span class="post-modal-more">mer</span>
      </div>
      <div class="post-modal-view-comments">Visa alla 6 kommentarer</div>
      <div class="post-modal-date">den 6 mars</div>
    `;
    modal.querySelector('.post-modal-back').addEventListener('click', () => overlay.remove());
  } else {
    // Desktop: side-by-side layout
    modal.innerHTML = `
      <div class="post-modal-image"><img src="${url}"></div>
      <div class="post-modal-info">
        <div class="post-modal-header">
          <div class="post-modal-avatar">${avatarHTML}</div>
          <span class="post-modal-username">${state.profile.username}</span>
          <span class="post-modal-dots">&hellip;</span>
        </div>
        <div class="post-modal-comments-area">
          <div class="post-comment post-caption-comment">
            <div class="post-modal-avatar">${avatarHTML}</div>
            <div class="post-comment-content">
              <span class="post-comment-user">${state.profile.username}</span> Caption goes here...
              <div class="post-comment-meta">3v</div>
            </div>
          </div>
          ${commentsHTML}
        </div>
        <div class="post-modal-actions">
          <div class="post-modal-actions-left">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M16.792 3.904A4.989 4.989 0 0121.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 014.708-5.218 4.21 4.21 0 013.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 013.679-1.938z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
            <svg viewBox="0 0 24 24" width="24" height="24"><line x1="22" y1="3" x2="9.218" y2="10.083" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="22,3 15,22 11,13 2,9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
          </div>
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M5,2 L19,2 L19,22 L12,17 L5,22 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        </div>
        <div class="post-modal-likes">357 gilla-markeringar</div>
        <div class="post-modal-date">den 6 mars</div>
        <div class="post-modal-add-comment">
          <span class="post-modal-emoji">☺</span>
          <input type="text" placeholder="Lägg till kommentar..." disabled>
          <button class="post-modal-publish">Publicera</button>
        </div>
      </div>
    `;
  }

  overlay.appendChild(closeBtn);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });

  document.body.appendChild(overlay);
}

// ── View Toggle ───────────────────────────────────────────────
function updateSidebarVisibility(view) {
  const sidebar = document.querySelector('.ig-sidebar');
  if (sidebar) {
    sidebar.style.display = view === 'mobile' ? 'none' : '';
  }
}

function initViewToggle() {
  const shell = document.querySelector('.ig-shell');
  const buttons = document.querySelectorAll('.toggle-btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      state.view = view;
      shell.dataset.view = view;

      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      updateSidebarVisibility(view);
      saveState();
    });
  });

  // Restore saved view
  shell.dataset.view = state.view;
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === state.view);
  });
  updateSidebarVisibility(state.view);
}

// ── Inline Editing Sync ──────────────────────────────────────
const EDITABLE_MAP = [
  { selector: '.username', field: 'username' },
  { selector: '.display-name', field: 'displayName' },
  { selector: '.category-label', field: 'category' },
  { selector: '.bio-text', field: 'bio' },
  { selector: '.website-link', field: 'website' },
  { selector: '.threads-handle', field: 'threads' },
];

function initInlineEditing() {
  // Single-line fields: prevent Enter key
  const singleLineSelectors = ['.username', '.display-name', '.category-label', '.website-link', '.threads-handle'];
  singleLineSelectors.forEach((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });
  });

  // Also prevent Enter on stat-count fields
  document.querySelectorAll('.stat-count[contenteditable]').forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });
  });

  // Strip HTML on paste for all contenteditable fields
  document.querySelectorAll('[contenteditable]').forEach((el) => {
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  });

  EDITABLE_MAP.forEach(({ selector, field }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.addEventListener('blur', () => {
      state.profile[field] = el.textContent.trim();
      // Sync mobile top bar username when username changes
      if (field === 'username') {
        const mobileTopUsername = document.querySelector('.mobile-top-username');
        if (mobileTopUsername) mobileTopUsername.textContent = state.profile.username;
      }
      saveState();
    });
  });

  // Followers / following — the two editable stat-count spans (not #posts-count)
  const statCounts = document.querySelectorAll('.stat-count[contenteditable]');
  if (statCounts[0]) {
    statCounts[0].addEventListener('blur', () => {
      state.profile.followers = statCounts[0].textContent.trim();
      saveState();
    });
  }
  if (statCounts[1]) {
    statCounts[1].addEventListener('blur', () => {
      state.profile.following = statCounts[1].textContent.trim();
      saveState();
    });
  }
}

function populateFromState() {
  EDITABLE_MAP.forEach(({ selector, field }) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = state.profile[field];
  });

  const statCounts = document.querySelectorAll('.stat-count[contenteditable]');
  if (statCounts[0]) statCounts[0].textContent = state.profile.followers;
  if (statCounts[1]) statCounts[1].textContent = state.profile.following;

  // Sync mobile top bar username
  const mobileTopUsername = document.querySelector('.mobile-top-username');
  if (mobileTopUsername) mobileTopUsername.textContent = state.profile.username;
}

// ── Profile Picture Upload ────────────────────────────────────
function syncAllProfilePics(src) {
  document.querySelectorAll('.profile-pic').forEach((img) => {
    img.src = src;
  });
  // Hide/show placeholders based on whether picture exists
  document.querySelectorAll('.profile-pic-placeholder').forEach((el) => {
    el.classList.toggle('has-picture', !!src);
  });
}

async function initProfilePic() {
  const wrapper = document.querySelector('.profile-pic-wrapper');
  const input = document.getElementById('profile-pic-input');

  if (!wrapper || !input) return;

  wrapper.addEventListener('click', () => input.click());

  const mobileWrapper = document.querySelector('.profile-pic-mobile');
  if (mobileWrapper) {
    mobileWrapper.addEventListener('click', () => input.click());
  }

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (state.profile.picture) deleteImage(state.profile.picture);
    const key = await storeFileAsImage(file);
    state.profile.picture = key;
    const url = await getImageURL(key);
    syncAllProfilePics(url);
    saveState();
  });

  // Restore saved picture
  const url = state.profile.picture ? await getImageURL(state.profile.picture) : '';
  syncAllProfilePics(url);
}

// ── Story Highlights ─────────────────────────────────────────
async function renderHighlights() {
  const container = document.querySelector('.highlights');
  if (!container) return;
  container.innerHTML = '';

  // "New" button always first
  const newItem = document.createElement('div');
  newItem.className = 'highlight-item highlight-new';
  newItem.innerHTML = `
    <div class="highlight-circle highlight-circle-new">
      <span class="highlight-plus">+</span>
    </div>
    <span class="highlight-label">New</span>
  `;
  newItem.addEventListener('click', addHighlight);
  container.appendChild(newItem);

  for (let index = 0; index < state.highlights.length; index++) {
    const hl = state.highlights[index];
    const item = document.createElement('div');
    item.className = 'highlight-item';

    const circle = document.createElement('div');
    circle.className = 'highlight-circle has-story';

    const img = document.createElement('img');
    const url = await getImageURL(hl.cover);
    img.src = url;
    img.alt = hl.name;
    circle.appendChild(img);

    const label = document.createElement('span');
    label.className = 'highlight-label';
    label.textContent = hl.name;

    item.appendChild(circle);
    item.appendChild(label);

    item.addEventListener('click', () => editHighlight(index));
    container.appendChild(item);
  }
}

function addHighlight() {
  const name = prompt('Highlight name:');
  if (!name) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = await storeFileAsImage(file);
    state.highlights.push({ name, cover: key });
    saveState();
    renderHighlights();
  });
  input.click();
}

function editHighlight(index) {
  const hl = state.highlights[index];
  const result = prompt(
    'Rename highlight (or type DELETE to remove):',
    hl.name
  );
  if (result === null) return; // cancelled
  if (result.trim().toUpperCase() === 'DELETE') {
    if (confirm(`Delete highlight "${hl.name}"?`)) {
      state.highlights.splice(index, 1);
      saveState();
      renderHighlights();
    }
  } else if (result.trim() !== '') {
    state.highlights[index].name = result.trim();
    saveState();
    renderHighlights();
  }
}

// ── Grid Row Controls ────────────────────────────────────────
function getColumnsPerRow() {
  return 3;
}

function initGridControls() {
  const addBtn = document.getElementById('add-row');
  const removeBtn = document.getElementById('remove-row');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const cols = getColumnsPerRow();
      for (let i = 0; i < cols; i++) {
        state.grid.push(null);
      }
      saveState();
      render();
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const cols = getColumnsPerRow();
      if (state.grid.length < cols) return;

      const tail = state.grid.slice(-cols);
      const hasImages = tail.some((entry) => entry !== null);

      if (hasImages) {
        if (!confirm('The last row contains images. Remove anyway?')) return;
      }

      state.grid.splice(-cols, cols);
      saveState();
      render();
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  db = await openImageDB();
  loadState();
  populateFromState();
  await initProfilePic();
  initViewToggle();
  initInlineEditing();
  initGridControls();
  await renderHighlights();
  await render();
});
