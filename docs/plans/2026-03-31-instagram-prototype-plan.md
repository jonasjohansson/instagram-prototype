# Instagram Profile Prototype Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a vanilla JS/CSS Instagram profile prototype tool with drag-and-drop grid management, inline-editable profile fields, and mobile/desktop layout toggle.

**Architecture:** Single HTML page with CSS handling all layout/responsive concerns and JS managing state, inline editing, drag & drop, and localStorage persistence. State is a single JS object containing profile data and an ordered array of grid slots. All rendering is driven by that state object.

**Tech Stack:** Vanilla HTML, CSS, JS. No build tools, no dependencies.

---

### Task 1: HTML Scaffold + CSS Reset + Base Layout

**Files:**
- Create: `index.html`
- Create: `style.css`

**Step 1: Create index.html with full semantic structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram Prototype</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Top toolbar with view toggle -->
  <div class="toolbar">
    <div class="toolbar-inner">
      <span class="toolbar-title">Instagram Prototype</span>
      <div class="view-toggle">
        <button class="view-btn active" data-view="desktop">Desktop</button>
        <button class="view-btn" data-view="mobile">Mobile</button>
      </div>
    </div>
  </div>

  <!-- Instagram shell -->
  <div class="ig-shell" data-view="desktop">
    <!-- Profile header -->
    <header class="profile-header">
      <div class="profile-pic-wrap">
        <img class="profile-pic" src="" alt="Profile picture">
        <input type="file" id="profile-pic-input" accept="image/*" hidden>
      </div>

      <div class="profile-info">
        <div class="profile-top-row">
          <h1 class="username" contenteditable="true">username</h1>
        </div>

        <div class="profile-stats">
          <span><strong class="stat-posts">0</strong> posts</span>
          <span><strong class="stat-followers" contenteditable="true">0</strong> followers</span>
          <span><strong class="stat-following" contenteditable="true">0</strong> following</span>
        </div>

        <div class="profile-bio">
          <div class="display-name" contenteditable="true">Display Name</div>
          <div class="bio-text" contenteditable="true">Bio goes here...</div>
          <a class="website-link" contenteditable="true">website.com</a>
          <div class="threads-handle" contenteditable="true">@threads</div>
        </div>
      </div>
    </header>

    <!-- Action buttons -->
    <div class="profile-actions">
      <button class="action-btn">Edit profile</button>
      <button class="action-btn">View archive</button>
    </div>

    <!-- Story highlights -->
    <div class="highlights">
      <div class="highlight-item highlight-add">
        <div class="highlight-circle">+</div>
        <span>New</span>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button class="tab active" data-tab="grid">
        <svg viewBox="0 0 24 24" width="24" height="24"><rect x="1" y="1" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="1" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"/><rect x="1" y="14" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tab" data-tab="reels">
        <svg viewBox="0 0 24 24" width="24" height="24"><polygon points="9,6 17,12 9,18" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tab" data-tab="saved">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M5,2 L19,2 L19,22 L12,17 L5,22 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tab" data-tab="tagged">
        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20,4 L12,4 L4,12 L12,20 L20,12 Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/></svg>
      </button>
    </div>

    <!-- Grid -->
    <div class="grid" id="grid"></div>

    <!-- Grid controls -->
    <div class="grid-controls">
      <button id="add-slot">+ Add row</button>
      <button id="remove-slot">- Remove row</button>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

**Step 2: Create style.css with Instagram-accurate styling**

Write the full CSS covering:
- CSS reset and system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`)
- `.toolbar` — sticky top bar, white bg, bottom border, z-index on top
- `.ig-shell[data-view="desktop"]` — max-width 935px, centered
- `.ig-shell[data-view="mobile"]` — max-width 375px, centered, with phone-frame feel
- `.profile-header` desktop — flex row, avatar left (150px), info right
- `.profile-header` mobile — stacked, avatar (77px) with stats inline, bio below
- `.profile-stats` — flex row, spaced
- `.profile-actions` — two buttons side by side, rounded, light grey bg
- `.highlights` — horizontal scroll, 77px circles with ring
- `.tab-bar` — flex row, even spaced, border top, icons centered
- `.grid` desktop — 4-column grid, 1px gap
- `.grid` mobile — 3-column grid, 3px gap
- Grid items — aspect-ratio 1/1, object-fit cover, position relative
- Grid item hover — dark overlay with optional icon
- Grid empty slot — dashed border, light bg, "+" icon centered
- `[contenteditable]` — no outline, subtle hover highlight
- `.view-toggle` — pill-shaped button group

Key Instagram values:
- Profile section border-bottom: `1px solid #dbdbdb`
- Background: `#ffffff`, secondary bg: `#fafafa`
- Text primary: `#262626`, secondary: `#8e8e8e`
- Link color: `#00376b`
- Button bg: `#efefef`, button text: `#262626`
- Border radius buttons: `8px`
- Grid gap desktop: `4px`, mobile: `3px`

**Step 3: Verify in browser**

Run: `open index.html` or use live server
Expected: See empty Instagram profile layout with toolbar, header, tabs, and empty grid area.

**Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: HTML scaffold and CSS with Instagram-accurate layout"
```

---

### Task 2: State Management + Rendering

**Files:**
- Create: `app.js`

**Step 1: Define state object and render functions**

```javascript
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
  grid: Array(9).fill(null), // null = empty slot, string = image data URL
  highlights: [],
  view: 'desktop', // 'desktop' | 'mobile'
};

function loadState() { /* from localStorage or DEFAULT_STATE */ }
function saveState() { /* to localStorage */ }
function render() { /* re-render grid + update post count */ }
```

**Step 2: Implement grid rendering**

`render()` should:
- Clear `#grid` innerHTML
- For each slot in `state.grid`, create a div:
  - If `null`: empty slot with "+" icon, click triggers file input
  - If image URL: show `<img>` with object-fit cover, hover overlay with X button
- Set `.stat-posts` to count of non-null slots

**Step 3: Implement view toggle**

- Click handlers on `.view-btn` buttons
- Update `state.view`, toggle `data-view` attribute on `.ig-shell`
- Update `active` class on buttons
- Save state

**Step 4: Implement inline editing sync**

- On `blur` of each `[contenteditable]` field, sync value back to `state.profile`
- Save state on every edit

**Step 5: Implement profile picture upload**

- Click `.profile-pic-wrap` triggers `#profile-pic-input`
- On change, read file as data URL, store in `state.profile.picture`, update `<img>` src

**Step 6: Verify in browser**

Run: Open in browser, toggle views, edit text fields, refresh and verify data persists.
Expected: State round-trips through localStorage.

**Step 7: Commit**

```bash
git add app.js
git commit -m "feat: state management, rendering, view toggle, inline editing"
```

---

### Task 3: Image Upload (Click + Drag from Desktop)

**Files:**
- Modify: `app.js`
- Modify: `style.css` (drag-over visual feedback)

**Step 1: Add click-to-upload on empty slots**

In the grid render function:
- Each empty slot gets a hidden `<input type="file" accept="image/*">`
- Clicking the slot triggers the input
- On file selected, read as data URL, store in `state.grid[index]`, re-render, save

**Step 2: Add drag-from-desktop onto slots**

On each grid slot:
- `dragover` — prevent default, add `.drag-over` class
- `dragleave` — remove `.drag-over` class
- `drop` — prevent default, read `e.dataTransfer.files[0]` as data URL, store in slot, re-render, save

**Step 3: Add CSS for drag feedback**

```css
.grid-item.drag-over {
  outline: 2px solid #0095f6;
  outline-offset: -2px;
  background: rgba(0, 149, 246, 0.05);
}
```

**Step 4: Add remove button on filled slots**

- On hover, show an X button (absolute positioned top-right)
- Click X: set `state.grid[index] = null`, re-render, save

**Step 5: Verify in browser**

Test: Click empty slot, select image. Drag image file from Finder onto empty slot. Drag onto filled slot (replaces). Click X to remove.
Expected: All three upload methods work, images persist across refresh.

**Step 6: Commit**

```bash
git add app.js style.css
git commit -m "feat: image upload via click and drag-from-desktop, remove button"
```

---

### Task 4: Grid Drag-to-Rearrange

**Files:**
- Modify: `app.js`
- Modify: `style.css`

**Step 1: Make filled grid items draggable**

- Set `draggable="true"` on filled grid items
- Store source index in `dragstart` via `e.dataTransfer.setData('text/plain', index)`

**Step 2: Handle drop for rearranging**

On drop, check if data came from internal drag (has index data) vs external file:
- Internal: swap `state.grid[sourceIndex]` and `state.grid[targetIndex]`, re-render, save
- External file: existing file upload logic

**Step 3: Add drag visual feedback**

```css
.grid-item.dragging {
  opacity: 0.4;
}
.grid-item.drag-target {
  outline: 2px solid #0095f6;
  outline-offset: -2px;
}
```

**Step 4: Verify in browser**

Test: Upload 3+ images. Drag one image onto another. Verify they swap positions. Drag external file onto filled slot. Verify it replaces.
Expected: Internal rearrange swaps. External file replaces. Visual feedback during drag.

**Step 5: Commit**

```bash
git add app.js style.css
git commit -m "feat: drag-to-rearrange grid items with swap logic"
```

---

### Task 5: Story Highlights

**Files:**
- Modify: `app.js`
- Modify: `style.css`

**Step 1: Render highlights from state**

- Render `state.highlights` array as circles with cover image + label
- Always show "New" (+) button at start
- Each highlight: `{ name: 'Name', cover: 'dataURL' }`

**Step 2: Add highlight**

- Click "+" → prompt for name → open file picker for cover → push to `state.highlights`, re-render, save

**Step 3: Edit/remove highlights**

- Click existing highlight → simple context: rename or remove
- Use `prompt()` for rename, `confirm()` for delete (keep it simple, no custom modals)

**Step 4: Style highlights**

- 77px circles, 2px gradient ring (Instagram's rainbow gradient: `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`)
- Overflow-x scroll, no scrollbar visible
- Label below, truncated with ellipsis

**Step 5: Verify in browser**

Test: Add 3 highlights with different images. Rename one. Delete one. Refresh — persists.
Expected: Highlights render with Instagram-style rings, scroll horizontally.

**Step 6: Commit**

```bash
git add app.js style.css
git commit -m "feat: story highlights with add, rename, remove"
```

---

### Task 6: Add/Remove Grid Rows + Grid Controls

**Files:**
- Modify: `app.js`

**Step 1: Implement add row**

- "Add row" button: push N `null` entries to `state.grid` (N = current column count based on view), re-render, save

**Step 2: Implement remove row**

- "Remove row" button: pop last N entries from `state.grid` (warn/confirm if any have images), re-render, save

**Step 3: Auto-update post count**

- `.stat-posts` always reflects `state.grid.filter(Boolean).length`

**Step 4: Verify in browser**

Test: Add rows in desktop (adds 4 slots) and mobile (adds 3 slots). Remove row with images — confirm dialog appears. Post count updates.
Expected: Grid grows/shrinks correctly per view mode.

**Step 5: Commit**

```bash
git add app.js
git commit -m "feat: add/remove grid rows, auto post count"
```

---

### Task 7: Mobile/Desktop Layout Polish

**Files:**
- Modify: `style.css`

**Step 1: Polish desktop layout**

- Profile pic: 150px circle, 2px border `#dbdbdb`
- Header: flex row, 30px gap between pic and info
- Username: 20px, regular weight, with settings gear icon space
- Stats: 16px, 40px gap between each
- Bio: 14px, line-height 1.4

**Step 2: Polish mobile layout**

- Profile pic: 77px circle
- Header: pic on left, stats on right in same row
- Bio: full width below header row
- Stats text smaller, compact
- Action buttons: full width, smaller padding

**Step 3: Animate view transition**

```css
.ig-shell {
  transition: max-width 0.3s ease;
}
```

**Step 4: Verify both views**

Toggle between views. Compare with real Instagram on desktop and mobile.
Expected: Layout closely matches real Instagram in both modes.

**Step 5: Commit**

```bash
git add style.css
git commit -m "feat: polish mobile and desktop layouts to match Instagram"
```

---

### Task 8: Final Polish + Edge Cases

**Files:**
- Modify: `app.js`
- Modify: `style.css`
- Modify: `index.html`

**Step 1: Add placeholder profile picture**

- Default grey circle with camera icon SVG when no picture uploaded
- On click still opens file picker

**Step 2: Add grid hover overlay**

- Filled slots on hover: semi-transparent dark overlay
- Match Instagram's hover effect

**Step 3: Handle contenteditable edge cases**

- Prevent Enter key in single-line fields (username, website, threads)
- Allow Enter in bio (multi-line)
- Strip HTML on paste (plain text only)

**Step 4: Add toolbar styling**

- Clean top bar with title left, toggle right
- Subtle shadow or border-bottom

**Step 5: Add empty state**

- When grid has zero filled slots, show a subtle "Drag images here or click to upload" message

**Step 6: Verify everything end-to-end**

Full test: upload profile pic, edit all fields, add highlights, upload grid images, rearrange, toggle views, refresh, verify persistence.
Expected: Complete working prototype.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: final polish — placeholders, hover effects, edge cases"
```
