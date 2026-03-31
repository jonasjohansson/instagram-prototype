# Instagram Profile Prototype Tool — Design

## Purpose
A content planning and grid testing tool that replicates the Instagram profile page. Users can upload images, rearrange them via drag & drop, edit all user-facing profile fields, and toggle between mobile and desktop layouts.

## Tech Stack
- Vanilla JS, CSS, HTML — no frameworks, no build tools
- Single page: `index.html`, `style.css`, `app.js`

## Profile Header (Editable)
- **Profile picture** — click to upload
- **Username**, display name, subtitle — inline editable (click to edit)
- **Stats** — posts (auto-counted from grid), followers, following — editable numbers
- **Bio text** — inline editable, multi-line
- **Website link** — editable
- **Threads handle** — editable
- **Story highlights** — add/remove/rename, upload cover image
- Layout restructures between mobile (stacked) and desktop (side-by-side) to match real Instagram

## Grid
- **Desktop:** 4 columns
- **Mobile:** 3 columns
- **Default:** 9 empty slots, add/remove freely
- **Upload:** Click slot to upload, or drag image from desktop onto slot
- **Rearrange:** Drag & drop between slots to reorder
- **Remove:** Hover reveals X button to clear a slot

## Mobile/Desktop Toggle
- Sticky toolbar at top of page
- Switches column count, header layout, and overall container width
- Mobile: ~375px centered; Desktop: max ~935px (like Instagram)

## Visual Fidelity
- Instagram's system font stack, colors, spacing, border-radius
- 1:1 square crop aspect ratios in grid
- Grid gap and hover overlays matching Instagram
- Tab bar icons (grid, reels, saved, tagged) — visual only, grid tab active

## Data Persistence
- All state in JS objects
- localStorage save/load so work persists across refreshes
