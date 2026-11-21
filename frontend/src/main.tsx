import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AuthProvider } from './auth'
import { SocietyProvider } from './society'
import { ThemeProvider } from './theme'
import { ToastProvider } from './components/UI'
import InstallBanner from './components/InstallBanner'
import OnlineBanner from './components/OnlineBanner'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SocietyProvider>
              <ToastProvider>
                <OnlineBanner />
                <InstallBanner />
                <App />
              </ToastProvider>
            </SocietyProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
