# Finanças da Família

App web (PWA, instala no celular) para o casal controlar gastos, receitas/pró-labores e investimentos na mesma conta, com lançamento rápido por mensagem no Telegram.

- **Painel**: entradas, saídas e saldo do mês, gastos por categoria.
- **Lançamentos**: despesas e receitas (pró-labore etc.), filtros por tipo e pessoa, edição.
- **Investimentos**: carteira, aportes/resgates e saldo informado no fim do mês.
- **Projeção**: meta (ex.: R$ 3.000/mês a 1,5% a.m.) ano a ano × patrimônio real.
- **Telegram**: “mercado 230,50 no cartão” vira um lançamento (interpretado pelo Claude), com botões *Desfazer* e *Categoria*.

Stack: Next.js 16 · Supabase (Postgres + Auth + RLS) · grammY · Claude API · Recharts · Tailwind.

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. **SQL Editor** › cole e rode `supabase/migrations/0001_init.sql`.
3. **Authentication › URL Configuration**: em *Site URL* coloque a URL do app (ex.: `https://financas-xyz.vercel.app`) e em *Redirect URLs* adicione `https://SEU-APP/auth/callback` e `http://localhost:3000/auth/callback`.
4. (Recomendado) **Authentication › Email Templates › Magic Link**: acrescente `Código: {{ .Token }}` ao texto. Assim dá para entrar digitando o código — útil no PWA do iPhone, onde o link abre no Safari.
5. **Project Settings › API**: copie URL, `anon key` e `service_role key`.

## 2. Telegram

1. No Telegram, fale com o **@BotFather** › `/newbot` › copie o token.
2. Invente um segredo para o webhook (letras, números, `_` e `-`).

## 3. Claude API

Crie uma chave em [console.anthropic.com](https://console.anthropic.com). O padrão é `claude-opus-5-5` com esforço baixo; para gastar ainda menos, defina `ANTHROPIC_MODEL=claude-haiku-5-5`.

## 4. Rodar localmente

```bash
cp .env.local.example .env.local   # e preencha
npm install
npm run dev                        # http://localhost:3000
npm test                           # testes unitários
```

## 5. Publicar (Vercel)

1. Suba a pasta para um repositório no GitHub e importe na [Vercel](https://vercel.com).
2. Em *Environment Variables*, cadastre as mesmas variáveis do `.env.local`.
3. Depois do deploy, entre no app › **Ajustes › Telegram › Configurar webhook** (faz uma vez).

Para testar o bot sem publicar, exponha o `npm run dev` com um túnel HTTPS (ex.: `cloudflared tunnel --url http://localhost:3000`) e use o botão *Configurar webhook* pela URL do túnel.

## 6. Primeiro uso

1. Você entra com seu e-mail e cria a família.
2. Em **Ajustes** aparece o **código de convite**. Sua esposa entra com o e-mail dela, escolhe “Tenho um código” e digita esse código — a partir daí vocês veem os mesmos dados.
3. Cada um conecta o próprio Telegram: **Ajustes › Telegram › Gerar código** e envie `/vincular CÓDIGO` para o bot. Os lançamentos ficam registrados com o nome de quem mandou.
4. No celular: abra o app no navegador › *Adicionar à tela inicial*.

## Como o “real” da projeção é calculado

Para cada investimento, no fim de cada mês:
- se você informou o saldo daquele mês (**Investimentos › Atualizar saldo**), usa esse valor;
- senão, usa o último saldo informado + aportes − resgates feitos depois dele.

Ou seja: só com aportes, a linha “Real” mostra o que foi investido; informando o saldo da corretora uma vez por mês, ela passa a incluir o rendimento de verdade.

## Estrutura

```
app/(app)/            telas logadas: painel, lancamentos, investimentos, projecao, configuracoes
app/api/telegram/     webhook do bot
lib/projection.ts     juros compostos da meta
lib/portfolio.ts      patrimônio real mês a mês
lib/ai/               interpretação das mensagens (Claude)
lib/telegram/bot.ts   comandos e botões do bot
supabase/migrations/  tabelas, RLS e funções
```
