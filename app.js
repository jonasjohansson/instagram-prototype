// ── Default State ──────────────────────────────────────────────
const DEFAULT_STATE = {
  profile: {
    picture: '',
    username: 'username',
    displayName: 'Display Name',
    category: 'Category',
    bio: 'Bio goes here...',
    website: 'website.com',
    threads: '@threads',
    followers: 0,
    following: 0,
  },
  grid: Array(9).fill(null),
  highlights: [],
  view: 'desktop',
};

let state;

// ── Persistence ───────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem('ig-prototype-state');
    if (raw) {
      state = JSON.parse(raw);
      // Ensure all keys exist (forward-compat)
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
    alert('Storage full — images may not persist. Try removing some images.');
  }
}

// ── Grid Rendering ────────────────────────────────────────────
function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  state.grid.forEach((slot, index) => {
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
    div.addEventListener('drop', (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      div.classList.remove('drag-target');

      // External file drop
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          state.grid[index] = ev.target.result;
          saveState();
          render();
        };
        reader.readAsDataURL(file);
        return;
      }

      // Internal rearrange
      const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (isNaN(sourceIndex) || sourceIndex === index) return;

      // Swap source and target (works for move-to-empty and swap)
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
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            state.grid[index] = ev.target.result;
            saveState();
            render();
          };
          reader.readAsDataURL(file);
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
      img.src = slot;
      div.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'grid-item-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.grid[index] = null;
        saveState();
        render();
      });
      div.appendChild(removeBtn);
    }

    grid.appendChild(div);
  });

  // Update posts count
  const postsCount = document.getElementById('posts-count');
  if (postsCount) {
    postsCount.textContent = state.grid.filter((s) => s !== null).length;
  }
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

function initProfilePic() {
  const wrapper = document.querySelector('.profile-pic-wrapper');
  const input = document.getElementById('profile-pic-input');

  if (!wrapper || !input) return;

  wrapper.addEventListener('click', () => input.click());

  // Also allow clicking mobile pic wrapper (including placeholder) to upload
  const mobileWrapper = document.querySelector('.profile-pic-mobile');
  if (mobileWrapper) {
    mobileWrapper.addEventListener('click', () => input.click());
  }

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.profile.picture = ev.target.result;
      syncAllProfilePics(ev.target.result);
      saveState();
    };
    reader.readAsDataURL(file);
  });

  // Restore saved picture (also sets placeholder visibility)
  syncAllProfilePics(state.profile.picture || '');
}

// ── Story Highlights ─────────────────────────────────────────
function renderHighlights() {
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

  // Render each highlight from state
  state.highlights.forEach((hl, index) => {
    const item = document.createElement('div');
    item.className = 'highlight-item';

    const circle = document.createElement('div');
    circle.className = 'highlight-circle has-story';

    const img = document.createElement('img');
    img.src = hl.cover;
    img.alt = hl.name;
    circle.appendChild(img);

    const label = document.createElement('span');
    label.className = 'highlight-label';
    label.textContent = hl.name;

    item.appendChild(circle);
    item.appendChild(label);

    item.addEventListener('click', () => editHighlight(index));
    container.appendChild(item);
  });
}

function addHighlight() {
  const name = prompt('Highlight name:');
  if (!name) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.highlights.push({ name, cover: ev.target.result });
      saveState();
      renderHighlights();
    };
    reader.readAsDataURL(file);
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
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  populateFromState();
  initProfilePic();
  initViewToggle();
  initInlineEditing();
  initGridControls();
  renderHighlights();
  render();
});
