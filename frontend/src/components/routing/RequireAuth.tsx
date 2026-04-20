import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuthStore()

  if (!accessToken) return <Navigate to="/login" replace />
  if (!user) return <div className="p-6 text-slate-600">Loading...</div>
  return <>{children}</>
}

