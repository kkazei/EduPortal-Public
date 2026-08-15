import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import AuthProvider from './components/AuthProvider'
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'react-hot-toast';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Call early so caching is enabled ASAP
let updateToastId = null;

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (updateToastId) return;

    updateToastId = toast.custom(
      (toastInstance) => (
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-indigo-100 bg-white p-4 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">New version available</p>
            <p className="text-sm text-gray-500">Reload to update EduPortal and refresh offline files.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastInstance.id);
                updateToastId = null;
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Later
            </button>
            <button
              type="button"
              onClick={async () => {
                toast.dismiss(toastInstance.id);
                updateToastId = null;
                await updateSW(true);
              }}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Reload
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center',
      }
    );
  },
  onOfflineReady() {
    toast.success('EduPortal is ready for offline use.', {
      id: 'offline-ready',
      position: 'top-center',
    });
  },
  onRegisteredSW(_, registration) {
    if (!registration) return;

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    });
  },
});