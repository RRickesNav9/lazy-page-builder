import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logoPorteira from '../assets/logo-porteira.svg'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f5f2',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        padding: '40px 36px', width: '100%', maxWidth: 380,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ background: '#2d4a2d', borderRadius: 8, padding: '10px 20px', marginBottom: 14 }}>
            <img src={logoPorteira} alt="Porteira Adentro" style={{ height: 56, width: 'auto', display: 'block' }} />
          </div>
          <div style={{ fontSize: 13, color: '#6b6560' }}>Relatório de Operações Agrícolas</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#4a3728' }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                border: '1px solid #d4cec8', borderRadius: 6, padding: '9px 12px',
                fontSize: 13, color: '#2c2a27', outline: 'none',
                background: '#fafaf8',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#4a3728' }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                border: '1px solid #d4cec8', borderRadius: 6, padding: '9px 12px',
                fontSize: 13, color: '#2c2a27', outline: 'none',
                background: '#fafaf8',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fdf0f0', border: '1px solid #e5b8b8', borderRadius: 6,
              padding: '8px 12px', fontSize: 12, color: '#8b2020',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, background: loading ? '#5a7a5a' : '#2d4a2d', color: '#ffffff',
              border: 'none', borderRadius: 6, padding: '10px 0',
              fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
