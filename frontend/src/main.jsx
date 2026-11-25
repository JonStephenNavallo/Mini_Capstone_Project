import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import { ThemeContextProvider } from './shared/theme/ThemeContext';
import { BreadcrumbProvider } from './shared/utils/BreadcrumbContext';
import { watchOtherSessions } from './shared/auth/sessionApi.js';
import './index.css';
import App from './App.jsx';

registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

watchOtherSessions(queryClient);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeContextProvider>
          <CssBaseline />
          <BreadcrumbProvider>
            <App />
          </BreadcrumbProvider>
        </ThemeContextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
