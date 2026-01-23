import React from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <DashboardPage />
    </ThemeProvider>
  );
}

export default App;
