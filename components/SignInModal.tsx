import React, { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useSession, signIn } from '@/services/authClient'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const SignInModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await signIn.email({ email, password }, {
        onError: (ctx) => setError(ctx.error.message),
      })
      if (!error) onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-[#0E0E10] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"><XMarkIcon className="w-5 h-5" /></button>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">Sign In</h2>
          {session && <div className="text-xs text-green-500 mb-3">Already signed in as {session.user.email}</div>}
          {error && <div className="text-xs text-red-500 mb-3">{error}</div>}
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white outline-none focus:border-zinc-600" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-white text-black font-bold hover:bg-blue-50 disabled:opacity-50">{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}