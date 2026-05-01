import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logoPorteira from '../assets/logo-porteira.svg'

export default function LoginPage({ authError }) {
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f5f2',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        padding: '40px 36px', width: '100%', maxWidth: 360,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#2d4a2d', borderRadius: 8, padding: '10px 20px' }}>
            <img src={logoPorteira} alt="Porteira Adentro" style={{ height: 56, width: 'auto', display: 'block' }} />
          </div>
          <div style={{ fontSize: 13, color: '#6b6560' }}>Relatório de Operações Agrícolas</div>
        </div>

        {authError && (
          <div style={{
            background: '#fdf0f0', border: '1px solid #e5b8b8', borderRadius: 6,
            padding: '8px 12px', fontSize: 12, color: '#8b2020', width: '100%', textAlign: 'center',
          }}>
            {authError}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '10px 16px',
            background: '#ffffff', border: '1px solid #d4cec8', borderRadius: 6,
            fontSize: 13, fontWeight: 500, color: '#2c2a27',
            cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <GoogleIcon />
          {loading ? 'Redirecionando…' : 'Entrar com Google'}
        </button>

        <div style={{ fontSize: 11, color: '#9b9590', textAlign: 'center' }}>
          Acesso restrito a @porteiraadentro.com e @dspartners.com.br
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
