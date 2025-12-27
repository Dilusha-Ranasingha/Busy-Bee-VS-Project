# Quick Start: Testing VS Code Theme Integration

## Prerequisites
- Node.js 16+
- VS Code

## Setup Steps

### 1. Install Dependencies

```bash
# From workspace root
cd packages/dashboard
npm install

cd ../extension
npm install
```

### 2. Test Dashboard in Browser (Standalone Mode)

```bash
cd packages/dashboard
npm run dev
```

Visit `http://localhost:5173` - you'll see the dashboard with fallback colors.

**Expected behavior:**
- Light theme by default
- Switches to dark if your OS is in dark mode
- All UI elements use VS Code-style colors

### 3. Test Dashboard in VS Code Extension

#### Option A: Development Mode (Recommended for testing)

1. Open the extension workspace:
   ```bash
   cd packages/extension
   code .
   ```

2. Press `F5` to launch Extension Development Host

3. In the new VS Code window:
   - Click the Busy Bee icon in the Activity Bar (left sidebar)
   - The Product Dashboard should load

4. Test theme changes:
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Search "Preferences: Color Theme"
   - Switch between different themes
   - Dashboard should update automatically

**Themes to test:**
- Light: "Light+", "Quiet Light", "Solarized Light"
- Dark: "Dark+", "Monokai", "One Dark Pro"
- High Contrast: "Dark High Contrast", "Light High Contrast"

#### Option B: Production Build

1. Build the dashboard:
   ```bash
   cd packages/dashboard
   npm run build
   ```

2. Copy built files to extension:
   ```bash
   mkdir -p ../extension/dist/dashboard
   cp -r dist/* ../extension/dist/dashboard/
   ```

3. Build and run extension:
   ```bash
   cd ../extension
   npm run compile
   # Then press F5 in VS Code
   ```

## Verification Checklist

### Visual Tests

- [ ] Page background matches VS Code editor background
- [ ] Text colors match VS Code foreground colors
- [ ] Buttons use brand primary color (#0b4063)
- [ ] Input fields have proper borders and backgrounds
- [ ] Cards/widgets blend with theme
- [ ] Shadows are subtle and theme-appropriate

### Theme Switching Tests

- [ ] Light → Dark: All elements update correctly
- [ ] Dark → Light: All elements update correctly
- [ ] High Contrast: Borders are more prominent
- [ ] Theme changes are instant (no flicker)

### Brand Color Tests

- [ ] Primary blue (#0b4063) used for active nav buttons
- [ ] Primary blue used for primary action buttons
- [ ] Accent yellow (#bf941d) used for success messages
- [ ] Brand colors don't clash with any VS Code theme

### Functionality Tests

- [ ] All interactive elements still work
- [ ] Forms submit correctly
- [ ] Charts render properly
- [ ] Loading states display correctly
- [ ] Error messages are readable

## Troubleshooting

### Dashboard doesn't load in VS Code

1. Check VS Code Output panel for errors
2. Verify extension activated: Look for "busy-bee-vs is now active!" in Console
3. Check if webview view is registered in Activity Bar

### Colors don't update on theme change

1. Open browser DevTools in webview: `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
2. Check Console for theme update messages
3. Verify CSS variables are being updated in Elements tab

### Colors look wrong

1. Verify `vscode-tokens.css` is imported in `index.css`
2. Check Tailwind config has proper color mappings
3. Ensure no hard-coded colors (like `bg-gray-50`) remain

### Dashboard works standalone but not in VS Code

1. Check CSP (Content Security Policy) settings in webview
2. Verify asset paths are converted to webview URIs
3. Check for CORS issues with external resources

## Development Tips

### Live Reload in Extension

For faster development:
1. Keep dashboard dev server running (`npm run dev`)
2. In `ProductDashboardViewProvider.ts`, set `isDevelopment = true`
3. Webview will load from `localhost:5173` with hot reload

### Inspecting Theme Variables

In browser DevTools:
```javascript
// Check current theme
document.body.getAttribute('data-vscode-theme')

// Check CSS variable values
getComputedStyle(document.documentElement).getPropertyValue('--vscode-editor-background')

// List all VS Code variables
[...document.styleSheets]
  .flatMap(s => [...s.cssRules])
  .filter(r => r.style)
  .flatMap(r => [...r.style])
  .filter(prop => prop.startsWith('--vscode-'))
```

## Next Steps

Once verified:
1. Add backend API integration
2. Implement real product management features
3. Add more VS Code commands (refresh, settings, etc.)
4. Package extension for distribution

## Support

For issues:
- Check `VSCODE_THEME_INTEGRATION.md` for architecture details
- Review VS Code Extension API docs
- Check Tailwind CSS custom properties docs
