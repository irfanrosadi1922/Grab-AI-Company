import App from './App'
import Login from './pages/Login'
import { PageLoading } from './components/ui'
import { AppStateProvider } from './state/AppState'
import { useAuth } from './state/Auth'

export default function Root() {
  const { user, loading, enabled } = useAuth()
  if (loading) {
    return (
      <div className="p-6">
        <PageLoading />
      </div>
    )
  }
  if (enabled && !user) return <Login />
  // key: ganti akun = muat ulang seluruh state, supaya data dua akun tidak tercampur.
  return (
    <AppStateProvider key={user?.id ?? 'local'} userId={user?.id}>
      <App />
    </AppStateProvider>
  )
}
