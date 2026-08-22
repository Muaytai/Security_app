// Safeguard window.fetch accessor behavior
try {
  const _orig = typeof window !== 'undefined' ? window.fetch : null;
  let _current = _orig;
  const desc = {
    get: () => _current || _orig,
    set: (v: typeof fetch) => {
      _current = v;
    },
    configurable: true,
    enumerable: true,
  };
  if (typeof Window !== 'undefined' && Window.prototype) {
    try {
      Object.defineProperty(Window.prototype, 'fetch', desc);
    } catch {}
  }
  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'fetch', desc);
    } catch {}
  }
  if (typeof globalThis !== 'undefined') {
    try {
      Object.defineProperty(globalThis, 'fetch', desc);
    } catch {}
  }
} catch {}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
