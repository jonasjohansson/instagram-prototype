// ── Default State ──────────────────────────────────────────────
const DEFAULT_STATE = {
  profile: {
    picture: '',
    username: 'username',
    displayName: 'Display Name',
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
  localStorage.setItem('ig-prototype-state', JSON.stringify(state));
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

      saveState();
    });
  });

  // Restore saved view
  shell.dataset.view = state.view;
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === state.view);
  });
}

// ── Inline Editing Sync ──────────────────────────────────────
const EDITABLE_MAP = [
  { selector: '.username', field: 'username' },
  { selector: '.display-name', field: 'displayName' },
  { selector: '.bio-text', field: 'bio' },
  { selector: '.website-link', field: 'website' },
  { selector: '.threads-handle', field: 'threads' },
];

function initInlineEditing() {
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
function initProfilePic() {
  const wrapper = document.querySelector('.profile-pic-wrapper');
  const input = document.getElementById('profile-pic-input');
  const img = document.querySelector('.profile-pic');

  if (!wrapper || !input || !img) return;

  wrapper.addEventListener('click', () => input.click());

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.profile.picture = ev.target.result;
      img.src = ev.target.result;
      saveState();
    };
    reader.readAsDataURL(file);
  });

  // Restore saved picture
  if (state.profile.picture) {
    img.src = state.profile.picture;
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  populateFromState();
  initProfilePic();
  initViewToggle();
  initInlineEditing();
  render();
});
