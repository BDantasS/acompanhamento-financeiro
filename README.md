# Finanças da Família

App web (PWA, instala no celular) para controlar gastos, receitas/pró-labores e investimentos da família, com projeção da meta de patrimônio.

**Abrir o app:** https://bdantass.github.io/acompanhamento-financeiro/

- **Painel**: entradas, saídas e saldo do mês, gastos por categoria.
- **Lançamentos**: despesas e receitas, filtros por tipo e pessoa, edição.
- **Investimentos**: carteira, aportes/resgates e saldo informado no fim do mês.
- **Projeção**: meta (ex.: R$ 3.000/mês a 1,5% a.m.) ano a ano × patrimônio real, com gráfico.
- **Ajustes**: pessoas, categorias, backup.

Feito só com HTML, CSS e JavaScript, sem servidor e sem instalação. Hospedado no GitHub Pages.

## Onde ficam os dados

**No próprio aparelho**, no armazenamento do navegador. Nada é enviado para a internet.

- Cada celular tem seus próprios dados. Para passar para outro aparelho, use **Ajustes › Exportar backup** e depois **Restaurar backup** no outro.
- Limpar os dados do navegador apaga os lançamentos. Exporte um backup de vez em quando (o painel lembra você).

## Como o "real" da projeção é calculado

Para cada investimento, no fim de cada mês:
- se você informou o saldo daquele mês (**Investimentos › Atualizar saldo**), usa esse valor;
- senão, usa o último saldo informado + aportes − resgates feitos depois dele.

Ou seja: só com aportes, a linha "Real" mostra o que foi investido; informando o saldo da corretora uma vez por mês, ela passa a incluir o rendimento de verdade.

## Instalar no celular

- **Android (Chrome):** menu ⋮ › *Adicionar à tela inicial*.
- **iPhone (Safari):** botão compartilhar › *Adicionar à Tela de Início*.

## Estrutura

```
index.html      página única (as telas são trocadas pelo JavaScript)
styles.css      visual (modo claro e escuro)
js/dados.js     armazenamento, formatação e cálculos (juros compostos, patrimônio real)
js/app.js       telas e navegação
sw.js           cache para funcionar sem internet
manifest.json   dados para instalar como app
icons/          ícones
```

Para testar no computador, sirva a pasta com qualquer servidor estático, por exemplo `npx serve .`, e abra o endereço mostrado. Abrir o `index.html` direto do disco não ativa o modo offline.

## Versão anterior

A versão com servidor (Next.js + Supabase + bot do Telegram + Claude) está guardada na tag [`versao-nextjs`](../../tree/versao-nextjs).
