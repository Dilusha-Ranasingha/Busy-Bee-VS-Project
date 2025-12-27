/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // VS Code semantic colors
        vscode: {
          // Editor
          'editor-bg': 'var(--vscode-editor-background)',
          'editor-fg': 'var(--vscode-editor-foreground)',
          
          // Sidebar
          'sidebar-bg': 'var(--vscode-sideBar-background)',
          'sidebar-fg': 'var(--vscode-sideBar-foreground)',
          'sidebar-border': 'var(--vscode-sideBar-border)',
          
          // Button
          'button-bg': 'var(--vscode-button-background)',
          'button-fg': 'var(--vscode-button-foreground)',
          'button-hover': 'var(--vscode-button-hoverBackground)',
          'button-secondary-bg': 'var(--vscode-button-secondaryBackground)',
          'button-secondary-fg': 'var(--vscode-button-secondaryForeground)',
          'button-secondary-hover': 'var(--vscode-button-secondaryHoverBackground)',
          
          // Input
          'input-bg': 'var(--vscode-input-background)',
          'input-fg': 'var(--vscode-input-foreground)',
          'input-border': 'var(--vscode-input-border)',
          'input-placeholder': 'var(--vscode-input-placeholderForeground)',
          
          // List
          'list-active-bg': 'var(--vscode-list-activeSelectionBackground)',
          'list-active-fg': 'var(--vscode-list-activeSelectionForeground)',
          'list-hover-bg': 'var(--vscode-list-hoverBackground)',
          'list-hover-fg': 'var(--vscode-list-hoverForeground)',
          
          // Panel
          'panel-bg': 'var(--vscode-panel-background)',
          'panel-border': 'var(--vscode-panel-border)',
          
          // Widget
          'widget-bg': 'var(--vscode-editorWidget-background)',
          'widget-border': 'var(--vscode-editorWidget-border)',
          
          // Text
          'foreground': 'var(--vscode-foreground)',
          'description': 'var(--vscode-descriptionForeground)',
          'error': 'var(--vscode-errorForeground)',
          'focus': 'var(--vscode-focusBorder)',
          'link': 'var(--vscode-textLink-foreground)',
          
          // Badge
          'badge-bg': 'var(--vscode-badge-background)',
          'badge-fg': 'var(--vscode-badge-foreground)',
        },
        
        // Custom brand colors
        brand: {
          primary: 'var(--brand-primary)',
          'primary-hover': 'var(--brand-primary-hover)',
          'primary-light': 'var(--brand-primary-light)',
          accent: 'var(--brand-accent)',
          'accent-hover': 'var(--brand-accent-hover)',
          'accent-light': 'var(--brand-accent-light)',
        },
      },
      boxShadow: {
        'vscode': 'var(--vscode-widget-shadow)',
      },
    },
  },
  plugins: [],
};
