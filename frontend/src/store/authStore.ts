import { create } from 'zustand'

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent' | 'exam_department'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  darkMode: boolean
  setAuth: (params: { accessToken: string; user: AuthUser }) => void
  clearAuth: () => void
  setDarkMode: (enabled: boolean) => void
  hydrateFromStorage: () => void
}

const ACCESS_TOKEN_KEY = 'sms_access_token'
const DARK_MODE_KEY = 'sms_dark_mode'

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  darkMode: false,

  setAuth: ({ accessToken, user }) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    set({ accessToken, user })
  },

  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    set({ accessToken: null, user: null })
  },

  setDarkMode: (enabled) => {
    localStorage.setItem(DARK_MODE_KEY, enabled ? '1' : '0')
    set({ darkMode: enabled })
    // Keep class-based toggles simple for Tailwind.
    document.documentElement.classList.toggle('dark', enabled)
  },

  hydrateFromStorage: () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    const dark = localStorage.getItem(DARK_MODE_KEY) === '1'
    set({ accessToken: token, darkMode: dark, user: null })
    document.documentElement.classList.toggle('dark', dark)
  },
}))

