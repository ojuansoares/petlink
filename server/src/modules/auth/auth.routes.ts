import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { authController } from './auth.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/google', authController.google)
router.post('/facebook', authController.facebook)
router.post('/refresh', authController.refresh)
router.get('/me', authMiddleware, authController.me)
router.post('/logout', authMiddleware, authController.logout)

// ─── Armazenamento temporário de sessões de recovery ──────────────
// Quando o Supabase redireciona pra cá com os tokens na hash,
// guardamos num Map e passamos só um código pro app.
// O app busca os tokens por esse código e chama supabase.auth.setSession().
const recoveryStore = new Map<string, { accessToken: string; refreshToken: string; type: string }>()

// Limpa códigos expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, _] of recoveryStore) {
    // código com timestamp no início: "ts_random"
    const ts = parseInt(key.split('_')[0], 10)
    if (now - ts > 10 * 60 * 1000) recoveryStore.delete(key) // 10 min
  }
}, 5 * 60 * 1000)

// Rota de ponte para redirect do Supabase -> app
// O Supabase redireciona pra cá com os tokens na hash.
// Guardamos os tokens no Map e redirecionamos pro app com ?recovery_code=xxx
// (query param em vez de hash, porque o SO frequentemente perde a hash
//  ou query params ao abrir scheme customizado).
router.get('/redirect', (req: Request, res: Response) => {
  const appScheme = (req.query.scheme as string) || process.env.EXPO_SCHEME || 'petlink'
  const fullScheme = appScheme.includes('://') ? appScheme : `${appScheme}://`
  const appUrlBase = `${fullScheme}/--/auth/callback`

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecionando para o PetLink...</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      display:flex; justify-content:center; align-items:center;
      min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      background:#F0EBE5; padding:24px;
    }
    .card {
      text-align:center; max-width:360px; width:100%;
      background:#FFF; border-radius:20px; padding:40px 28px;
      box-shadow:0 4px 24px rgba(0,0,0,0.08);
    }
    .logo {
      width:80px; height:80px; margin:0 auto 20px;
      background:#5D7052; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:36px; color:#FFF; font-weight:700;
    }
    h1 { font-size:20px; color:#3A3A3A; margin-bottom:8px; }
    p  { font-size:14px; color:#78786C; line-height:1.5; margin-bottom:24px; }
    .btn {
      display:none; width:100%; padding:16px; font-size:17px; font-weight:600;
      background:#5D7052; color:#FFF; border:none; border-radius:14px;
      cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent;
    }
    .btn:active { background:#4A5C40; }
    .hidden { display:none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">P</div>
    <h1>Redirecionando para o PetLink</h1>
    <p id="statusMsg">Tentando abrir o aplicativo...</p>
    <button class="btn" id="openAppBtn">Abrir PetLink</button>
    <p class="hidden" id="fallbackMsg"></p>
  </div>
  <script>
    (function() {
      var hash = window.location.hash.substring(1);
      var appUrl = '${appUrlBase}';

      function doRedirect(finalUrl) {
        window.location.href = finalUrl;
      }

      if (hash) {
        // Extrai tokens da hash
        var params = new URLSearchParams(hash);
        var accessToken = params.get('access_token');
        var refreshToken = params.get('refresh_token');
        var type = params.get('type');

        // Manda os tokens pro servidor guardar via fetch
        fetch('/auth/store-recovery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: accessToken || '', refreshToken: refreshToken || '', type: type || '' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.code) {
            var finalUrl = appUrl + '?recovery_code=' + encodeURIComponent(data.code);
            doRedirect(finalUrl);

            setTimeout(function() {
              var btn = document.getElementById('openAppBtn');
              var msg = document.getElementById('statusMsg');
              btn.style.display = 'block';
              msg.textContent = 'Clique no botão para abrir o PetLink.';
              btn.onclick = function() { doRedirect(finalUrl); };
            }, 2000);
          }
        })
        .catch(function() {
          // Fallback: tenta passar direto mesmo
          var finalUrl = appUrl + '?' + hash;
          doRedirect(finalUrl);

          setTimeout(function() {
            var btn = document.getElementById('openAppBtn');
            var msg = document.getElementById('statusMsg');
            btn.style.display = 'block';
            msg.textContent = 'Clique no botão para abrir o PetLink.';
            btn.onclick = function() { doRedirect(finalUrl); };
          }, 2000);
        });
      } else {
        var msg = document.getElementById('statusMsg');
        msg.textContent = 'Link inválido ou expirado. Solicite um novo reset de senha.';
      }
    })();
  </script>
</body>
</html>
  `)
})

// Endpoint chamado pela página /redirect para armazenar os tokens
router.post('/store-recovery', (req: Request, res: Response) => {
  const { accessToken, refreshToken, type } = req.body
  if (!accessToken || !refreshToken) {
    return res.status(400).json({ error: 'accessToken e refreshToken são obrigatórios' })
  }
  const code = `${Date.now()}_${crypto.randomUUID()}`
  recoveryStore.set(code, { accessToken, refreshToken, type: type || 'recovery' })
  console.log(`[RECOVERY] Tokens armazenados com código ${code}`)
  return res.json({ code })
})

// App chama essa rota com o código pra obter os tokens e aplicar a sessão
router.get('/recovery-session', (req: Request, res: Response) => {
  const code = req.query.code as string
  if (!code) return res.status(400).json({ error: 'Código é obrigatório' })

  const session = recoveryStore.get(code)
  if (!session) return res.status(404).json({ error: 'Código inválido ou expirado' })

  recoveryStore.delete(code) // one-time use
  return res.json(session)
})

export default router
