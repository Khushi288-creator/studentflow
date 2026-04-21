import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../../store/authStore'

export default function RequireRole({
  roles,
  children,
}: {
  roles?: UserRole[]
  children: ReactNode
}) {
  const { accessToken, user } = useAuthStore()

  if (!accessToken) return <Navigate to="/login" replace />
  if (!user) return <div className="p-6 text-slate-600">Loading...</div>
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

