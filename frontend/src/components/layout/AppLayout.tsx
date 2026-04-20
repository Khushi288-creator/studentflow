import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import { useAuthStore } from '../../store/authStore'
import ChatWidget from '../smart/ChatWidget'

export default function AppLayout() {
  const navigate = useNavigate()
  const { user, clearAuth, setDarkMode, darkMode } = useAuthStore()

  return (
    <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      <Footer />

      {/* Small global keyboard affordance */}
      <div className="sr-only">
        <button
          onClick={() => {
            setDarkMode(!darkMode)
          }}
        >
          toggle dark
        </button>
        <button
          onClick={() => {
            clearAuth()
            navigate('/login')
          }}
        >
          logout
        </button>
        {user ? null : null}
      </div>

      <ChatWidget />
    </div>
  )
}

