import { create } from 'zustand'
import toast from 'react-hot-toast'

const useAppStore = create((set) => ({
  // Resume state
  resumeData: null,
  setResumeData: (data) => set({ resumeData: data }),

  // Interview state
  interviewSession: null,
  setInterviewSession: (session) => set({ interviewSession: session }),

  interviewResults: null,
  setInterviewResults: (results) => set({ interviewResults: results }),

  // Settings
  selectedRole: 'software_engineer',
  setSelectedRole: (role) => set({ selectedRole: role }),

  difficulty: 'medium',
  setDifficulty: (d) => set({ difficulty: d }),

  candidateName: '',
  setCandidateName: (name) => set({ candidateName: name }),

  // Dark mode
  darkMode: localStorage.getItem('darkMode') !== 'false',
  toggleDark: () =>
    set((state) => {
      const next = !state.darkMode
      localStorage.setItem('darkMode', next)
      if (next) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      return { darkMode: next }
    }),

  // Actions
  clearSession: () => set({ interviewSession: null, interviewResults: null }),
}))

// Apply dark mode on initial load
if (localStorage.getItem('darkMode') !== 'false') {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

export default useAppStore


