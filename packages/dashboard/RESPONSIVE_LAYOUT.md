# Responsive Side Navigation Layout

## Overview

The dashboard now features a responsive side navigation bar designed specifically for VS Code extension panels that appear in the sidebar.

## Features

### Side Navigation
- **Collapsible Design**: Navigation starts at 48px width (icon-only mode)
- **Auto-expand on Hover**: Expands to 192px when hovering to show full labels
- **Visual Indicators**: 
  - Active page highlighted with background color
  - Left border indicator on active item
  - Smooth transitions between states

### Layout Structure
```
┌──────┬────────────────────────────┐
│ Nav  │ Header (Page Title)        │
│ Bar  ├────────────────────────────┤
│      │                            │
│ 📊   │  Page Content              │
│ ➕   │  (Scrollable)              │
│ 📋   │                            │
│ 🔀   │                            │
│      │                            │
└──────┴────────────────────────────┘
```

## Responsive Behavior

### Narrow Panel (< 300px)
- Navigation shows icons only
- Content stacks vertically
- Forms display in single column
- Charts scale to fit available width

### Medium Panel (300px - 600px)
- Navigation can expand on hover
- Content remains in single column for clarity
- Optimal for VS Code side panel

### Wide Panel (> 600px)
- Full navigation labels visible on hover
- Content can utilize more space
- Charts display with better aspect ratios

## Page Adaptations

### Dashboard Page
- KPIs stack vertically for narrow panels
- Charts scale responsively (max-width constraints)
- All content remains accessible in narrow view

### Add Product Page
- Form fields stack in single column
- Full-width inputs for easy data entry
- Submit button adapts to container width

### Product List Page
- Single column grid for all panel widths
- Cards stack vertically
- Maintains readability in narrow panels

### File Switch Rate Page
- Session selector stacks above detail view
- Statistics display in 2-column grid
- Table scrolls horizontally if needed
- Compact font sizes for data density

## Implementation Details

### Components
- `SideNav.tsx`: Main navigation component with expand/collapse
- Layout uses flexbox for proper height distribution
- CSS ensures proper overflow handling

### Styling
- Uses VS Code theme tokens for consistency
- Smooth transitions (300ms) for navigation expansion
- Proper z-index layering for overlays
- Tailwind classes for responsive utilities

## Usage

The navigation automatically adapts to panel width changes. Users can:
1. Hover over navigation to see full labels
2. Click any item to switch pages
3. Resize the panel horizontally - UI adapts smoothly

## Testing

Test the responsive behavior by:
1. Opening the extension in VS Code sidebar
2. Resizing the panel from narrow to wide
3. Hovering over navigation icons
4. Switching between different pages
5. Scrolling through content on each page
