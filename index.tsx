
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ConfirmProvider } from './components/ConfirmDialog.tsx';

import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Apply persisted UI theme (light/dark/system)
try {
    const stored = localStorage.getItem('ui_theme');
    const theme = stored || 'light';
    if (theme === 'dark') {
        document.documentElement.classList.add('theme-dark');
    } else if (theme === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) document.documentElement.classList.add('theme-dark');
    }
} catch (err) {
    // ignore
}

root.render(
    <React.StrictMode>
        <BrowserRouter>
            <ConfirmProvider>
                <App />
            </ConfirmProvider>
        </BrowserRouter>
    </React.StrictMode>
);