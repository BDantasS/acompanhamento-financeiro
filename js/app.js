// Telas e navegação do app
carregar();

const $ = s => document.querySelector(s);
const view = $('#view');
let mesSel = mesAtual();
let filtroTipo = 'todos', filtroPessoa = 'todas';
let emDinheiroDeHoje = false;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600);
}

function topo(titulo, extra = '') {
  $('#titulo').textContent = titulo;
  $('#topoExtra').innerHTML = extra;
}

function seletorMes() {
  return `<div class="mes-picker">
    <button data-mes="-1" aria-label="Mês anterior">&#8249;</button>
    <span>${fmtMes(mesSel)}</span>
    <button data-mes="1" aria-label="Próximo mês">&#8250;</button></div>`;
}
$('#topoExtra').addEventListener('click', e => {
  const b = e.target.closest('[data-mes]');
  if (b) { mesSel = addMeses(mesSel, Number(b.dataset.mes)); rota(); }
});

function abrirModal(titulo, html, aoAbrir) {
  $('#modalTitulo').textContent = titulo;
  $('#modalCorpo').innerHTML = html;
  $('#modal').hidden = false;
  aoAbrir && aoAbrir($('#modalCorpo'));
}
function fecharModal() { $('#modal').hidden = true; $('#modalCorpo').innerHTML = ''; }
$('#modalFechar').onclick = fecharModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) fecharModal(); });

function fab(fn) {
  const b = document.createElement('button');
  b.className = 'fab'; b.textContent = '+'; b.setAttribute('aria-label', 'Novo lançamento');
  b.onclick = fn; document.body.appendChild(b);
}

// ---------- Roteador ----------
let telaAtual = '';
function rota() {
  let [, tela] = (location.hash || '#/painel').split('/');
  if (!DB.config.configurado) tela = 'boasvindas';
  telaAtual = tela;
  document.body.classList.toggle('boasvindas', tela === 'boasvindas');
  document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('ativo', a.dataset.tab === tela));
  document.querySelector('.fab')?.remove();
  ({ painel: telaPainel, lancamentos: telaLancamentos, investimentos: telaInvestimentos,
    projecao: telaProjecao, ajustes: telaAjustes, boasvindas: telaBoasVindas }[tela] || telaPainel)();
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); rota(); });

// ---------- Utilitários de dados ----------
const nomeCategoria = id => DB.categorias.find(c => c.id === id)?.nome || '';
const categoriasDo = tipo => DB.categorias.filter(c => c.tipo === tipo)
  .sort((a, b) => (a.nome === 'Outros') - (b.nome === 'Outros') || a.nome.localeCompare(b.nome, 'pt-BR'));
const lancamentosDoMes = mes => DB.lancamentos.filter(l => l.data.slice(0, 7) === mes)
  .sort((a, b) => b.data.localeCompare(a.data) || (b.criadoEm || '').localeCompare(a.criadoEm || ''));
const temPessoas = () => DB.config.pessoas.length > 1;

function itemLancamento(l) {
  const cat = nomeCategoria(l.categoriaId);
  const detalhes = [l.descricao ? cat || 'Sem categoria' : '', l.pagamento, temPessoas() ? l.pessoa : ''].filter(Boolean);
  const sinal = l.tipo === 'receita' ? '+' : '−';
  return `<button class="lista-item" data-lanc="${l.id}">
    <div class="info">
      <div class="t">${esc(l.descricao || cat || 'Sem categoria')}</div>
      <div class="s">${esc(detalhes.join(' · ') || fmtData(l.data))}</div>
    </div>
    <div class="v ${l.tipo === 'receita' ? 'pos' : ''}">${sinal} ${fmtBRL(l.valor)}</div>
  </button>`;
}
function ligarLancamentos(raiz) {
  raiz.querySelectorAll('[data-lanc]').forEach(b => b.onclick = () =>
    formLancamento(DB.lancamentos.find(l => l.id === b.dataset.lanc)));
}

// ---------- Painel ----------
function telaPainel() {
  topo('Painel', seletorMes());
  const lancs = lancamentosDoMes(mesSel);
  const r = resumoMes(lancs, nomeCategoria);
  const maior = r.porCategoria[0]?.total || 0;
  const patrimonio = patrimonioAtual();
  const precisaBackup = DB.lancamentos.length >= 10 &&
    (!DB.config.ultimoBackup || difMeses(DB.config.ultimoBackup.slice(0, 7), mesAtual()) >= 1);

  view.innerHTML = `
    <div class="resumo">
      <div class="destaque"><small>Saldo de ${fmtMesLongo(mesSel)}</small>
        <strong class="${r.saldo >= 0 ? 'pos' : 'neg'}">${fmtBRL(r.saldo)}</strong>
        ${r.entradas > 0 ? `<em>${Math.round(r.saidas / r.entradas * 100)}% das entradas foram gastos</em>` : ''}</div>
      <div><small>Entradas</small><strong class="pos">${fmtBRL(r.entradas)}</strong></div>
      <div><small>Saídas</small><strong class="neg">${fmtBRL(r.saidas)}</strong></div>
    </div>
    ${precisaBackup ? `<div class="card"><h3>Lembrete de backup</h3>
      <p class="dica" style="margin:0">Seus dados ficam só neste aparelho. Faça uma cópia de segurança de vez em quando.</p>
      <div class="botoes"><a class="btn secundario" href="#/ajustes">Fazer backup</a></div></div>` : ''}
    <div class="card"><h3>Gastos por categoria</h3>
      ${r.porCategoria.length ? `<ul class="barras">${r.porCategoria.map(c => `
        <li><div class="linha"><span>${esc(c.nome)}</span><span class="num"><b>${fmtBRL(c.total)}</b></span></div>
        <div class="trilho"><div style="width:${(c.total / maior * 100).toFixed(1)}%"></div></div></li>`).join('')}</ul>`
        : '<div class="vazio">Sem despesas neste mês.</div>'}
    </div>
    <div class="card"><h3>Últimos lançamentos ${lancs.length > 6 ? '<a href="#/lancamentos">Ver todos</a>' : ''}</h3>
      ${lancs.length ? `<div class="lista">${lancs.slice(0, 6).map(itemLancamento).join('')}</div>`
        : '<div class="vazio"><b>📝</b>Nenhum lançamento neste mês.<br>Toque no <strong>+</strong> para lançar.</div>'}
    </div>
    ${DB.investimentos.length ? `<a class="card lista-item" href="#/investimentos" style="padding:14px">
      <div class="info"><div class="s">Patrimônio investido</div><div class="t num">${fmtBRL(patrimonio.total)}</div></div>
      <div class="v">&#8250;</div></a>` : ''}`;
  ligarLancamentos(view);
  fab(() => formLancamento());
}

// ---------- Lançamentos ----------
function telaLancamentos() {
  topo('Lançamentos', seletorMes());
  const doMes = lancamentosDoMes(mesSel);
  if (filtroPessoa !== 'todas' && !DB.config.pessoas.includes(filtroPessoa)) filtroPessoa = 'todas';
  const lista = doMes.filter(l => (filtroTipo === 'todos' || l.tipo === filtroTipo) &&
    (filtroPessoa === 'todas' || l.pessoa === filtroPessoa));
  const total = lista.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0);

  // Agrupa por dia
  const dias = [];
  for (const l of lista) {
    if (!dias.length || dias.at(-1).data !== l.data) dias.push({ data: l.data, itens: [] });
    dias.at(-1).itens.push(l);
  }
  const nomeDia = d => {
    if (d === hoje()) return 'Hoje';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  view.innerHTML = `
    <div class="filtros">
      ${[['todos', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas']].map(([v, t]) =>
        `<button data-tipo="${v}" class="${filtroTipo === v ? 'ativo' : ''}">${t}</button>`).join('')}
      ${temPessoas() ? DB.config.pessoas.map(p =>
        `<button data-pessoa="${esc(p)}" class="${filtroPessoa === p ? 'ativo' : ''}">${esc(p)}</button>`).join('') : ''}
    </div>
    <div class="card">
      ${lista.length ? `
        <h3>${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}
          <span class="num ${total >= 0 ? 'pos' : 'neg'}" style="text-transform:none;letter-spacing:0;font-size:14px">${total >= 0 ? '+' : '−'} ${fmtBRL(Math.abs(total))}</span></h3>
        <div class="lista">${dias.map(g => `<div class="dia">${esc(nomeDia(g.data))}</div>${g.itens.map(itemLancamento).join('')}`).join('')}</div>`
        : `<div class="vazio"><b>📝</b>${doMes.length ? 'Nenhum lançamento com esse filtro.' : 'Nenhum lançamento neste mês.<br>Toque no <strong>+</strong> para lançar.'}</div>`}
    </div>`;
  view.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => { filtroTipo = b.dataset.tipo; telaLancamentos(); });
  view.querySelectorAll('[data-pessoa]').forEach(b => b.onclick = () => {
    filtroPessoa = filtroPessoa === b.dataset.pessoa ? 'todas' : b.dataset.pessoa; telaLancamentos();
  });
  ligarLancamentos(view);
  fab(() => formLancamento());
}

function formLancamento(l) {
  const editando = !!l;
  let tipo = l?.tipo || 'despesa';
  // Novo lançamento no mês que está sendo visto: hoje, ou o dia 1 se for outro mês.
  const dataPadrao = mesSel === mesAtual() ? hoje() : mesSel + '-01';
  const pessoaPadrao = l?.pessoa ?? (DB.config.ultimaPessoa || DB.config.pessoas[0] || '');

  abrirModal(editando ? 'Editar lançamento' : 'Novo lançamento', `
    <div class="segmento" id="fTipo">
      <button type="button" data-t="despesa" class="despesa">Despesa</button>
      <button type="button" data-t="receita" class="receita">Receita / pró-labore</button>
    </div>
    <label for="fValor">Valor (R$)</label>
    <input id="fValor" class="valor" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${l ? numCampo(l.valor) : ''}">
    <div class="duas">
      <div><label for="fData">Data</label><input id="fData" type="date" value="${l?.data || dataPadrao}"></div>
      <div><label for="fCat">Categoria</label><select id="fCat"></select></div>
    </div>
    <label for="fDesc">Descrição</label>
    <input id="fDesc" placeholder="Opcional (ex.: Supermercado X)" value="${esc(l?.descricao || '')}">
    <div class="duas">
      <div><label for="fPag">Pagamento</label><select id="fPag"><option value="">—</option>
        ${FORMAS_PAGAMENTO.map(p => `<option ${l?.pagamento === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      ${temPessoas() ? `<div><label for="fPessoa">Quem</label><select id="fPessoa">
        ${DB.config.pessoas.map(p => `<option ${p === pessoaPadrao ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>` : ''}
    </div>
    <div class="botoes">
      ${editando ? '<button class="btn perigo" id="fExcluir">Excluir</button>' : ''}
      <button class="btn" id="fSalvar">${editando ? 'Salvar' : 'Adicionar'}</button>
    </div>`, corpo => {
    const selCat = corpo.querySelector('#fCat');
    const montarTipo = () => {
      corpo.querySelectorAll('#fTipo button').forEach(b => b.classList.toggle('ativo', b.dataset.t === tipo));
      const atual = l?.tipo === tipo ? l.categoriaId : '';
      selCat.innerHTML = `<option value="">Sem categoria</option>` + categoriasDo(tipo)
        .map(c => `<option value="${c.id}" ${c.id === atual ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
    };
    montarTipo();
    corpo.querySelectorAll('#fTipo button').forEach(b => b.onclick = () => { tipo = b.dataset.t; montarTipo(); });
    if (!editando) setTimeout(() => corpo.querySelector('#fValor').focus(), 50);

    corpo.querySelector('#fSalvar').onclick = () => {
      const valor = r2(lerValor(corpo.querySelector('#fValor').value));
      const data = corpo.querySelector('#fData').value;
      if (!(valor > 0)) { toast('Informe um valor maior que zero'); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { toast('Informe a data'); return; }
      const pessoa = corpo.querySelector('#fPessoa')?.value ?? (DB.config.pessoas[0] || '');
      const dados = {
        tipo, valor, data, pessoa,
        categoriaId: selCat.value || null,
        pagamento: corpo.querySelector('#fPag').value || null,
        descricao: corpo.querySelector('#fDesc').value.trim()
      };
      if (editando) Object.assign(l, dados);
      else DB.lancamentos.push({ id: uid(), criadoEm: new Date().toISOString(), ...dados });
      DB.config.ultimaPessoa = pessoa;
      salvar(); fecharModal();
      if (!editando && data.slice(0, 7) !== mesSel) mesSel = data.slice(0, 7);
      toast(editando ? 'Lançamento atualizado' : 'Lançamento salvo ✓');
      rota();
    };
    corpo.querySelector('#fExcluir')?.addEventListener('click', () => {
      if (!confirm('Excluir este lançamento?')) return;
      DB.lancamentos = DB.lancamentos.filter(x => x.id !== l.id);
      salvar(); fecharModal(); toast('Lançamento excluído'); rota();
    });
  });
}

// ---------- Investimentos ----------
function saldoInvestimento(id, mes = mesAtual()) {
  return serieReal([id], DB.movimentos.filter(m => m.investimentoId === id),
    DB.saldos.filter(s => s.investimentoId === id), mes, mes)[0] || { saldo: 0, aportado: 0 };
}
function patrimonioAtual() {
  const linhas = DB.investimentos.map(inv => ({ inv, ...saldoInvestimento(inv.id) }));
  return {
    linhas,
    total: r2(linhas.reduce((s, x) => s + x.saldo, 0)),
    aportado: r2(linhas.reduce((s, x) => s + x.aportado, 0))
  };
}

function telaInvestimentos() {
  topo('Investimentos');
  const p = patrimonioAtual();
  const ganho = r2(p.total - p.aportado);
  const nomeInv = id => DB.investimentos.find(i => i.id === id)?.nome || '—';
  const movs = [...DB.movimentos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30);
  const ativos = DB.investimentos.filter(i => !i.arquivado);
  const ordenadas = [...p.linhas].sort((a, b) => a.inv.arquivado - b.inv.arquivado);

  view.innerHTML = `
    <div class="resumo">
      <div class="destaque"><small>Patrimônio</small><strong>${fmtBRL(p.total)}</strong></div>
      <div><small>Total aportado</small><strong>${fmtBRL(p.aportado)}</strong><em>Aportes − resgates</em></div>
      <div><small>Rendimento</small><strong class="${ganho >= 0 ? 'pos' : 'neg'}">${fmtBRL(ganho)}</strong>
        ${p.aportado > 0 ? `<em>${(ganho / p.aportado * 100).toFixed(1).replace('.', ',')}% sobre o aportado</em>` : ''}</div>
    </div>
    <div class="acoes-inv">
      <button class="btn" id="bMov" ${ativos.length ? '' : 'disabled style="opacity:.5"'}><span>&#8645;</span>Aporte / resgate</button>
      <button class="btn secundario" id="bSaldo" ${ativos.length ? '' : 'disabled style="opacity:.5"'}><span>&#128221;</span>Atualizar saldo</button>
      <button class="btn secundario" id="bNovo"><span>&#65291;</span>Novo investimento</button>
    </div>
    <div class="card"><h3>Carteira</h3>
      ${ordenadas.length ? `<div class="lista">${ordenadas.map(({ inv, saldo, aportado }) => {
        const ult = DB.saldos.filter(s => s.investimentoId === inv.id).sort((a, b) => b.mes.localeCompare(a.mes))[0];
        return `<button class="lista-item ${inv.arquivado ? 'arquivado' : ''}" data-inv="${inv.id}">
          <div class="info"><div class="t">${esc(inv.nome)}</div>
            <div class="s">${esc([inv.tipo, inv.instituicao].filter(Boolean).join(' · '))} · ${ult ? 'saldo de ' + fmtMes(ult.mes) : 'sem saldo informado'}</div></div>
          <div class="v">${fmtBRL(saldo)}<small>aportado ${fmtBRL(aportado)}</small></div></button>`;
      }).join('')}</div>` : '<div class="vazio"><b>💰</b>Nenhum investimento ainda.<br>Toque em <strong>Novo investimento</strong>.</div>'}
    </div>
    <div class="card"><h3>Últimos movimentos</h3>
      ${movs.length ? `<div class="lista">${movs.map(m => `
        <button class="lista-item" data-mov="${m.id}">
          <div class="info"><div class="t">${esc(nomeInv(m.investimentoId))}</div>
            <div class="s">${esc([fmtData(m.data), m.obs, temPessoas() ? m.pessoa : ''].filter(Boolean).join(' · '))}</div></div>
          <div class="v ${m.tipo === 'aporte' ? 'pos' : 'neg'}">${m.tipo === 'aporte' ? '+' : '−'} ${fmtBRL(m.valor)}</div>
        </button>`).join('')}</div>` : '<div class="vazio">Nenhum aporte registrado.</div>'}
    </div>
    <p class="dica">Dica: informe o saldo que aparece na corretora no fim de cada mês (<b>Atualizar saldo</b>). Assim o rendimento real entra no patrimônio e na projeção.</p>`;

  $('#bMov').onclick = () => formMovimento();
  $('#bSaldo').onclick = () => formSaldo();
  $('#bNovo').onclick = () => formInvestimento();
  view.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => formInvestimento(DB.investimentos.find(i => i.id === b.dataset.inv)));
  view.querySelectorAll('[data-mov]').forEach(b => b.onclick = () => {
    const m = DB.movimentos.find(x => x.id === b.dataset.mov);
    if (!confirm(`Excluir ${m.tipo === 'aporte' ? 'aporte' : 'resgate'} de ${fmtBRL(m.valor)} em ${fmtData(m.data)}?`)) return;
    DB.movimentos = DB.movimentos.filter(x => x.id !== m.id);
    salvar(); toast('Movimento excluído'); telaInvestimentos();
  });
}

function opcoesInvestimento(sel) {
  return DB.investimentos.filter(i => !i.arquivado)
    .map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.nome)}</option>`).join('');
}

function formMovimento() {
  let tipo = 'aporte';
  abrirModal('Aporte / resgate', `
    <div class="segmento" id="mTipo">
      <button type="button" data-t="aporte" class="receita ativo">Aporte</button>
      <button type="button" data-t="resgate" class="despesa">Resgate</button>
    </div>
    <label for="mInv">Investimento</label><select id="mInv">${opcoesInvestimento(DB.config.ultimoInvestimento)}</select>
    <label for="mValor">Valor (R$)</label>
    <input id="mValor" class="valor" inputmode="decimal" placeholder="0,00" autocomplete="off">
    <div class="duas">
      <div><label for="mData">Data</label><input id="mData" type="date" value="${hoje()}"></div>
      <div><label for="mObs">Observação</label><input id="mObs" placeholder="Opcional"></div>
    </div>
    ${temPessoas() ? `<label for="mPessoa">Quem</label><select id="mPessoa">
      ${DB.config.pessoas.map(p => `<option ${p === DB.config.ultimaPessoa ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : ''}
    <div class="botoes"><button class="btn" id="mSalvar">Registrar</button></div>`, corpo => {
    corpo.querySelectorAll('#mTipo button').forEach(b => b.onclick = () => {
      tipo = b.dataset.t;
      corpo.querySelectorAll('#mTipo button').forEach(x => x.classList.toggle('ativo', x === b));
    });
    setTimeout(() => corpo.querySelector('#mValor').focus(), 50);
    corpo.querySelector('#mSalvar').onclick = () => {
      const valor = r2(lerValor(corpo.querySelector('#mValor').value));
      const data = corpo.querySelector('#mData').value;
      const investimentoId = corpo.querySelector('#mInv').value;
      if (!(valor > 0)) { toast('Informe um valor maior que zero'); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { toast('Informe a data'); return; }
      const pessoa = corpo.querySelector('#mPessoa')?.value ?? (DB.config.pessoas[0] || '');
      DB.movimentos.push({ id: uid(), investimentoId, tipo, valor, data, pessoa,
        obs: corpo.querySelector('#mObs').value.trim() });
      DB.config.ultimoInvestimento = investimentoId;
      DB.config.ultimaPessoa = pessoa;
      salvar(); fecharModal(); toast(tipo === 'aporte' ? 'Aporte registrado ✓' : 'Resgate registrado ✓'); rota();
    };
  });
}

function formSaldo() {
  abrirModal('Atualizar saldo', `
    <p class="dica" style="margin-top:0">Informe o saldo que aparece na corretora/banco no fim do mês. É ele que mostra o rendimento real.</p>
    <label for="sInv">Investimento</label><select id="sInv">${opcoesInvestimento(DB.config.ultimoInvestimento)}</select>
    <div class="duas">
      <div><label for="sMes">Mês</label><input id="sMes" type="month" value="${mesAtual()}"></div>
      <div><label for="sValor">Saldo (R$)</label><input id="sValor" inputmode="decimal" placeholder="0,00" autocomplete="off"></div>
    </div>
    <p class="dica" id="sAtual"></p>
    <div class="botoes"><button class="btn" id="sSalvar">Salvar saldo</button></div>`, corpo => {
    const inv = corpo.querySelector('#sInv'), mes = corpo.querySelector('#sMes');
    const mostrar = () => {
      if (!/^\d{4}-\d{2}$/.test(mes.value)) return;
      const est = saldoInvestimento(inv.value, mes.value);
      const inf = DB.saldos.find(s => s.investimentoId === inv.value && s.mes === mes.value);
      corpo.querySelector('#sAtual').textContent = inf ? `Já informado para ${fmtMes(mes.value)}: ${fmtBRL(inf.saldo)} (será substituído).`
        : `Estimativa atual para ${fmtMes(mes.value)}: ${fmtBRL(est.saldo)}.`;
    };
    inv.onchange = mostrar; mes.onchange = mostrar; mostrar();
    corpo.querySelector('#sSalvar').onclick = () => {
      const saldo = r2(lerValor(corpo.querySelector('#sValor').value));
      if (!(saldo >= 0)) { toast('Informe o saldo'); return; }
      if (!/^\d{4}-\d{2}$/.test(mes.value)) { toast('Informe o mês'); return; }
      DB.saldos = DB.saldos.filter(s => !(s.investimentoId === inv.value && s.mes === mes.value));
      DB.saldos.push({ investimentoId: inv.value, mes: mes.value, saldo });
      DB.config.ultimoInvestimento = inv.value;
      salvar(); fecharModal(); toast('Saldo atualizado ✓'); rota();
    };
  });
}

function formInvestimento(inv) {
  const editando = !!inv;
  const saldos = editando ? DB.saldos.filter(s => s.investimentoId === inv.id).sort((a, b) => b.mes.localeCompare(a.mes)) : [];
  abrirModal(editando ? inv.nome : 'Novo investimento', `
    <label for="iNome">Nome</label>
    <input id="iNome" placeholder="CDB Banco X 110% CDI" value="${esc(inv?.nome || '')}">
    <div class="duas">
      <div><label for="iTipo">Tipo</label><select id="iTipo">
        ${TIPOS_INVESTIMENTO.map(t => `<option ${inv?.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label for="iInst">Instituição</label><input id="iInst" placeholder="Opcional" value="${esc(inv?.instituicao || '')}"></div>
    </div>
    ${saldos.length ? `<label>Saldos informados</label><div class="lista">${saldos.map(s => `
      <div class="lista-item" style="cursor:default"><div class="info"><div class="t">${fmtMes(s.mes)}</div></div>
        <div class="v">${fmtBRL(s.saldo)}</div>
        <button class="icon-btn" data-delsaldo="${s.mes}" aria-label="Excluir saldo de ${fmtMes(s.mes)}" style="color:var(--suave);font-size:16px">&#10005;</button></div>`).join('')}</div>` : ''}
    <div class="botoes">
      ${editando ? `<button class="btn secundario" id="iArquivar">${inv.arquivado ? 'Reativar' : 'Arquivar'}</button>
        <button class="btn perigo" id="iExcluir">Excluir</button>` : ''}
      <button class="btn" id="iSalvar" style="flex-basis:100%">${editando ? 'Salvar' : 'Criar'}</button>
    </div>`, corpo => {
    if (!editando) setTimeout(() => corpo.querySelector('#iNome').focus(), 50);
    corpo.querySelector('#iSalvar').onclick = () => {
      const nome = corpo.querySelector('#iNome').value.trim();
      if (!nome) { toast('Dê um nome ao investimento'); return; }
      const dados = { nome, tipo: corpo.querySelector('#iTipo').value, instituicao: corpo.querySelector('#iInst').value.trim() };
      if (editando) Object.assign(inv, dados);
      else DB.investimentos.push({ id: uid(), arquivado: false, criadoEm: new Date().toISOString(), ...dados });
      salvar(); fecharModal(); toast(editando ? 'Investimento atualizado' : 'Investimento criado ✓'); rota();
    };
    corpo.querySelectorAll('[data-delsaldo]').forEach(b => b.onclick = () => {
      if (!confirm(`Excluir o saldo informado de ${fmtMes(b.dataset.delsaldo)}?`)) return;
      DB.saldos = DB.saldos.filter(s => !(s.investimentoId === inv.id && s.mes === b.dataset.delsaldo));
      salvar(); formInvestimento(inv); rota();
    });
    corpo.querySelector('#iArquivar')?.addEventListener('click', () => {
      inv.arquivado = !inv.arquivado;
      salvar(); fecharModal(); toast(inv.arquivado ? 'Investimento arquivado' : 'Investimento reativado'); rota();
    });
    corpo.querySelector('#iExcluir')?.addEventListener('click', () => {
      const n = DB.movimentos.filter(m => m.investimentoId === inv.id).length;
      if (!confirm(`Excluir "${inv.nome}"${n ? ` e seus ${n} movimentos` : ''}? Isso não pode ser desfeito.\n\nSe só parou de investir nele, prefira Arquivar.`)) return;
      DB.investimentos = DB.investimentos.filter(i => i.id !== inv.id);
      DB.movimentos = DB.movimentos.filter(m => m.investimentoId !== inv.id);
      DB.saldos = DB.saldos.filter(s => s.investimentoId !== inv.id);
      salvar(); fecharModal(); toast('Investimento excluído'); rota();
    });
  });
}

// ---------- Projeção ----------
function telaProjecao() {
  topo('Projeção');
  const m = DB.meta;
  view.innerHTML = `
    <div class="card"><h3>Sua meta</h3>
      <div class="duas">
        <div><label for="pAporte">Aporte mensal (R$)</label><input id="pAporte" inputmode="decimal" value="${numCampo(m.aporte)}"></div>
        <div><label for="pTaxa">Rentabilidade (% a.m.)</label><input id="pTaxa" inputmode="decimal" value="${numCampo(m.taxa * 100, 4)}"></div>
        <div><label for="pAnos">Prazo (anos)</label><input id="pAnos" inputmode="numeric" value="${m.anos}"></div>
        <div><label for="pInicial">Valor inicial (R$)</label><input id="pInicial" inputmode="decimal" value="${numCampo(m.inicial)}"></div>
        <div><label for="pInicio">Início</label><input id="pInicio" type="month" value="${m.inicio}"></div>
        <div><label for="pInfl">Inflação (% a.a.)</label><input id="pInfl" inputmode="decimal" placeholder="0" value="${m.inflacao ? numCampo(m.inflacao * 100, 4) : ''}"></div>
      </div>
      <p class="dica" id="pTaxaInfo"></p>
    </div>
    <div id="pResultado"></div>`;
  view.querySelectorAll('.card input').forEach(i => i.addEventListener('input', () => { lerMeta(); resultadoProjecao(); }));
  resultadoProjecao();
}

function lerMeta() {
  const v = id => { const n = lerValor($(id).value); return Number.isFinite(n) ? n : 0; };
  const inicio = $('#pInicio').value;
  Object.assign(DB.meta, {
    aporte: v('#pAporte'), taxa: v('#pTaxa') / 100, inicial: v('#pInicial'), inflacao: v('#pInfl') / 100,
    anos: Math.min(60, Math.max(1, Math.round(v('#pAnos')) || 1)),
    inicio: /^\d{4}-\d{2}$/.test(inicio) ? inicio : DB.meta.inicio
  });
  salvar();
}

function resultadoProjecao() {
  const m = DB.meta;
  $('#pTaxaInfo').textContent = `${fmtPct(m.taxa)} ao mês ≈ ${fmtPct(taxaAnual(m.taxa))} ao ano. Aporte no fim de cada mês. Salvo automaticamente.`;
  const pontos = projetar(m);
  const inflMes = Math.pow(1 + m.inflacao, 1 / 12) - 1;
  const deflacionar = emDinheiroDeHoje && m.inflacao > 0;
  const hojeMes = mesAtual();
  const real = new Map(serieReal(DB.investimentos.map(i => i.id), DB.movimentos, DB.saldos,
    addMeses(m.inicio, -1), hojeMes).map(p => [p.mes, p.saldo]));
  const temReal = DB.movimentos.length > 0 || DB.saldos.length > 0;

  const linhas = pontos.map(p => {
    const d = deflacionar ? Math.pow(1 + inflMes, p.i) : 1;
    const rv = temReal && p.mes <= hojeMes ? real.get(p.mes) : undefined;
    return { mes: p.mes, i: p.i, projetado: r2(p.saldo / d), aportado: r2(p.aportado / d), real: rv === undefined ? null : r2(rv / d) };
  });
  const ult = linhas.at(-1);
  const decorrido = difMeses(m.inicio, hojeMes) + 1;
  const agora = decorrido >= 0 && decorrido < linhas.length ? linhas[decorrido] : null;
  const dif = agora && agora.real !== null ? agora.real - agora.projetado : null;
  const anos = linhas.filter(l => l.i > 0 && l.i % 12 === 0);
  const sinal = v => `${v >= 0 ? '+' : '−'} ${fmtBRL(Math.abs(v))}`;

  $('#pResultado').innerHTML = `
    <div class="resumo">
      <div class="destaque"><small>Projetado em ${m.anos} ${m.anos === 1 ? 'ano' : 'anos'} (${fmtMes(ult.mes)})</small><strong>${fmtBRL(ult.projetado)}</strong></div>
      <div><small>Total aportado</small><strong>${fmtBRL(ult.aportado)}</strong></div>
      <div><small>Juros acumulados</small><strong class="pos">${fmtBRL(ult.projetado - ult.aportado)}</strong></div>
      <div class="destaque"><small>Real × meta hoje</small>
        <strong class="${dif === null ? '' : dif >= 0 ? 'pos' : 'neg'}">${dif === null ? '—' : sinal(dif)}</strong>
        <em>${dif === null ? 'Registre aportes ou saldos em Investimentos' : dif >= 0 ? 'À frente da meta' : 'Atrás da meta'}</em></div>
    </div>
    <div class="card"><h3>Evolução do patrimônio
      ${m.inflacao > 0 ? `<label class="check"><input type="checkbox" id="pHoje" ${emDinheiroDeHoje ? 'checked' : ''}>Em dinheiro de hoje</label>` : ''}</h3>
      <div class="legenda">
        <span><svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--serie-1)" stroke-width="2.5"/></svg>Projetado</span>
        <span><svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--serie-2)" stroke-width="2.5"/></svg>Real</span>
        <span><svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--suave)" stroke-width="1.5" stroke-dasharray="4 3"/></svg>Total aportado</span>
      </div>
      <div class="grafico" id="pGrafico"></div>
    </div>
    <div class="card"><h3>Ano a ano</h3>
      <div class="tabela-wrap"><table>
        <thead><tr><th>Ano</th><th>Aportado</th><th>Juros</th><th>Projetado</th><th>Real</th><th>Diferença</th></tr></thead>
        <tbody>${anos.map(r => {
          const d = r.real === null ? null : r.real - r.projetado;
          return `<tr><td>${r.i / 12}º <small>(${fmtMes(r.mes)})</small></td><td>${fmtBRL(r.aportado)}</td>
            <td>${fmtBRL(r.projetado - r.aportado)}</td><td><b>${fmtBRL(r.projetado)}</b></td>
            <td>${r.real === null ? '—' : fmtBRL(r.real)}</td>
            <td class="${d === null ? '' : d >= 0 ? 'pos' : 'neg'}">${d === null ? '—' : sinal(d)}</td></tr>`;
        }).join('')}</tbody></table></div>
    </div>`;
  $('#pHoje')?.addEventListener('change', e => { emDinheiroDeHoje = e.target.checked; resultadoProjecao(); });
  desenharGrafico($('#pGrafico'), linhas);
}

function passoBonito(bruto) {
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const m = bruto / pot;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * pot;
}

function desenharGrafico(box, linhas) {
  const W = box.clientWidth || 320, H = box.clientHeight || 260;
  const pl = 62, pr = 10, pt = 10, pb = 26;
  const n = linhas.length;
  const maxV = Math.max(1, ...linhas.map(l => Math.max(l.projetado, l.aportado, l.real ?? 0)));
  const passo = passoBonito(maxV / 4);
  const topoY = Math.ceil(maxV / passo) * passo;
  const x = i => pl + (n > 1 ? i * (W - pl - pr) / (n - 1) : 0);
  const y = v => pt + (1 - v / topoY) * (H - pt - pb);

  const caminho = chave => {
    let d = '', antes = false;
    linhas.forEach((l, i) => {
      if (l[chave] === null) { antes = false; return; }
      d += `${antes ? 'L' : 'M'}${x(i).toFixed(1)},${y(l[chave]).toFixed(1)}`;
      antes = true;
    });
    return d;
  };

  let grade = '';
  for (let v = 0; v <= topoY + 1e-6; v += passo) {
    grade += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grade)"/>
      <text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${fmtBRLCurto(v)}</text>`;
  }
  // Rótulos do eixo X com pelo menos ~64px entre eles
  const cada = Math.max(1, Math.ceil(64 / ((W - pl - pr) / Math.max(1, n - 1))));
  const passoX = cada <= 12 ? [1, 2, 3, 6, 12].find(k => k >= cada) : Math.ceil(cada / 12) * 12;
  let eixoX = '';
  for (let i = 0; i < n; i += passoX) {
    eixoX += `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : 'middle'}">${fmtMes(linhas[i].mes)}</text>`;
  }
  const pontosReais = linhas.filter(l => l.real !== null).length;
  const bolinhas = n <= 37 ? linhas.map((l, i) => l.real === null ? '' :
    `<circle cx="${x(i)}" cy="${y(l.real)}" r="3" fill="var(--serie-2)"/>`).join('') : '';

  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico da evolução do patrimônio projetado e real">
      ${grade}
      <line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" stroke="var(--borda)"/>
      ${eixoX}
      <path d="${caminho('aportado')}" fill="none" stroke="var(--suave)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <path d="${caminho('projetado')}" fill="none" stroke="var(--serie-1)" stroke-width="2.5" stroke-linejoin="round"/>
      ${pontosReais ? `<path d="${caminho('real')}" fill="none" stroke="var(--serie-2)" stroke-width="2.5" stroke-linejoin="round"/>` : ''}
      ${bolinhas}
      <g id="gCursor" visibility="hidden">
        <line id="gLinha" y1="${pt}" y2="${H - pb}" stroke="var(--suave)" stroke-width="1"/>
        <circle id="gP" r="4.5" fill="var(--serie-1)" stroke="var(--card)" stroke-width="2"/>
        <circle id="gR" r="4.5" fill="var(--serie-2)" stroke="var(--card)" stroke-width="2"/>
      </g>
    </svg><div class="tip" id="gTip" hidden></div>`;

  const svg = box.querySelector('svg'), tip = box.querySelector('#gTip'), cursor = box.querySelector('#gCursor');
  const mostrar = ev => {
    const ret = svg.getBoundingClientRect();
    const px = (ev.clientX - ret.left) * (W / ret.width);
    const i = Math.max(0, Math.min(n - 1, Math.round((px - pl) / ((W - pl - pr) / Math.max(1, n - 1)))));
    const l = linhas[i];
    cursor.setAttribute('visibility', 'visible');
    box.querySelector('#gLinha').setAttribute('x1', x(i)); box.querySelector('#gLinha').setAttribute('x2', x(i));
    const gp = box.querySelector('#gP'); gp.setAttribute('cx', x(i)); gp.setAttribute('cy', y(l.projetado));
    const gr = box.querySelector('#gR');
    gr.setAttribute('visibility', l.real === null ? 'hidden' : 'visible');
    if (l.real !== null) { gr.setAttribute('cx', x(i)); gr.setAttribute('cy', y(l.real)); }
    tip.innerHTML = `<b>${fmtMes(l.mes)} · mês ${l.i}</b>
      <div><span><i style="background:var(--serie-1)"></i>Projetado</span><span class="num">${fmtBRL(l.projetado)}</span></div>
      ${l.real !== null ? `<div><span><i style="background:var(--serie-2)"></i>Real</span><span class="num">${fmtBRL(l.real)}</span></div>` : ''}
      <div><span><i style="background:var(--suave)"></i>Aportado</span><span class="num">${fmtBRL(l.aportado)}</span></div>`;
    tip.hidden = false;
    const px2 = x(i) * (ret.width / W);
    tip.style.left = (px2 > ret.width / 2 ? Math.max(0, px2 - tip.offsetWidth - 12) : px2 + 12) + 'px';
  };
  const esconder = () => { cursor.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  svg.addEventListener('pointermove', mostrar);
  svg.addEventListener('pointerdown', mostrar);
  svg.addEventListener('pointerleave', esconder);
}

let _redim;
window.addEventListener('resize', () => {
  clearTimeout(_redim);
  _redim = setTimeout(() => { if (telaAtual === 'projecao' && $('#pGrafico')) resultadoProjecao(); }, 150);
});

// ---------- Ajustes ----------
function telaAjustes() {
  topo('Ajustes');
  const chips = (lista, attr) => lista.map((t, i) =>
    `<span class="chip">${esc(t.nome ?? t)}<button ${attr}="${t.id ?? i}" aria-label="Remover ${esc(t.nome ?? t)}">&#10005;</button></span>`).join('');
  const total = DB.lancamentos.length + DB.movimentos.length;

  view.innerHTML = `
    <div class="card"><h3>Família</h3>
      <label for="aFamilia">Nome</label><input id="aFamilia" value="${esc(DB.config.familia)}" placeholder="Família Silva">
      <label>Pessoas</label>
      <div class="chips-edit">${chips(DB.config.pessoas, 'data-delpessoa')}</div>
      <div class="add-linha"><input id="aPessoa" placeholder="Adicionar pessoa"><button class="btn" id="aAddPessoa">Adicionar</button></div>
      <p class="dica">Com duas ou mais pessoas, cada lançamento registra quem gastou.</p>
    </div>
    ${['despesa', 'receita'].map(tipo => `
    <div class="card"><h3>Categorias de ${tipo === 'despesa' ? 'despesa' : 'receita'}</h3>
      <div class="chips-edit">${chips(categoriasDo(tipo), 'data-delcat')}</div>
      <div class="add-linha"><input id="aCat_${tipo}" placeholder="Nova categoria"><button class="btn" data-addcat="${tipo}">Adicionar</button></div>
    </div>`).join('')}
    <div class="card"><h3>Backup dos dados</h3>
      <p class="dica" style="margin-top:0">Os dados ficam salvos <b>só neste aparelho</b>, no navegador. Para não perder nada (ou passar para outro celular), exporte um backup e guarde no Drive, e-mail ou WhatsApp.
      ${DB.config.ultimoBackup ? `<br>Último backup: <b>${fmtData(DB.config.ultimoBackup)}</b>.` : ''}</p>
      <div class="botoes">
        <button class="btn" id="aExportar">Exportar backup</button>
        <button class="btn secundario" id="aImportar">Restaurar backup</button>
      </div>
      <input type="file" id="aArquivo" accept="application/json,.json" hidden>
    </div>
    <div class="card"><h3>Instalar no celular</h3>
      <p class="dica" style="margin-top:0"><b>Android (Chrome):</b> menu ⋮ › <i>Adicionar à tela inicial</i>.<br>
      <b>iPhone (Safari):</b> botão compartilhar › <i>Adicionar à Tela de Início</i>.<br>Depois disso o app abre em tela cheia e funciona sem internet.</p>
    </div>
    <div class="card"><h3>Zona de perigo</h3>
      <p class="dica" style="margin-top:0">${total} lançamentos e movimentos salvos neste aparelho.</p>
      <div class="botoes"><button class="btn perigo" id="aApagar">Apagar todos os dados</button></div>
    </div>`;

  $('#aFamilia').onchange = e => { DB.config.familia = e.target.value.trim(); salvar(); toast('Nome salvo'); };

  const addPessoa = () => {
    const nome = $('#aPessoa').value.trim();
    if (!nome) return;
    if (DB.config.pessoas.includes(nome)) { toast('Essa pessoa já existe'); return; }
    DB.config.pessoas.push(nome); salvar(); telaAjustes();
  };
  $('#aAddPessoa').onclick = addPessoa;
  $('#aPessoa').onkeydown = e => { if (e.key === 'Enter') addPessoa(); };
  view.querySelectorAll('[data-delpessoa]').forEach(b => b.onclick = () => {
    const nome = DB.config.pessoas[Number(b.dataset.delpessoa)];
    if (!confirm(`Remover "${nome}"? Os lançamentos já feitos continuam com esse nome.`)) return;
    DB.config.pessoas.splice(Number(b.dataset.delpessoa), 1);
    if (DB.config.ultimaPessoa === nome) DB.config.ultimaPessoa = '';
    salvar(); telaAjustes();
  });

  const addCat = tipo => {
    const input = $('#aCat_' + tipo), nome = input.value.trim();
    if (!nome) return;
    if (categoriasDo(tipo).some(c => c.nome.toLowerCase() === nome.toLowerCase())) { toast('Essa categoria já existe'); return; }
    DB.categorias.push({ id: uid(), nome, tipo }); salvar(); telaAjustes();
  };
  view.querySelectorAll('[data-addcat]').forEach(b => {
    b.onclick = () => addCat(b.dataset.addcat);
    $('#aCat_' + b.dataset.addcat).onkeydown = e => { if (e.key === 'Enter') addCat(b.dataset.addcat); };
  });
  view.querySelectorAll('[data-delcat]').forEach(b => b.onclick = () => {
    const cat = DB.categorias.find(c => c.id === b.dataset.delcat);
    const usos = DB.lancamentos.filter(l => l.categoriaId === cat.id).length;
    if (!confirm(`Remover a categoria "${cat.nome}"?${usos ? `\n\n${usos} lançamentos ficarão "Sem categoria".` : ''}`)) return;
    DB.categorias = DB.categorias.filter(c => c.id !== cat.id);
    DB.lancamentos.forEach(l => { if (l.categoriaId === cat.id) l.categoriaId = null; });
    salvar(); telaAjustes();
  });

  $('#aExportar').onclick = exportarBackup;
  $('#aImportar').onclick = () => $('#aArquivo').click();
  $('#aArquivo').onchange = e => importarBackup(e.target.files[0]);
  $('#aApagar').onclick = () => {
    if (!confirm('Apagar TODOS os lançamentos, investimentos e ajustes deste aparelho?\n\nFaça um backup antes. Isso não pode ser desfeito.')) return;
    if (prompt('Para confirmar, digite APAGAR') !== 'APAGAR') return;
    localStorage.removeItem(CHAVE); carregar(); location.hash = '#/painel'; rota();
  };
}

async function exportarBackup() {
  DB.config.ultimoBackup = hoje(); salvar();
  const nome = `financas-backup-${hoje()}.json`;
  const arquivo = new File([JSON.stringify(DB, null, 1)], nome, { type: 'application/json' });
  // No celular, abre o menu de compartilhar (Drive, WhatsApp, e-mail…); no computador, baixa o arquivo.
  if (navigator.canShare?.({ files: [arquivo] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [arquivo], title: 'Backup Finanças da Família' }); toast('Backup exportado ✓'); telaAjustes(); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(arquivo);
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup baixado ✓'); if (telaAtual === 'ajustes') telaAjustes();
}

function importarBackup(arquivo) {
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    let dados;
    try { dados = JSON.parse(leitor.result); } catch { toast('Arquivo inválido'); return; }
    if (!dados || !Array.isArray(dados.lancamentos) || !dados.config) { toast('Esse arquivo não é um backup do app'); return; }
    const n = dados.lancamentos.length;
    if (DB.config.configurado && !confirm(`Restaurar este backup (${n} lançamentos)?\n\nOs dados atuais deste aparelho serão substituídos.`)) return;
    DB = normalizar(dados);
    DB.config.configurado = true;
    salvar(); toast('Backup restaurado ✓');
    location.hash = '#/painel'; rota();
  };
  leitor.readAsText(arquivo);
}

// ---------- Boas-vindas ----------
function telaBoasVindas() {
  topo('Finanças da Família');
  view.innerHTML = `
    <div class="boas">
      <img class="logo" src="icons/icon.svg" alt="">
      <h2>Bem-vindos!</h2>
      <p>Controle de gastos, receitas e investimentos da família, com projeção da sua meta.</p>
      <div class="card">
        <label for="bFamilia">Nome da família</label><input id="bFamilia" placeholder="Família Silva">
        <div class="duas">
          <div><label for="bP1">Seu nome</label><input id="bP1" placeholder="Ex.: Ana"></div>
          <div><label for="bP2">Parceiro(a)</label><input id="bP2" placeholder="Opcional"></div>
        </div>
        <div class="botoes"><button class="btn" id="bComecar">Começar</button></div>
      </div>
      <p class="dica">Já usa o app em outro aparelho? <a href="#" id="bRestaurar" style="color:var(--verde);font-weight:600">Restaurar um backup</a></p>
      <input type="file" id="bArquivo" accept="application/json,.json" hidden>
    </div>`;
  $('#bComecar').onclick = () => {
    const pessoas = [$('#bP1').value.trim(), $('#bP2').value.trim()].filter(Boolean);
    DB.config.familia = $('#bFamilia').value.trim();
    DB.config.pessoas = [...new Set(pessoas)];
    DB.config.configurado = true;
    salvar(); location.hash = '#/painel'; rota();
  };
  $('#bRestaurar').onclick = e => { e.preventDefault(); $('#bArquivo').click(); };
  $('#bArquivo').onchange = e => importarBackup(e.target.files[0]);
}

rota();
