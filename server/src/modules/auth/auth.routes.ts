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
// O Supabase faz redirect 302 pra cá, e esta página usa JS pra abrir o scheme do app
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
  <title>Redirecionando...</title>
  <script>
    (function() {
      var hash = window.location.hash.substring(1);
      var appUrl = '${appUrl}';
      if (hash && appUrl) {
        window.location.href = appUrl + '#' + hash;
      }
    })();
  </script>
</head>
<body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;background:#F0EBE5;">
  <div style="text-align:center;padding:32px;">
    <h2 style="color:#5D7052;">Redirecionando para o PetLink...</h2>
    <p id="fallback" style="color:#78786C;word-break:break-all;margin-top:16px;"></p>
    <script>
      (function() {
        var hash = window.location.hash.substring(1);
        if (hash) {
          var link = document.getElementById('fallback');
          link.innerHTML = 'Se n\u00e3o abrir automaticamente, <a href="' + appUrl + '#' + hash + '">clique aqui</a>.';
        }
      })();
    </script>
  </div>
</body>
</html>
  `)
})

export default router