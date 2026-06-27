import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Overview     from './pages/Overview'
import Traces       from './pages/Traces'
import TraceDetail  from './pages/TraceDetail'
import Cost         from './pages/Cost'
import Quality      from './pages/Quality'
import Prompts      from './pages/Prompts'
import Alerts       from './pages/Alerts'
import Settings     from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#070b14' }}>
          <Sidebar />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <TopBar />
            <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <Routes>
                <Route path="/"                element={<Overview />}     />
                <Route path="/traces"          element={<Traces />}       />
                <Route path="/traces/:id"      element={<TraceDetail />}  />
                <Route path="/cost"     element={<Cost />}     />
                <Route path="/quality"  element={<Quality />}  />
                <Route path="/prompts"  element={<Prompts />}  />
                <Route path="/alerts"   element={<Alerts />}   />
                <Route path="/settings" element={<Settings />} />
                <Route path="*"         element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
