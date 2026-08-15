import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

// i18n must initialise before the first render, or components mount with raw keys and
// flash them for a frame.
import '@/i18n';
import '@/styles/index.css';

import { ToastProvider } from '@/components/ui/toast/ToastProvider';
import { store } from '@/app/store';
import { startServiceWorker } from '@/hooks/useAppUpdate';
import { startInstallPromptCapture } from '@/hooks/useInstallPrompt';
import { router } from '@/routes/router';

// Registered here, not from a component, so it runs for every visitor — including one
// sitting on the login screen who has never signed in. A worker registered only inside
// the authenticated shell leaves the login page uncached and the app uninstallable until
// after a first successful login. See the note in useAppUpdate.
startServiceWorker();

// Chrome fires `beforeinstallprompt` once, moments after load. The Settings page is a
// lazy route, so importing the hook only from there meant nothing was listening when the
// event arrived and the install offer never appeared. Same reason as the line above.
startInstallPromptCapture();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found in index.html');

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      {/* Outside the router so a toast survives navigation — "Property deleted · Undo"
          must not vanish because the delete sent the user back to the list. */}
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </Provider>
  </StrictMode>,
);
