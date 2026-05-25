import { Router, Request, Response } from 'express'
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

// Rota de ponte para redirect do Supabase -> app
// O Supabase faz redirect pra cá com os tokens na hash, e esta página
// mostra um botão para o usuário tocar — a interação manual permite que
// o navegador abra o scheme customizado (exp://, petlink://) sem bloqueio.
router.get('/redirect', (req: Request, res: Response) => {
  const appScheme = (req.query.scheme as string) || process.env.EXPO_SCHEME || 'petlink'
  const fullScheme = appScheme.includes('://') ? appScheme : `${appScheme}://`
  const appUrl = `${fullScheme}--/auth/callback`
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
      display:block; width:100%; padding:16px; font-size:17px; font-weight:600;
      background:#5D7052; color:#FFF; border:none; border-radius:14px;
      cursor:pointer; text-decoration:none; -webkit-tap-highlight-color:transparent;
    }
    .btn:active { background:#4A5C40; }
    .fallback {
      display:block; margin-top:16px; font-size:13px; color:#78786C;
    }
    .fallback a { color:#5D7052; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">P</div>
    <h1>Redirecionando para o PetLink</h1>
    <p>Toque no botão abaixo para voltar ao aplicativo.</p>
    <button class="btn" id="openAppBtn">Abrir PetLink</button>
    <span class="fallback" id="fallback"></span>
  </div>
  <script>
    (function() {
      var hash = window.location.hash.substring(1);
      var fullUrl = '${appUrl}' + (hash ? '#' + hash : '');

      if (fullUrl) {
        document.getElementById('openAppBtn').addEventListener('click', function() {
          window.location.href = fullUrl;
        });
      }

      if (hash) {
        var fb = document.getElementById('fallback');
        fb.innerHTML = 'Se não funcionar, <a href="' + fullUrl + '">clique aqui</a>.';
      }
    })();
  </script>
</body>
</html>
  `)
})

export default router