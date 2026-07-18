import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Mic, BarChart2, Home, ChevronLeft, Brain,
  ChevronRight, LogOut, Sun, Moon, Briefcase, Video
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import AppLogo from './AppLogo'

const NAV_ITEMS = [
  { to: '/dashboard',           icon: Home,      label: 'Dashboard',       badge: null },
  { to: '/dashboard/resume',    icon: FileText,  label: 'Resume Analysis', badge: null },
  { to: '/dashboard/interview', icon: Briefcase, label: 'Interview',       badge: null },
  { to: '/dashboard/video-interview', icon: Video, label: '3D Interview', badge: '3D' },
  { to: '/dashboard/coach',     icon: Mic,       label: 'Coach',           badge: 'New' },
  { to: '/dashboard/quiz',      icon: Brain,     label: 'Quiz Practice',   badge: 'New' },
  { to: '/dashboard/analytics', icon: BarChart2, label: 'Analytics',       badge: null },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { darkMode, toggleDark } = useApp()

  return (
    <motion.aside
      className={clsx(
        'relative flex flex-col h-full glass-panel select-none',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
      initial={false}
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-white/5',
        collapsed && 'justify-center px-0'
      )}>
        <AppLogo size={38} showText={!collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => clsx(
              'sidebar-link group',
              isActive && 'active',
              collapsed ? 'justify-center px-0' : ''
            )}
            title={label}
          >
            <div className="relative">
              <Icon className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                   className="flex-1 truncate"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!collapsed && badge && (
                <motion.span
                  className={clsx(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded-md',
                    badge === '3D'
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                      : 'bg-primary-100 text-primary-700 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-500/15'
                  )}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  {badge}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className={clsx(
        'border-t border-gray-100 dark:border-white/5 p-3 space-y-1',
        collapsed && 'flex flex-col items-center'
      )}>
        <button
          onClick={toggleDark}
          className={clsx('sidebar-link w-full group', collapsed ? 'justify-center px-0' : '')}
          title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          {darkMode
            ? <Sun className="w-5 h-5 shrink-0 text-amber-500 transition-transform duration-200 group-hover:rotate-45" />
            : <Moon className="w-5 h-5 shrink-0 text-slate-700 transition-transform duration-200 group-hover:-rotate-12" />
          }
          {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('username')
            window.location.href = '/'
          }}
          className={clsx(
            'sidebar-link w-full group text-red-500 hover:text-red-600 hover:bg-red-500/10',
            collapsed ? 'justify-center px-0' : ''
          )}
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse button */}
      <motion.button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-surface-800 border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all z-10"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          : <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        }
      </motion.button>
    </motion.aside>
  )
}
