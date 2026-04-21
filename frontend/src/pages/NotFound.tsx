import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="rounded-3xl border border-slate-200/60 bg-white/70 p-10 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
        <div className="text-6xl font-extrabold text-indigo-600">404</div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The route you opened doesn’t exist. Use the navigation to continue.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

