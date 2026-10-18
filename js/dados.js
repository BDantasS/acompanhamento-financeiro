// Armazenamento local (no próprio celular) + valores padrão + cálculos
const CHAVE = 'financas-familia-v1';

const CATEGORIAS_PADRAO = {
  despesa: ['Mercado', 'Moradia', 'Contas da casa', 'Transporte', 'Saúde', 'Educação',
    'Restaurantes', 'Lazer', 'Compras', 'Assinaturas', 'Filhos', 'Pets', 'Outros'],
  receita: ['Pró-labore', 'Salário', 'Rendimentos', 'Reembolso', 'Outros']
};

const FORMAS_PAGAMENTO = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto', 'Transferência'];

const TIPOS_INVESTIMENTO = ['Renda fixa (CDB/LCI/LCA)', 'Tesouro Direto', 'Ações', 'FIIs', 'Fundos',
  'Previdência', 'Cripto', 'Poupança', 'Outro'];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ---------- Datas (strings "YYYY-MM-DD" / "YYYY-MM", sem fuso) ----------
function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mesAtual() { return hoje().slice(0, 7); }

/** "2026-10" + 3 -> "2027-01" */
function addMeses(mes, n) {
  const [y, m] = mes.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}
/** "2026-01-31" + 1 -> "2026-02-28" (mantém o dia, limitado ao fim do mês) */
function addMesesData(data, n) {
  const mes = addMeses(data.slice(0, 7), n);
  const [y, m] = mes.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return `${mes}-${String(Math.min(Number(data.slice(8, 10)), ultimo)).padStart(2, '0')}`;
}
/** Divide um total em n parcelas em centavos; a diferença do arredondamento vai na 1ª. */
function dividirParcelas(total, n) {
  const centavos = Math.round(total * 100), base = Math.floor(centavos / n);
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? centavos - base * n : 0)) / 100);
}
/** Número de meses de `de` até `ate` (ambos "YYYY-MM"). */
function difMeses(de, ate) {
  const [fy, fm] = de.split('-').map(Number);
  const [ty, tm] = ate.split('-').map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
}

function estadoInicial() {
  return {
    config: { familia: '', pessoas: [], configurado: false },
    categorias: [
      ...CATEGORIAS_PADRAO.despesa.map(nome => ({ id: uid(), nome, tipo: 'despesa' })),
      ...CATEGORIAS_PADRAO.receita.map(nome => ({ id: uid(), nome, tipo: 'receita' }))
    ],
    lancamentos: [],
    investimentos: [],
    movimentos: [],
    saldos: [],
    meta: { inicial: 0, aporte: 3000, taxa: 0.015, anos: 10, inflacao: 0, inicio: mesAtual() }
  };
}

let DB;
function carregar() {
  try { DB = JSON.parse(localStorage.getItem(CHAVE)); } catch { DB = null; }
  DB = normalizar(DB);
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(DB)); }
  catch { alert('Não foi possível salvar no aparelho. Faça um backup em Ajustes.'); }
}
/** Garante todos os campos (dados antigos ou backups importados). */
function normalizar(d) {
  const base = estadoInicial();
  if (!d || typeof d !== 'object') return base;
  for (const k of ['lancamentos', 'investimentos', 'movimentos', 'saldos', 'categorias']) {
    if (!Array.isArray(d[k])) d[k] = base[k];
  }
  d.config = { ...base.config, ...d.config };
  d.meta = { ...base.meta, ...d.meta };
  return d;
}

// ---------- Formatação ----------
const _brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const _brlCurto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const _pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 });
const fmtBRL = v => _brl.format(v || 0);
const fmtBRLCurto = v => _brlCurto.format(v || 0);
const fmtPct = v => _pct.format(v || 0);
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** "2026-10-10" -> "10/10/2026" */
function fmtData(iso) { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
/** "2026-10" -> "out/2026" */
function fmtMes(iso) { const [y, m] = iso.split('-'); return `${MESES[Number(m) - 1]}/${y}`; }
function fmtMesLongo(iso) { const [y, m] = iso.split('-'); return `${MESES_LONGOS[Number(m) - 1]} de ${y}`; }
/** Número para campo de texto no formato brasileiro: 1234.5 -> "1234,5" */
const numCampo = (n, casas = 2) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas, useGrouping: false });

/** Aceita "1.234,56", "1234.56", "1234,5", "R$ 30" etc. */
function lerValor(txt) {
  let s = String(txt ?? '').replace(/[^\d,.-]/g, '');
  if (!/\d/.test(s)) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
const r2 = n => Math.round(n * 100) / 100;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Resumo do mês ----------
function resumoMes(lancs, nomeCategoria) {
  let entradas = 0, saidas = 0;
  const porCat = new Map();
  for (const l of lancs) {
    if (l.tipo === 'receita') entradas += l.valor;
    else {
      saidas += l.valor;
      const nome = nomeCategoria(l.categoriaId) || 'Sem categoria';
      porCat.set(nome, (porCat.get(nome) || 0) + l.valor);
    }
  }
  return {
    entradas: r2(entradas), saidas: r2(saidas), saldo: r2(entradas - saidas),
    porCategoria: [...porCat].map(([nome, total]) => ({ nome, total: r2(total) })).sort((a, b) => b.total - a.total)
  };
}

// ---------- Projeção: juros compostos, aporte no fim de cada mês ----------
//   saldo_n = saldo_{n-1} * (1 + taxa) + aporte
// O ponto 0 é o saldo inicial (fim do mês anterior ao início).
function projetar({ inicial, aporte, taxa, anos, inicio, inflacao = 0 }) {
  const meses = Math.round(anos * 12);
  const inflMes = Math.pow(1 + inflacao, 1 / 12) - 1;
  const pontos = [];
  let saldo = inicial, aportado = inicial;
  for (let i = 0; i <= meses; i++) {
    if (i > 0) { saldo = saldo * (1 + taxa) + aporte; aportado += aporte; }
    pontos.push({
      mes: addMeses(inicio, i - 1), i,
      aportado: r2(aportado), saldo: r2(saldo), juros: r2(saldo - aportado),
      saldoHoje: r2(saldo / Math.pow(1 + inflMes, i))
    });
  }
  return pontos;
}
const taxaAnual = taxaMes => Math.pow(1 + taxaMes, 12) - 1;

// ---------- Patrimônio real mês a mês ----------
// Para cada investimento: se houver saldo informado no mês, usa ele; senão parte do
// último saldo e soma aportes/resgates feitos depois (rendimento só aparece com novo saldo).
function serieReal(ids, movimentos, saldos, deMes, ateMes) {
  if (difMeses(deMes, ateMes) < 0) return [];
  const liquido = new Map();
  for (const m of movimentos) {
    const k = `${m.investimentoId}|${m.data.slice(0, 7)}`;
    liquido.set(k, (liquido.get(k) || 0) + (m.tipo === 'aporte' ? m.valor : -m.valor));
  }
  const informado = new Map(saldos.map(s => [`${s.investimentoId}|${s.mes}`, s.saldo]));

  // Começa desde o primeiro movimento/saldo, mesmo antes de deMes.
  const todos = [...movimentos.map(m => m.data.slice(0, 7)), ...saldos.map(s => s.mes)].sort();
  const primeiro = todos[0] && todos[0] < deMes ? todos[0] : deMes;

  const saldo = new Map(ids.map(id => [id, 0]));
  let aportado = 0;
  const out = [];
  const total = difMeses(primeiro, ateMes);
  for (let i = 0; i <= total; i++) {
    const mes = addMeses(primeiro, i);
    for (const id of ids) {
      const k = `${id}|${mes}`;
      const net = liquido.get(k) || 0;
      aportado += net;
      const s = informado.get(k);
      saldo.set(id, s ?? Math.max(0, (saldo.get(id) || 0) + net));
    }
    if (mes >= deMes) {
      let soma = 0;
      for (const v of saldo.values()) soma += v;
      out.push({ mes, saldo: r2(soma), aportado: r2(aportado) });
    }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { addMeses, addMesesData, dividirParcelas, difMeses, lerValor, projetar, taxaAnual, serieReal, resumoMes, normalizar };
