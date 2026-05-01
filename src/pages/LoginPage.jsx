import { useState } from 'react'
import { supabase } from '../lib/supabase'

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
    <div
      data-login-root
      style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Painel esquerdo — verde, minimalista */}
      <div
        className="login-brand-panel"
        style={{
          flex: '1 1 55%',
          background: '#2d4a2d',
          padding: '40px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.3px',
        }}>
          Porteira Adentro
        </div>

        <div style={{
          color: '#ffffff',
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.2,
          letterSpacing: '-0.6px',
          maxWidth: 420,
        }}>
          Painel de telemetria
        </div>

        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.3px',
        }}>
          © {new Date().getFullYear()}
        </div>
      </div>

      {/* Painel direito — login */}
      <div style={{
        flex: '1 1 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        background: '#ffffff',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1a1a1a',
            letterSpacing: '-0.2px',
          }}>
            Entrar
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#f7f5f2' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#ffffff' }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '11px 18px',
              background: '#ffffff',
              border: '1px solid #ddd8d2',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: '#1a1a1a',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <GoogleIcon />
            {loading ? 'Redirecionando…' : 'Entrar com Google'}
          </button>

          {authError && (
            <div style={{ fontSize: 12, color: '#8b2020', lineHeight: 1.5 }}>
              {authError}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#9b9590', lineHeight: 1.6 }}>
            Acesso restrito · @porteiraadentro.com
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          [data-login-root] {
            flex-direction: column !important;
          }
          .login-brand-panel {
            flex: 0 0 auto !important;
            padding: 28px 24px !important;
            min-height: 200px;
            gap: 32px;
          }
        }
      `}</style>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
