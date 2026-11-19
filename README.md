# Currículo em Dia

Gerador de currículos em português do Brasil. A landing é estática e o editor mantém um rascunho no navegador, com prévia paginada e exportação A4 em três modelos.

## Desenvolvimento

Requer Node.js 22 LTS a partir da versão 22.12 ou Node.js 24 LTS.

```sh
npm ci
npm run dev
```

No PowerShell, use `npm.cmd` se a política de execução bloquear `npm.ps1`.

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

A suíte de navegador serve o conteúdo de `dist/`. Gere um build novo antes de executá-la. Para usar um Chrome instalado, defina `PLAYWRIGHT_CHANNEL=chrome`.

## Implantação no Cloudflare Pages

1. **Preparar o build.** Configure `SITE_URL` com a origem pública, incluindo `https://`. Execute `npm ci`, `npm test` e `npm run build`. Confirme o domínio em `dist/sitemap.xml` e na tag `canonical` de `dist/index.html`.
2. **Validar em prévia.** Após disponibilizar o código no GitHub, conecte o repositório ao Pages. Use `npm run build` como comando e `dist` como diretório de saída. Configure Node.js 22 LTS ou 24 LTS no ambiente de build. Use um deploy de prévia para conferir a landing, o editor, a persistência e o download de um PDF no celular.
3. **Publicar.** Associe o domínio ao projeto e promova o build validado para produção. Confira `/`, `/editor/`, `/robots.txt` e `/sitemap.xml` no domínio público. Use o histórico de deployments do Pages para retornar à versão anterior, se necessário.

O build local funciona sem `SITE_URL`. Nesse caso, omite o sitemap e a tag canônica.

## Adicionar uma página editorial

Crie um `index.html` no diretório correspondente à rota e registre o arquivo e a rota em `src/site/pages.ts`. O registro inclui a página no build e no sitemap. Use conteúdo, título e descrição próprios para cada guia.
