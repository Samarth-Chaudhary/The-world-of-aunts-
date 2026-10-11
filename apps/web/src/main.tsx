/**
 * @file main.tsx
 * @description Frontend DOM entry point for NEXUS web application.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
