import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthPreview } from './auth/AuthPreview';
import './styles.css';

// Step 3A: explicit auth preview only. Normal PSP remains on the original
// localStorage-based app until database persistence is integrated and tested.
const params = new URLSearchParams(window.location.search);
const authPreview = params.has('auth-preview');
const cloudWorkspace = params.has('cloud-workspace');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{cloudWorkspace ? <AuthPreview fullWorkspace /> : authPreview ? <AuthPreview /> : <App />}</React.StrictMode>,
);
