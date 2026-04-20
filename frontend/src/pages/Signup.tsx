import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { http } from '../api/http'
import { useAuthStore } from '../store/authStore'

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

type SignupForm = z.infer<typeof signupSchema>

// Signup is restricted — only accessible by Admin to create accounts
export default function Signup() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const signupMutation = useMutation({
    mutationFn: async (body: SignupForm) => {
      const res = await http.post('/auth/register', body)
      return res.data as { accessToken: string; user: any }
    },
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user })
      navigate('/role')
    },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200/60 bg-white/70 p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
        {/* Admin-only notice */}
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          🔒 Account creation is restricted to Admin only. Students and Teachers receive accounts from their Admin.
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Create Account</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Admin use only — create account and pick role.
        </p>

        <form
          className="mt-6 grid gap-4"
          onSubmit={handleSubmit((vals) => signupMutation.mutate(vals))}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Name</span>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
              placeholder="Full name"
              {...register('name')}
            />
            {errors.name ? <span className="text-xs text-rose-600">{errors.name.message}</span> : null}
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Email</span>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
              placeholder="name@example.com"
              type="email"
              {...register('email')}
            />
            {errors.email ? <span className="text-xs text-rose-600">{errors.email.message}</span> : null}
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Password</span>
            <div className="relative">
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                placeholder="Minimum 6 characters"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password ? (
              <span className="text-xs text-rose-600">{errors.password.message}</span>
            ) : null}
          </label>

          <button
            disabled={isSubmitting || signupMutation.isPending}
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {signupMutation.isPending ? 'Creating...' : 'Create Account'}
          </button>

          {signupMutation.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30">
              Signup failed. Try a different email.
            </div>
          ) : null}
        </form>

        <div className="mt-5 text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{' '}
          <Link className="font-semibold text-indigo-700 hover:text-indigo-800 dark:text-indigo-300" to="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
