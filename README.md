# Flappy Copo — site 100% estático (espelho do flappygamepay.site)

Cópia estática completa do site `https://flappygamepay.site`, com **HTML, JavaScript, CSS e
imagens baixados localmente**. Funciona sem servidor de aplicação: basta servir arquivos
estáticos.

> **Base path.** O projeto está configurado para o **GitHub Pages de projeto** em
> **`/flappye`** (`https://ofertaboa.github.io/flappye/`). Todos os caminhos absolutos
> levam esse prefixo.
> Se for publicar **na raiz** de um domínio (Netlify, Cloudflare Pages, VPS), rode antes:
> `node tools\setup.js --root`

## Rotas

Todas as rotas são relativas ao base path (`/flappye` abaixo):

| Rota | Arquivo |
|---|---|
| `/` | `index.html` |
| `/login` | `login/index.html` |
| `/register` | `register/index.html` |
| `/dashboard` | `dashboard/index.html` |
| `/admin` | `admin/index.html` |
| `/admin-login` | `admin-login/index.html` |
| `/manager` | `manager/index.html` |
| `/manager-login` | `manager-login/index.html` |
| `/manager-register` | `manager-register/index.html` |
| `/game` | `game/index.html` |
| qualquer outra rota | `404.html` |

Não há redirects: o site original responde 200 em todas as rotas acima
(`robots.txt` e `sitemap.xml` também davam 404 no original).

## Limitação importante — a API (PHP)

O backend do site original é **PHP** (`api/*.php` no domínio `flappygamepay.site`).
GitHub Pages e Netlify **não executam PHP**, então:

| Funciona | Não funciona |
|---|---|
| Landing, login, cadastro, dashboard, admin, manager, jogo (telas) | Login, cadastro, saldo, depósito, saque, PIX, jogo valendo dinheiro |
| Todas as imagens/JS/CSS (locais) | Qualquer chamada a `api/*.php` |

`platform/js/shared/api.js` aponta para `https://flappygamepay.site/api/...`, mas o
servidor de origem **não envia `Access-Control-Allow-Origin`** (o preflight responde 500),
então o navegador bloqueia as chamadas de qualquer forma. Para o backend funcionar é
preciso hospedar num servidor com PHP (ou reescrever a API).

## Deploy — GitHub Pages (padrão)

1. No repositório: **Settings → Pages → Source: Deploy from a branch**, branch `master`,
   pasta `/ (root)`.
2. O arquivo **`.nojekyll`** está incluído.
3. O site fica em `https://ofertaboa.github.io/flappye/`.

## Deploy — Netlify / Cloudflare Pages

1. Rode **`node tools\setup.js --root`** (troca a base de `/flappye` para a raiz).
2. Conecte o repositório ou arraste a pasta em `app.netlify.com`.
   - Netlify: `netlify.toml` já define `publish = "."`.
   - Cloudflare Pages: `wrangler.toml` já define `pages_build_output_dir = "."`.
3. Para voltar ao base do GitHub Pages: `node tools\setup.js`.

As duas plataformas servem o `404.html` para rotas inexistentes.

## Rodando localmente

```
INICIAR-LOCAL.bat
```

Abre em `http://localhost:8090/flappye/` — a mesma estrutura de caminho do GitHub Pages.
Porta: `set PORT=3000` antes de rodar.

## Base path — caminho de publicação

O base path fica em **`tools/base.js`** (hoje: `/flappye`).

| Onde vai publicar | Base | Comando |
|---|---|---|
| GitHub Pages de projeto (`usuario.github.io/flappye/`) | `/flappye` | já configurado |
| Netlify, Cloudflare Pages, VPS, domínio próprio | `""` (raiz) | `node tools\setup.js --root` |
| Outro nome de repositório | `/outro-nome` | edite `tools\base.js` e rode `node tools\setup.js` |

`tools/setup.js` reescreve os pontos que dependem do base
(`platform/js/shared/{boot-redirect.js,paths.js}`, a origem da API em
`platform/js/shared/api.js` e o `<script src>` do boot em todos os HTML).
É **idempotente** — pode rodar quantas vezes precisar.

## Ferramentas (`tools/`)

| Arquivo | O que faz |
|---|---|
| `setup.js` | aplica o base path (idempotente) |
| `server.js` | servidor local com o mesmo base path do Pages |
| `check.js` | 10 rotas respondem 200 + todas as refs resolvem |
| `headless.js` | renderiza no Chrome e classifica erros de console |
| `netlog.js` | captura requisições com 4xx/5xx |
| `verify.js` | procura caminhos absolutos sem o base |
| `scan.js` | scan compartilhado de refs (comentários removidos) |
| `refs.js` | relatório detalhado das refs |
| `mirror.js` | rastreia o site de origem e baixa os arquivos |
| `assets.js` | baixa assets faltantes para o lugar certo |
| `audit.js` | audita assets contra a origem |
| `inv.js` / `medialist.js` / `cta.js` / `dump.js` | inventário e diagnóstico |

Validação atual: `check.js` **0 falhas**, `headless.js` **0 falhas**,
`verify.js` **0 defeitos**.

## Nota sobre áudio/vídeo

O jogo **não usa arquivos de áudio/vídeo**: os efeitos são gerados em tempo real com a
**Web Audio API** (`js/audio.js`, `js/bgm.js`, `js/audioContext.js`). Não existe `.mp3`,
`.mp4` nem playlist `.m3u8` no site original (todos os caminhos testados respondem 404
lá também) — não há o que baixar.
