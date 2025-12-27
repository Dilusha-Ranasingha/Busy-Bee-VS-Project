# VS Code Theme Integration

This dashboard is integrated with VS Code's theming system, allowing it to automatically adapt to the active color theme (light, dark, high contrast, etc.).

## Color System Architecture

### 1. VS Code Theme Tokens (`src/styles/vscode-tokens.css`)

Defines CSS custom properties that map to VS Code theme colors with fallback values for standalone browser mode.

**Key token categories:**
- **Editor colors**: `--vscode-editor-background`, `--vscode-editor-foreground`
- **Button colors**: `--vscode-button-background`, `--vscode-button-hover`
- **Input colors**: `--vscode-input-background`, `--vscode-input-border`
- **List colors**: `--vscode-list-active-bg`, `--vscode-list-hover-bg`
- **Panel colors**: `--vscode-panel-background`, `--vscode-panel-border`

### 2. Brand Colors

Custom brand colors overlaid on VS Code tokens:
- **Primary Blue**: `#0b4063` - Used for primary actions, active states
- **Accent Yellow**: `#bf941d` - Used for warnings, highlights, success states

### 3. Tailwind Integration (`tailwind.config.js`)

Tailwind is configured to reference VS Code CSS variables:

```javascript
colors: {
  vscode: {
    'editor-bg': 'var(--vscode-editor-background)',
    'button-bg': 'var(--vscode-button-background)',
    // ... more tokens
  },
  brand: {
    primary: 'var(--brand-primary)',
    accent: 'var(--brand-accent)',
  }
}
```

## Usage in Components

### Using VS Code Tokens

```tsx
// Background
<div className="bg-vscode-editor-bg">

// Text colors
<p className="text-vscode-foreground">
<span className="text-vscode-description">

// Buttons
<button className="bg-vscode-button-bg text-vscode-button-fg hover:bg-vscode-button-hover">

// Inputs
<input className="bg-vscode-input-bg border-vscode-input-border text-vscode-input-fg">
```

### Using Brand Colors

```tsx
// Primary actions
<button className="bg-brand-primary hover:bg-brand-primary-hover text-white">

// Accent/Success states
<span className="text-brand-accent">
```

## Theme Detection & Updates

The `src/utils/vscode-theme.ts` utility automatically:

1. **Detects VS Code context**: Checks for `acquireVsCodeApi()`
2. **Listens for theme changes**: Via `window.addEventListener('message')`
3. **Updates CSS variables**: Applies new theme colors dynamically
4. **Provides helpers**: `isVsCodeWebview()`, `postMessageToVsCode()`

## Dual-Mode Support

The dashboard works in two modes:

### Standalone Browser Mode
- Uses fallback values from CSS variables
- Respects `prefers-color-scheme` media query
- Full functionality without VS Code

### VS Code Webview Mode
- Receives theme colors from extension
- Automatically updates on theme change
- Perfect integration with editor theme

## Testing

### In Browser (Standalone)
```bash
cd packages/dashboard
npm run dev
```

The dashboard will use fallback colors and respect your OS dark/light mode preference.

### In VS Code Extension
1. Open extension workspace
2. Press F5 to launch extension host
3. Open the "Busy Bee" view container in the Activity Bar
4. The dashboard will load with VS Code theme colors

### Theme Testing
Test with different VS Code themes:
- Light themes: "Light+", "Quiet Light"
- Dark themes: "Dark+", "Monokai"
- High contrast: "High Contrast Light", "High Contrast Dark"

Colors should adapt automatically when switching themes.

## Color Mapping Reference

| UI Element | VS Code Token | Brand Override |
|------------|---------------|----------------|
| Page background | `editor-bg` | - |
| Text | `foreground` | - |
| Primary buttons | `button-bg` | `brand-primary` ✓ |
| Secondary buttons | `button-secondary-bg` | - |
| Input fields | `input-bg` | - |
| Borders | `widget-border` | - |
| Cards/Panels | `widget-bg` | - |
| Success states | - | `brand-accent` ✓ |
| Error states | `error` | - |
| Links | `link` | - |

## Benefits

✅ **Automatic theme adaptation** - No manual theme switching needed  
✅ **Accessibility** - Respects high contrast themes  
✅ **Consistency** - Matches VS Code UI perfectly  
✅ **Flexibility** - Works standalone or in extension  
✅ **Brand identity** - Custom colors for key actions  

## Migration Notes

This replaces the previous dark mode implementation:
- ❌ Removed: `ThemeContext.tsx`, `ThemeToggle.tsx`
- ❌ Removed: All `dark:` Tailwind classes
- ✅ Added: VS Code token system
- ✅ Added: Brand color integration
- ✅ Added: Automatic theme detection
