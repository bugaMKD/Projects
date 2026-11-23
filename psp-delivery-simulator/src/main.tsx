import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthPreview } from './auth/AuthPreview';
import './styles.css';

// Step 3A: explicit auth preview only. Normal PSP remains on the original
// localStorage-based app until database persistence is integrated and tested.
const authPreview = new URLSearchParams(window.location.search).has('auth-preview');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{authPreview ? <AuthPreview /> : <App />}</React.StrictMode>,
);
