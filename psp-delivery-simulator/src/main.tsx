import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthPreview } from './auth/AuthPreview';
import './styles.css';

// PSP v2: authenticated cloud workspace is the default entry point.
// The previous localStorage workspace and auth diagnostic view are available
// only in the Vite development environment. Neither deletes local data.
const params = new URLSearchParams(window.location.search);
const showLocalWorkspace = import.meta.env.DEV && params.has('local-workspace');
const showAuthPreview = import.meta.env.DEV && params.has('auth-preview');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {showLocalWorkspace ? <App /> : <AuthPreview fullWorkspace={!showAuthPreview} />}
  </React.StrictMode>,
);
