/* Só Folhas - importador de Base de Vendas em segundo plano */
importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

const fmt = new Intl.NumberFormat('pt-BR');

function normalize(value){
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function slug(value){ return normalize(value).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
function toNumber(v){
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null || v === '') return 0;
  let s = String(v).trim().replace(/\s/g,'');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',','.');
  else if (s.includes(',')) s = s.replace(',','.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function parseDate(v){
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v === 'number' && self.XLSX) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? '20'+m[3] : m[3];
    return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10);
}
function unique(arr){ return Array.from(new Set(arr.filter(Boolean))); }
function productAliasKeyFromRaw(value){ return normalize(String(value || '').split('|')[0].trim()); }
function storeAliasKeyFromRaw(value, rede=''){
  const raw = normalize(value);
  return raw ? `${normalize(rede || '')}|${raw}` : '';
}
function resolveManualProductAlias(rawName, products=[], nameReconciliations={}){
  const key = productAliasKeyFromRaw(rawName);
  if (!key) return null;
  const rec = (nameReconciliations.products || {})[key];
  const targetId = typeof rec === 'string' ? rec : rec?.targetId;
  return targetId ? (products || []).find(p => p.id === targetId) || null : null;
}
function resolveManualStoreAlias(rawName, redeHint='', stores=[], nameReconciliations={}){
  const keys = unique([storeAliasKeyFromRaw(rawName, redeHint), storeAliasKeyFromRaw(rawName, '')]);
  let rec = null;
  const map = nameReconciliations.stores || {};
  for (const key of keys) { if (map[key]) { rec = map[key]; break; } }
  const targetId = typeof rec === 'string' ? rec : rec?.targetId;
  return targetId ? (stores || []).find(s => s.id === targetId) || null : null;
}

const SALES_STORE_OVERRIDES = [
  {rede:'DIA A DIA', id:'dd_horacio_costa', patterns:['GOIANIA BALNEARIO','BALNEARIO']},
  {rede:'DIA A DIA', id:'dd_taguatinga_sul', patterns:['TAGUATINGA DF','TAGUATINGA']},
  {rede:'DIA A DIA', id:'dd_br_070', patterns:['CEILANDIA BR070','CEILANDIA BR 070','BR070']},
  {rede:'DIA A DIA', id:'dd_novo_gama', patterns:['NOVO GAMA']},
  {rede:'DIA A DIA', id:'dd_park_jk', patterns:['LUZIANIA PARQUE JK','PARQUE JK','PARK JK']},
  {rede:'DIA A DIA', id:'dd_eptg', patterns:['VICENTE PIRES EPTG','EPTG']},
  {rede:'DIA A DIA', id:'dd_vicente_pires_2', patterns:['VICENTE PIRES RUA 04','VICENTE PIRES RUA 4']},
  {rede:'DIA A DIA', id:'dd_vicente_pires', patterns:['VICENTE PIRES RUA 12']},
  {rede:'DIA A DIA', id:'dd_vicente_pires', patterns:['VICENTE PIRES']},
  {rede:'DIA A DIA', id:'dd_luziania', patterns:['LUZIANIA GO','LUZIANIA']},
  {rede:'DIA A DIA', id:'dd_jd_botanico', patterns:['JARDIM BOTANICO','JD BOTANICO']},
  {rede:'DIA A DIA', id:'dd_aguas_claras', patterns:['AGUAS CLARAS']},
  {rede:'DIA A DIA', id:'dd_sia', patterns:['SIA DF','SIA']},
  {rede:'DIA A DIA', id:'dd_aguas_lindas', patterns:['AGUAS LINDAS']},
  {rede:'DIA A DIA', id:'dd_gama', patterns:['GAMA DF']},
  {rede:'DIA A DIA', id:'dd_sobradinho', patterns:['SOBRADINHO']},
  {rede:'DIA A DIA', id:'dd_rio_verde', patterns:['GOIANIA RIO VERDE','DIA A DIA RIO VERDE','AVENIDA RIO VERDE','AV RIO VERDE','RIO VERDE GO']},
  {rede:'DIA A DIA', id:'dd_planaltina_df', patterns:['PLANALTINA DF']},
  {rede:'DIA A DIA', id:'dd_guara', patterns:['GUARA II (DF)','GUARA II','GUARA 2','GUARA']},
  {rede:'DIA A DIA', id:'dd_mestre_d_armas', patterns:['MESTRE D ARMAS','MESTRE DARMAS']},
  {rede:'DIA A DIA', id:'dd_samambaia', patterns:['SAMAMBAIA DF','SAMAMBAIA']},
  {rede:'DIA A DIA', id:'dd_gurupi', patterns:['GURUPI']},
  {rede:'DIA A DIA', id:'dd_recanto', patterns:['RECANTO DAS EMAS','RECANTO']},
  {rede:'DIA A DIA', id:'dd_furnas', patterns:['SAMAMBAIA FURNAS','FURNAS']},
  {rede:'DIA A DIA', id:'dd_planaltina_go', patterns:['PLANALTINA GO']},
  {rede:'DIA A DIA', id:'dd_riacho', patterns:['RIACHO FUNDO 1','RIACHO']},
  {rede:'DIA A DIA', id:'dd_formosa', patterns:['FORMOSA']},
  {rede:'DIA A DIA', id:'dd_ceilandia_sul', patterns:['CEILANDIA SUL','P SUL']},
  {rede:'DIA A DIA', id:'dd_lem', patterns:['LUIS EDUARDO MAGALHAES','LEM']},
  {rede:'DIA A DIA', id:'dd_santo_antonio', patterns:['SANTO ANTONIO DESCOBERTO','SANTO ANTONIO']},
  {rede:'DIA A DIA', id:'dd_ceilandia_centro', patterns:['CEILANDIA CENTRO']},
  {rede:'DIA A DIA', id:'dd_itumbiara', patterns:['ITUMBIARA']},
  {rede:'DIA A DIA', id:'dd_goianesia', patterns:['GOIANESIA']},
  {rede:'DIA A DIA', id:'dd_cesar_lattes', patterns:['GOIANIA CESAR LATTES','CESAR LATES','CESAR LATTES']},
  {rede:'DIA A DIA', id:'dd_aparecida_goiania', patterns:['APARECIDA DE GOIANIA','APARECIDA GOIANIA']},
  {rede:'DIA A DIA', id:'dd_ceilandia_norte', patterns:['CEILANDIA NORTE']},
  {rede:'COSTA ATACADÃO', id:'costa_goiania', patterns:['009 ANL VIAR','ANL VIAR']},
  {rede:'COSTA ATACADÃO', id:'costa_laranjeiras', patterns:['016 PQ LARANJEI','PQ LARANJEI','LARANJEI']},
  {rede:'COSTA ATACADÃO', id:'costa_valparaiso', patterns:['005 VALPARSO','VALPARSO']},
  {rede:'COSTA ATACADÃO', id:'costa_santa_maria', patterns:['002 ST MARIA','ST MARIA']},
  {rede:'COSTA ATACADÃO', id:'costa_taguatinga', patterns:['001 TAGUATIN','TAGUATIN']},
  {rede:'COSTA ATACADÃO', id:'costa_jardim_goias', patterns:['007 JD GOIAS','JD GOIAS']},
  {rede:'COSTA ATACADÃO', id:'costa_senador_canedo', patterns:['017 SEN CANED','SEN CANED']},
  {rede:'COSTA ATACADÃO', id:'costa_avenida_goias', patterns:['011 AV GOIAS','AV GOIAS']},
  {rede:'COSTA ATACADÃO', id:'costa_rio_verde', patterns:['012 R VERDE','R VERDE']},
  {rede:'COSTA ATACADÃO', id:'costa_unieuro', patterns:['013 UNIEURO','UNIEURO']},
  {rede:'COSTA ATACADÃO', id:'costa_taquari', patterns:['008 TAQUARI','TAQUARI']},
  {rede:'COSTA ATACADÃO', id:'costa_luziania', patterns:['014 LUZIANIA','LUZIANIA']},
  {rede:'COSTA ATACADÃO', id:'costa_ade', patterns:['003 ADE','ADE']},
  {rede:'COSTA ATACADÃO', id:'costa_t_63', patterns:['006 T 63','T 63','T-63']},
  {rede:'COSTA ATACADÃO', id:'costa_go_070', patterns:['010 GO 070','GO 070']}
];

function detectSalesRedeFromSheet(sheetName){
  const n = normalize(sheetName);
  if (n.includes('DIA A DIA')) return 'DIA A DIA';
  if (n.includes('COSTA')) return 'COSTA ATACADÃO';
  if (n.includes('COMPER') || n.includes('FORT')) return 'COMPER/FORT';
  return '';
}
function cleanSalesProductName(value){
  return String(value || '').split('|')[0].trim()
    .replace(/\bSO\s+FOLHAS\b/ig,'')
    .replace(/\s+/g,' ')
    .trim();
}
function stripProductNoise(value){
  return normalize(value)
    .replace(/\bSO FOLHAS\b/g,'')
    .replace(/\bPC\b/g,'')
    .replace(/\bUND\b/g,'')
    .replace(/\bUN\b/g,'')
    .replace(/\bBDJ\b/g,'')
    .replace(/\bKG\b/g,'')
    .replace(/\b300G\b/g,'')
    .replace(/\b400G\b/g,'')
    .replace(/\b500G\b/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function hasQualifierMismatch(rawOriginal, product){
  const raw = normalize(rawOriginal);
  const p = normalize(`${product.nomeSistema || ''} ${product.codigoMix || ''} ${(product.aliases || []).join(' ')}`);
  if (raw.includes('FILETADO') && !p.includes('FILETADO')) return true;
  if (!raw.includes('FILETADO') && p.includes('FILETADO')) return true;
  return false;
}
function matchProduct(rawName, products, nameReconciliations={}){
  const original = String(rawName || '').split('|')[0].trim();
  const rawOriginal = normalize(original);
  if (!rawOriginal) return null;
  const manualProduct = resolveManualProductAlias(original, products, nameReconciliations);
  if (manualProduct) return manualProduct;
  if (rawOriginal.includes('BERINGELA')) {
    const berinjela = products.find(p => p.id === 'berinjela_bdj');
    if (berinjela) return berinjela;
  }
  if (rawOriginal.includes('BROCOLIS') && rawOriginal.includes('AMERICANO') && !rawOriginal.includes('FILETADO')) {
    const normalBrocolis = products.find(p => p.id === 'brocolis_americano');
    if (normalBrocolis) return normalBrocolis;
  }
  const raw = stripProductNoise(original);
  const rawLooksGranel = /\bA GRANEL\b|\bGRANEL\b/i.test(original);
  let best = null, bestScore = 0;
  for (const p of products) {
    const productLooksGranel = /\bA GRANEL\b|\bGRANEL\b/i.test(`${p.nomeSistema || ''} ${p.codigoMix || ''}`);
    if (!rawLooksGranel && productLooksGranel) continue;
    if (hasQualifierMismatch(original, p)) continue;
    const candidates = [p.nomeSistema, p.codigoMix, ...(p.aliases || [])].map(stripProductNoise);
    for (const c of candidates) {
      if (!c) continue;
      let score = 0;
      if (raw === c) score = 100;
      else if (raw.includes(c) || c.includes(raw)) score = 88;
      else {
        const rawTokens = new Set(raw.split(' ').filter(Boolean));
        const cTokens = c.split(' ').filter(t => t && !['SO','FOLHAS','UN','UND','BDJ','PC','G','KG'].includes(t));
        const hits = cTokens.filter(t => rawTokens.has(t)).length;
        score = cTokens.length ? (hits / cTokens.length) * 72 : 0;
      }
      if (score > bestScore) { bestScore = score; best = p; }
    }
  }
  return bestScore >= 45 ? best : null;
}
function storeOverrideByKnownSalesName(rawName, redeHint='', stores=[]){
  const raw = normalize(rawName);
  const nRede = normalize(redeHint);
  const candidates = SALES_STORE_OVERRIDES.filter(rule => {
    const rr = normalize(rule.rede);
    return !nRede || rr.includes(nRede) || nRede.includes(rr.split(' ')[0]);
  });
  for (const rule of candidates) {
    if ((rule.patterns || []).some(p => raw.includes(normalize(p)))) return stores.find(s => s.id === rule.id) || null;
  }
  return null;
}
function scoreStoreCandidates(raw, candidates){
  let best = null, bestScore = 0;
  for (const s of candidates) {
    const aliases = [s.nome, ...(s.aliases||[])].map(normalize);
    for (const a of aliases) {
      if (!a) continue;
      let score = raw === a ? 100 : (raw.includes(a) || a.includes(raw) ? 84 : 0);
      if (!score) {
        const rawTokens = new Set(raw.split(' '));
        const toks = a.split(' ').filter(t => !['DD','DIA','A','ATACADAO','ATACADÃO','COSTA','COMPER','FORT','LOJA'].includes(t));
        const hits = toks.filter(t => rawTokens.has(t)).length;
        score = toks.length ? hits / toks.length * 70 : 0;
      }
      if (score > bestScore) { bestScore = score; best = s; }
    }
  }
  return {best, bestScore};
}
function matchStore(rawName, redeHint='', stores=[], nameReconciliations={}){
  const raw = normalize(rawName);
  if (!raw) return null;
  const manualStore = resolveManualStoreAlias(rawName, redeHint, stores, nameReconciliations);
  if (manualStore) return manualStore;
  const known = storeOverrideByKnownSalesName(rawName, redeHint, stores);
  if (known) return known;
  const direct = scoreStoreCandidates(raw, stores);
  if (direct.bestScore >= 84) return direct.best;
  let candidates = stores;
  if (redeHint) {
    const nRede = normalize(redeHint);
    candidates = candidates.filter(s => normalize(s.rede).includes(nRede) || nRede.includes(normalize(s.rede).split(' ')[0]));
  }
  const hinted = scoreStoreCandidates(raw, candidates);
  return hinted.bestScore >= 42 ? hinted.best : null;
}
function sheetCellValue(sheet, r, c){
  const cell = sheet[XLSX.utils.encode_cell({r, c})];
  if (!cell) return '';
  if (cell.t === 'd' && cell.v instanceof Date) return cell.v;
  if (cell.v !== undefined && cell.v !== null) return cell.v;
  return cell.w || '';
}
function findSalesHeader(sheet, range){
  const maxRows = Math.min(range.e.r, range.s.r + 20);
  const required = ['FILIAL','PRODUTO'];
  for (let r = range.s.r; r <= maxRows; r++) {
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) headers.push(String(sheetCellValue(sheet, r, c) || '').trim());
    const norms = headers.map(normalize);
    const hasRequired = required.every(req => norms.some(h => h === req || h.includes(req)));
    const hasQty = norms.some(h => h.includes('QTD') || h.includes('QUANT'));
    const hasDate = norms.some(h => h === 'DATE' || h.includes('DATA'));
    if (hasRequired && hasQty && hasDate) return {row:r, startCol:range.s.c, headers};
  }
  return null;
}
function findHeaderIndex(headers, names){
  const norms = headers.map(normalize);
  for (const name of names) {
    const target = normalize(name);
    let idx = norms.findIndex(h => h === target);
    if (idx >= 0) return idx;
    idx = norms.findIndex(h => h.includes(target) || target.includes(h));
    if (idx >= 0) return idx;
  }
  return -1;
}
function salesRowKey(date, rede, store, filial, product, cleanProduct){
  const storePart = store?.id || `raw_${slug(filial)}`;
  const productPart = product?.id || `raw_${slug(cleanProduct)}`;
  return `${date}|${rede}|${storePart}|${productPart}`;
}
function salesImportDateRange(rows){
  const dates = unique(rows.map(r => r.date)).sort();
  return {from: dates[0] || '', to: dates[dates.length - 1] || '', dates};
}
function pushLimitedIssue(list, issue, limit=250){ if (list.length < limit) list.push(issue); }
function progress(current, total, message){ postMessage({type:'progress', current, total, message}); }

function processSalesExcel({buffer, fileName, importId, importedAt, stores, products, nameReconciliations}){
  progress(0, 100, 'Abrindo planilha no processador em segundo plano...');
  const workbook = XLSX.read(buffer, {type:'array', cellDates:true, raw:true});
  const issues = [];
  const sheetSummaries = [];
  const aggregate = new Map();
  const storeCache = new Map();
  const productCache = new Map();
  let totalCandidateRows = 0;
  let processedRows = 0;
  let ignoredIssueCount = 0;

  for (const sheetName of workbook.SheetNames) {
    const rede = detectSalesRedeFromSheet(sheetName);
    if (!rede) continue;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const headerInfo = findSalesHeader(sheet, range);
    if (!headerInfo) continue;
    totalCandidateRows += Math.max(0, range.e.r - headerInfo.row);
  }
  if (!totalCandidateRows) totalCandidateRows = 1;

  for (const sheetName of workbook.SheetNames) {
    const rede = detectSalesRedeFromSheet(sheetName);
    if (!rede) {
      pushLimitedIssue(issues, {kind:'Aba ignorada', message:'Aba não reconhecida como rede de vendas', detail:`Aba "${sheetName}" ignorada.`, sheet:sheetName});
      continue;
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) {
      pushLimitedIssue(issues, {kind:'Aba vazia', message:'Aba sem dados', detail:`Aba "${sheetName}" está vazia.`, sheet:sheetName});
      continue;
    }
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const headerInfo = findSalesHeader(sheet, range);
    if (!headerInfo) {
      pushLimitedIssue(issues, {kind:'Cabeçalho não encontrado', message:'Não encontrei as colunas Filial, Produto, Qtd. Faturada e Date/Data', detail:`Aba "${sheetName}" ignorada.`, sheet:sheetName});
      continue;
    }
    const headers = headerInfo.headers;
    const startRow = headerInfo.row + 1;
    const cFilial = headerInfo.startCol + findHeaderIndex(headers, ['Filial','Loja','Cliente','Unidade']);
    const cProduct = headerInfo.startCol + findHeaderIndex(headers, ['Produto','Item','Descrição','Descricao','Mercadoria']);
    const cQty = headerInfo.startCol + findHeaderIndex(headers, ['Qtd. Faturada','Qtd Faturada','Qtde Faturada','Quantidade','Qtd','Qtde']);
    const cDate = headerInfo.startCol + findHeaderIndex(headers, ['Date','Data','Data Venda','Data Faturamento','Dt Venda']);
    if ([cFilial, cProduct, cQty, cDate].some(i => i < headerInfo.startCol)) {
      pushLimitedIssue(issues, {kind:'Coluna não encontrada', message:'Uma ou mais colunas obrigatórias não foram encontradas', detail:`Aba "${sheetName}" precisa ter Filial, Produto, Qtd. Faturada e Date/Data.`, sheet:sheetName});
      continue;
    }

    let accepted = 0, skipped = 0, unmatchedStores = 0, unmatchedProducts = 0, qtyTotal = 0;
    const step = 1500;
    for (let r = startRow; r <= range.e.r; r++) {
      const filial = sheetCellValue(sheet, r, cFilial);
      const productRaw = sheetCellValue(sheet, r, cProduct);
      const qtyRaw = sheetCellValue(sheet, r, cQty);
      const dateRaw = sheetCellValue(sheet, r, cDate);
      const qty = toNumber(qtyRaw);
      const date = parseDate(dateRaw);
      const nFilial = normalize(filial);
      const nProd = normalize(productRaw);
      processedRows++;

      if ((!filial && !productRaw && !qtyRaw && !dateRaw) || nFilial === 'TOTAL' || nProd === 'TOTAL') { skipped++; continue; }
      if (!filial || !productRaw || !date || qty <= 0) {
        skipped++;
        ignoredIssueCount++;
        pushLimitedIssue(issues, {kind:'Linha ignorada', message:'Linha sem loja, produto, data ou quantidade válida', detail:`Aba ${sheetName}, linha ${r+1}: loja="${filial || '—'}", produto="${productRaw || '—'}", data="${dateRaw || '—'}", qtd="${qtyRaw || '—'}".`, sheet:sheetName});
        continue;
      }
      const filialText = String(filial).trim();
      const cleanProduct = cleanSalesProductName(productRaw);
      const storeKey = `${rede}|${normalize(filialText)}`;
      const prodKey = normalize(String(productRaw || '').trim());
      let store = storeCache.get(storeKey);
      if (store === undefined) { store = matchStore(filialText, rede, stores, nameReconciliations || {}); storeCache.set(storeKey, store || null); }
      let product = productCache.get(prodKey);
      if (product === undefined) { product = matchProduct(productRaw, products, nameReconciliations || {}); productCache.set(prodKey, product || null); }
      if (!store) unmatchedStores++;
      if (!product) unmatchedProducts++;

      const key = salesRowKey(date, rede, store, filialText, product, cleanProduct);
      let row = aggregate.get(key);
      if (!row) {
        row = {
          id: '', importId, fileName, sheet:sheetName, rede,
          storeId: store?.id || '', storeName: store?.nome || filialText, storeRaw: filialText,
          productId: product?.id || '', productName: product?.nomeSistema || cleanProduct, productRaw: String(productRaw).trim(),
          date, qty:0, sourceRecords:0, importedAt
        };
        aggregate.set(key, row);
      }
      row.qty += qty;
      row.sourceRecords += 1;
      qtyTotal += qty;
      accepted++;
      if (processedRows % step === 0) progress(processedRows, totalCandidateRows, `Processando ${sheetName}: ${fmt.format(processedRows)} de ${fmt.format(totalCandidateRows)} linhas...`);
    }
    sheetSummaries.push({sheetName, rede, records:accepted, skipped, qtyTotal, unmatchedStores, unmatchedProducts});
    progress(processedRows, totalCandidateRows, `Aba ${sheetName} concluída. Consolidando vendas...`);
  }

  const rows = Array.from(aggregate.values()).map((row, idx) => ({...row, id:`${importId}_${idx+1}`}));
  if (ignoredIssueCount > issues.length) {
    issues.push({kind:'Resumo de linhas ignoradas', message:`${fmt.format(ignoredIssueCount)} linha(s) foram ignoradas; exibindo apenas as primeiras ocorrências.`, detail:'A limitação evita travamento da tela em bases muito grandes.', sheet:'Geral'});
  }
  const range = salesImportDateRange(rows);
  const matchedProducts = rows.filter(r => r.productId).length;
  const matchedStores = rows.filter(r => r.storeId).length;
  const importSummary = {
    dateFrom: range.from,
    dateTo: range.to,
    dates: range.dates,
    records: rows.length,
    sourceRecords: rows.reduce((a,r)=>a+toNumber(r.sourceRecords),0),
    qtyTotal: rows.reduce((a,r)=>a+toNumber(r.qty),0),
    matchedProducts,
    unmatchedProducts: rows.length - matchedProducts,
    matchedStores,
    unmatchedStores: rows.length - matchedStores,
    sheets: sheetSummaries
  };
  return {rows, issues, importSummary, processedRows};
}

self.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type !== 'process-sales-excel') return;
  try {
    const result = processSalesExcel(msg);
    postMessage({type:'done', result});
  } catch(e) {
    postMessage({type:'error', message:e?.message || String(e)});
  }
};
