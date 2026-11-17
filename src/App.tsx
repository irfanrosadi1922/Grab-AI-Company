import { Component, Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout'
import { ErrorState, PageLoading } from './components/ui'
import { useApp } from './state/AppState'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Employees = lazy(() => import('./pages/Employees'))
const Meeting = lazy(() => import('./pages/Meeting'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Marketing = lazy(() => import('./pages/Marketing'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Stores = lazy(() => import('./pages/Stores'))
const Reports = lazy(() => import('./pages/Reports'))
const Approvals = lazy(() => import('./pages/Approvals'))
const Office = lazy(() => import('./pages/Office'))
const HabboAssetsPage = lazy(() => import('./pages/HabboAssetsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return <ErrorState title="Halaman ini gagal dimuat" desc={this.state.error.message || 'Terjadi kesalahan tak terduga.'} onRetry={() => this.setState({ error: null })} />
    return this.props.children
  }
}

export default function App() {
  const { ready, sync } = useApp()
  if (ready && sync === 'loadError') return <ErrorState title="Data tidak bisa dimuat dari Supabase" desc="Tidak ada yang disimpan atau ditimpa. Periksa koneksi internet lalu coba lagi." onRetry={() => window.location.reload()} />
  if (!ready) return <div className="p-6"><PageLoading /></div>
  return (
    <Boundary>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="meeting" element={<Meeting />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="stores" element={<Stores />} />
            <Route path="reports" element={<Reports />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="office" element={<Office />} />
            <Route path="assets" element={<HabboAssetsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </Boundary>
  )
}
