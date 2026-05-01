import { useState } from 'react'
import { supabase } from '../lib/supabase'

const FEATURES = [
  {
    label: 'Análise Geral',
    desc: 'Distribuição de tempo, eficiência e rendimento por equipamento, operador e safra.',
  },
  {
    label: 'Benchmark de Frota',
    desc: 'Comparação de métricas entre cliente e grupo Porteira por modelo de máquina.',
  },
  {
    label: 'Relatórios Diários',
    desc: 'PDFs gerados automaticamente por propriedade a partir de dados Solinftec e John Deere.',
  },
]

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
      {/* ── Painel esquerdo ── */}
      <div
        className="login-brand-panel"
        style={{
          flex: '1 1 55%',
          background: '#2d4a2d',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 48,
        }}
      >
        {/* Topo */}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Porteira Adentro
        </div>

        {/* Centro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div style={{ color: '#ffffff', fontSize: 28, fontWeight: 500, letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 14 }}>
              Telemetria de operações agrícolas
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.65, maxWidth: 400 }}>
              Plataforma interna de monitoramento e análise de desempenho de frota. Dados processados
              diariamente a partir de Solinftec e John Deere.
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.label} style={{ display: 'flex', gap: 14 }}>
                <div style={{
                  width: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)',
                  flexShrink: 0, marginTop: 3, alignSelf: 'stretch',
                }} />
                <div>
                  <div style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, marginBottom: 3, letterSpacing: '0.01em' }}>
                    {f.label}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em' }}>
          © {new Date().getFullYear()} · Uso interno
        </div>
      </div>

      {/* ── Painel direito ── */}
      <div style={{
        flex: '1 1 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        background: '#ffffff',
      }}>
        <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.3px', marginBottom: 6 }}>
              Entrar
            </div>
            <div style={{ fontSize: 12, color: '#6b6560', lineHeight: 1.5 }}>
              Use sua conta Google corporativa para acessar o painel.
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

          <div style={{ fontSize: 11, color: '#b0aaa4', lineHeight: 1.6 }}>
            Acesso restrito · @porteiraadentro.com
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          [data-login-root] { flex-direction: column !important; }
          .login-brand-panel {
            flex: 0 0 auto !important;
            padding: 32px 24px !important;
            gap: 28px !important;
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
