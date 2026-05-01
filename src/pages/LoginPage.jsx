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
      {/* Painel esquerdo — branding */}
      <div
        className="login-brand-panel"
        style={{
          flex: '1 1 55%',
          background: '#2d4a2d',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Marca textual */}
        <div style={{ position: 'relative', zIndex: 2, color: '#ffffff' }}>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}>
            Porteira Adentro
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative', zIndex: 2, color: '#ffffff', maxWidth: 460 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#c8960c',
            marginBottom: 16,
          }}>
            Porteira Adentro
          </div>
          <h1 style={{
            fontSize: 38,
            fontWeight: 600,
            lineHeight: 1.15,
            margin: 0,
            letterSpacing: '-0.8px',
          }}>
            Inteligência operacional para o agronegócio.
          </h1>
          <p style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.75)',
            marginTop: 20,
            marginBottom: 0,
          }}>
            Acompanhe o desempenho das operações agrícolas, benchmarks de equipamentos e indicadores de eficiência em tempo real.
          </p>
        </div>

        {/* Rodapé */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.5px',
        }}>
          © {new Date().getFullYear()} Porteira Adentro
        </div>

        {/* Detalhe decorativo: linha marrom */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 6,
          background: '#603913',
          zIndex: 1,
        }} />
      </div>

      {/* Painel direito — login */}
      <div style={{
        flex: '1 1 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        background: '#ffffff',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}>
          <div>
            <div style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#1a1a1a',
              letterSpacing: '-0.4px',
              marginBottom: 6,
            }}>
              Acesse sua conta
            </div>
            <div style={{ fontSize: 13, color: '#6b6560', lineHeight: 1.5 }}>
              Entre com seu e-mail Porteira Adentro para acessar o painel.
            </div>
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
              gap: 12,
              padding: '12px 20px',
              background: '#ffffff',
              border: '1px solid #ddd8d2',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: '#1a1a1a',
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <GoogleIcon />
            {loading ? 'Redirecionando…' : 'Continuar com Google'}
          </button>

          {authError && (
            <div style={{
              background: '#fdf0f0',
              border: '1px solid #f0c0c0',
              borderRadius: 6,
              padding: '10px 14px',
              fontSize: 12,
              color: '#8b2020',
              lineHeight: 1.5,
            }}>
              {authError}
            </div>
          )}

          <div style={{
            paddingTop: 20,
            borderTop: '1px solid #ececec',
            fontSize: 12,
            color: '#6b6560',
            lineHeight: 1.6,
          }}>
            Acesso restrito a contas <strong style={{ color: '#2d4a2d', fontWeight: 600 }}>@porteiraadentro.com</strong>.
          </div>
        </div>
      </div>

      {/* Responsivo: empilha no mobile */}
      <style>{`
        @media (max-width: 860px) {
          [data-login-root] {
            flex-direction: column !important;
          }
          .login-brand-panel {
            flex: 0 0 auto !important;
            padding: 32px 28px !important;
            min-height: 320px;
          }
          .login-brand-panel h1 {
            font-size: 26px !important;
          }
        }
      `}</style>
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
