import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, User, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginUser, registerUser } from '../api/client'
import AppLogo from '../components/AppLogo'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login') // 'login' or 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    const trimmedUser = username.trim()
    const trimmedPass = password.trim()

    if (!trimmedUser || !trimmedPass) {
      toast.error('Username and password are required')
      return
    }

    if (activeTab === 'register') {
      if (trimmedPass.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }
      if (trimmedPass !== confirmPassword.trim()) {
        toast.error('Passwords do not match')
        return
      }
    }

    setLoading(true)
    try {
      if (activeTab === 'login') {
        const { data } = await loginUser(trimmedUser, trimmedPass)
        localStorage.setItem('token', data.token)
        localStorage.setItem('username', data.user.username)
        toast.success(data.message || 'Logged in successfully!')
        navigate('/dashboard')
      } else {
        const { data } = await registerUser(trimmedUser, trimmedPass)
        toast.success(data.message || 'Account created! Please log in.')
        setActiveTab('login')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'An error occurred'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06101b] text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(140deg,rgba(20,184,166,0.12),transparent_34%),linear-gradient(315deg,rgba(251,191,36,0.08),transparent_36%),linear-gradient(180deg,#06101b_0%,#0a1624_50%,#07111f_100%)]" />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo and header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <AppLogo size={48} showText={false} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-200 via-cyan-300 to-amber-200 bg-clip-text text-transparent">
            AstraPrep AI
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Elevate your career with real-time AI interview coaching
          </p>
        </div>

        {/* Auth Glassmorphic Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Tab selector */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/5 relative">
            <button
              onClick={() => {
                setActiveTab('login')
                setPassword('')
                setConfirmPassword('')
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 z-10 ${
                activeTab === 'login' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('register')
                setPassword('')
                setConfirmPassword('')
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 z-10 ${
                activeTab === 'register' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-teal-700/60 to-cyan-700/60 border border-teal-500/30"
              initial={false}
              animate={{
                left: activeTab === 'login' ? '4px' : '50%',
                right: activeTab === 'login' ? '50%' : '4px',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label htmlFor="auth-username" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  required
                  placeholder="john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-base dark:input-base pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base dark:input-base pl-10"
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {activeTab === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Shield className="w-4 h-4" />
                    </span>
                    <input
                      id="auth-confirm-password"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-base dark:input-base pl-10"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? (
                <span>Loading...</span>
              ) : activeTab === 'login' ? (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Register <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
