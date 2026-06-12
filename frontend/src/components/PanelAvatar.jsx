import React from 'react'
import { motion } from 'framer-motion'

export default function PanelAvatar({ member, isActive = true, showIntro = false }) {
  if (!member) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3"
    >
      <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${member.color} flex items-center justify-center shadow-lg`}>
        <span className="text-xs font-black text-white z-10">{member.initials}</span>
        {isActive && (
          <>
            <motion.div
              animate={{ opacity: [0, 0.4, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-xl bg-white"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-950 z-20" />
          </>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-white">{member.name}</p>
        <p className="text-[11px] text-gray-400">{member.role}</p>
      </div>
      {showIntro && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className={`ml-2 px-3 py-1.5 rounded-xl ${member.bgColor} border ${member.borderColor} text-xs ${member.textColor} max-w-[200px]`}
        >
          <span>&quot;{member.intro}&quot;</span>
        </motion.div>
      )}
    </motion.div>
  )
}

export function PanelRoster({ members, activeId }) {
  return (
    <div className="flex items-center gap-2">
      {members.map(m => (
        <div
          key={m.id}
          className={`relative w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-[10px] font-black text-white transition-all duration-300 ${activeId === m.id ? 'ring-2 ring-white/60 scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-40 grayscale-[30%]'}`}
          title={`${m.name} — ${m.role}`}
        >
          <span className="z-10">{m.initials}</span>
          {activeId === m.id && (
            <motion.div
              className="absolute -bottom-2 flex items-end gap-[2px] h-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div className="w-1 bg-white/80 rounded-t-full" animate={{ height: ['40%', '100%', '40%'] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} />
              <motion.div className="w-1 bg-white/80 rounded-t-full" animate={{ height: ['80%', '30%', '80%'] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
              <motion.div className="w-1 bg-white/80 rounded-t-full" animate={{ height: ['50%', '90%', '50%'] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
}
