import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { http } from '../api/http'
import { useAuthStore } from '../store/authStore'
import { useModalClose } from '../hooks/useModalClose'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await http.post('/auth/login', { loginId: loginId.trim(), password })
      return res.data as { accessToken: string; user: { id: string; name: string; email: string; role: string } }
    },
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user as any })
      // Auto-redirect based on role — no role selection page
      navigate('/dashboard', { replace: true })
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? 'Invalid ID or password')
    },
  })

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const res = await http.post('/auth/forgot-password', { email: forgotEmail })
      return res.data as { resetToken: string }
    },
    onSuccess: (d) => setResetToken(d.resetToken),
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      await http.post('/auth/reset-password', { token: resetToken, newPassword })
    },
    onSuccess: () => {
      setForgotOpen(false)
      setResetToken(null)
      setNewPassword('')
      setForgotEmail('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!loginId.trim() || !password) { setError('Enter your ID and password'); return }
    loginMutation.mutate()
  }

  useModalClose(forgotOpen, () => { setForgotOpen(false); setResetToken(null) })

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl border border-slate-200/60 bg-white/70 p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Login</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Enter your ID and password to access your dashboard.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
              Login ID
            </span>
            <input
              value={loginId}
              onChange={e => { setLoginId(e.target.value); setError('') }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
              placeholder="STU001 / TCH001 / ADM001 or email"
              autoComplete="username"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Password</span>
            <div className="relative">
              <input
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                placeholder="Your password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
              />
              <button type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                onClick={() => setShowPassword(s => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button type="submit" disabled={loginMutation.isPending}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {loginMutation.isPending ? 'Signing in...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">How to login:</div>
          <div>Students → use ID given by admin (e.g. STU001)</div>
          <div>Teachers → use ID given by admin (e.g. TCH001)</div>
          <div>Admin → use your email or ADM001</div>
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setForgotOpen(false); setResetToken(null) }}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200/60 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-950"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Reset Password</h2>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => { setForgotOpen(false); setResetToken(null) }}>✕</button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Email</span>
                <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="your@email.com" type="email" />
              </label>
              <button disabled={forgotMutation.isPending} onClick={() => forgotMutation.mutate()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {forgotMutation.isPending ? 'Requesting...' : 'Get Reset Token'}
              </button>
              {resetToken && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                  <div className="font-semibold text-xs text-indigo-700 dark:text-indigo-300">Reset Token</div>
                  <div className="mt-1 break-all font-mono text-xs">{resetToken}</div>
                  <label className="mt-3 grid gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-50">New Password</span>
                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
                  </label>
                  <button disabled={resetMutation.isPending || !newPassword} onClick={() => resetMutation.mutate()}
                    className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                    {resetMutation.isPending ? 'Resetting...' : 'Update Password'}
                  </button>
                  {resetMutation.isSuccess && <p className="mt-2 text-xs text-emerald-600">Password updated. You can login now.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
