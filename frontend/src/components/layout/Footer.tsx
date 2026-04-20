import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/60 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Student<span className="text-indigo-600">Flow</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Hackathon-ready student management system with role-based dashboards and smart extras.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            <div className="font-semibold text-slate-900 dark:text-slate-50">Explore</div>
            <Link className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300" to="/">
              Home
            </Link>
            <Link className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300" to="/events">
              Events
            </Link>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-slate-900 dark:text-slate-50">Support</div>
            <Link className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300" to="/contact">
              Contact
            </Link>
            <Link
              className="block text-slate-600 hover:text-indigo-600 dark:text-slate-300"
              to="/notifications"
            >
              Notifications
            </Link>
          </div>
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-50">Demo</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Login and try Student/Teacher/Admin role dashboards. UI is responsive and clean by default.
          </p>
          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} StudentFlow. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

