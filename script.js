const FIREBASE_URLS = {
  app: 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  firestore: 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
};

const firebaseConfig = {
  apiKey: "AIzaSyBNeZm3DunGcQnFnzeNe2fnSZHBM6mtVcU",
  authDomain: "painel-rotinas-so-folhas.firebaseapp.com",
  projectId: "painel-rotinas-so-folhas",
  storageBucket: "painel-rotinas-so-folhas.firebasestorage.app",
  messagingSenderId: "405800876325",
  appId: "1:405800876325:web:7b03cacffb8f0f439fc2cc",
  measurementId: "G-7E15N4CBNV"
};

let firebaseApi = null;
let firebaseApp = null;
let db = null;
let painelConfigRef = null;
let snapshotsCollectionRef = null;
let firebaseDisponivel = false;
let firebaseListenersIniciados = false;
let firebaseInicializado = false;
let firebaseConfigRecebida = false;
let firebaseSnapshotsRecebidos = false;
let firebaseResumosRecebidos = false;
let aplicarEstadoRemotoTimer = null;
let resumoPeriodoAtual = 'diario';
let curvaPeriodoAtual = '30d';

const APRESENTACAO_CONFIG = {
  intervaloMs: 10000
};

const apresentacaoState = {
  aberta: false,
  slideAtual: 0,
  autoplay: true,
  timer: null
};

const STORAGE_KEYS = {
  adminLogged: 'sf_admin_logged',
  storeFormadorMap: 'sf_store_formador_map',
  storePromotorMap: 'sf_store_promotor_map',
  storeRegionalMap: 'sf_store_regional_map',
  regionalMapReviewed: 'sf_regional_map_reviewed',
  storeRenameMap: 'sf_store_rename_map',
  routineConfig: 'sf_routine_config',
  knownStores: 'sf_known_stores',
  importedSnapshots: 'sf_imported_snapshots',
  dailySummaries: 'sf_daily_summaries',
  activeSnapshotId: 'sf_active_snapshot_id',
  appVersion: 'sf_app_version'
};

const ADMIN_CREDENTIALS = {
  user: 'richard.martins',
  pass: 'sofolhas2026'
};

const FORMADORES_ATIVOS = ['Luciano', 'Karina', 'Luana'];
const FORMADORES_ATIVOS_SLUG = new Set(FORMADORES_ATIVOS.map((item) => slug(item)));
const APP_STORAGE_VERSION = '2026-07-29-data-real-e-modo-leve-v12';
const RESULT_SCHEMA_VERSION = 5;

const PRAZO_DADOS_BRUTOS_DIAS = 5;
const INTERVALO_LIMPEZA_DADOS_BRUTOS_MS = 60 * 60 * 1000;
const LIMITE_DIAS_DETALHES_INICIAIS = 7;
const LIMITE_RESUMOS_HISTORICOS = 740;
const LIMITE_DIAS_CONSULTA_DETALHADA = 90;
const JANELA_AGRUPAMENTO_IMPORTACAO_LEGADA_MS = 5 * 60 * 1000;

const MESES_ARQUIVO = [
  { numero: '01', nomes: ['janeiro', 'jan'] },
  { numero: '02', nomes: ['fevereiro', 'fev'] },
  { numero: '03', nomes: ['marco', 'mar'] },
  { numero: '04', nomes: ['abril', 'abr'] },
  { numero: '05', nomes: ['maio', 'mai'] },
  { numero: '06', nomes: ['junho', 'jun'] },
  { numero: '07', nomes: ['julho', 'jul'] },
  { numero: '08', nomes: ['agosto', 'ago'] },
  { numero: '09', nomes: ['setembro', 'set'] },
  { numero: '10', nomes: ['outubro', 'out'] },
  { numero: '11', nomes: ['novembro', 'nov'] },
  { numero: '12', nomes: ['dezembro', 'dez'] }
];

const ROTINAS_PADRAO = [
  { id: 'rotina-01', nome: '01º Promotor - Fotos abertura do dia Até 6h30', nomeMoki: '01º Promotor - Fotos abertura do dia Até 6h30', aliases: ['1o Promotor - Fotos abertura do dia Até 6h30'], horarioInicio: '', horarioFim: '06:30', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-02', nome: '02º Promotor - Rotina manhã Até 8h00', nomeMoki: '02º Promotor - Rotina manhã Até 8h00', aliases: ['2o Promotor - Rotina manhã Até 8h00'], horarioInicio: '', horarioFim: '08:00', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-03', nome: '03º Promotor -Inventário de entrada até 8h', nomeMoki: '03º Promotor -Inventário de entrada até 8h', aliases: ['03° Inventário de entrada até 8h'], horarioInicio: '', horarioFim: '08:00', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-04', nome: '04º Promotor - Montagem de Exposições Até 10h', nomeMoki: '04º Promotor - Montagem de Exposições Até 10h', aliases: ['04o Promotor - Montagem de Exposições Até 9h00', '3o Promotor - Montagem de Exposições Até 9h00', '[Até 9h00] Promotor - Montagem de Exposições'], horarioInicio: '', horarioFim: '10:00', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-05', nome: '05º Promotor - Pedidos e quebras Até 9h00', nomeMoki: '05º Promotor - Pedidos e quebras Até 9h00', aliases: ['04o Promotor - Pedidos e quebras Até 9h00', '4o Promotor - Pedidos e quebras Até 9h00'], horarioInicio: '', horarioFim: '09:00', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-06', nome: '06º Promotor - Reabastecimento 9:30hrs', nomeMoki: '06º Promotor - Reabastecimento 9:30hrs', aliases: ['05o Promotor - Reabastecimento 9:30hrs', '5o Promotor - Reabastecimento 9:30hrs'], horarioInicio: '', horarioFim: '09:30', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-07', nome: '07º Promotor - Reabastecimento 10:30hrs', nomeMoki: '07º Promotor - Reabastecimento 10:30hrs', aliases: ['06o Promotor - Reabastecimento 10:30hrs', '7o Promotor - Reabastecimento 10:30hrs'], horarioInicio: '', horarioFim: '10:30', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-08', nome: '08º Promotor- Triagem de Produtos', nomeMoki: '08º Promotor- Triagem de Produtos', aliases: ['07o Promotor- Triagem de Produtos', '8o Promotor- Triagem de Produtos'], horarioInicio: '', horarioFim: '', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-09', nome: '09ºPromotor - Relatório Fotográfico Até 11:30hrs', nomeMoki: '09ºPromotor - Relatório Fotográfico Até 11:30hrs', aliases: ['09ºPromotor - Relatório Fotográfico Até 11hrs', '09oPromotor - Relatório Fotográfico Até 11hrs', '08oPromotor - Relatório Fotográfico Até 11hrs', '9oPromotor - Relatório Fotográfico Até 11hrs', 'Relatório Fotográfico Até 11hrs', '[Até 11h] Promotor - Relatório Fotográfico'], horarioInicio: '', horarioFim: '11:30', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-10', nome: '10° Inventário de saída  até 11:30', nomeMoki: '10° Inventário de saída  até 11:30', horarioInicio: '', horarioFim: '11:30', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-11', nome: '11º Promotor - Banca de Saída 11:45hrs', nomeMoki: '11º Promotor - Banca de Saída 11:45hrs', aliases: ['09o Promotor - Banca de Saída 11:45hrs'], horarioInicio: '', horarioFim: '11:45', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-12', nome: '12º Promotor- Notas fiscais E Quebras', nomeMoki: '12º Promotor- Notas fiscais E Quebras', aliases: ['PROMOTOR- Notas fiscais E Quebras'], horarioInicio: '', horarioFim: '', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: 'todas', ativa: true },
  { id: 'rotina-segunda-limpeza', nome: 'Promotor - Limpeza das Bancas [2ª. FEIRA]', nomeMoki: 'Promotor - Limpeza das Bancas [2ª. FEIRA]', horarioInicio: '', horarioFim: '', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [1], escopo: 'todas', ativa: true },
  { id: 'rotina-segunda-quinta-precos', nome: 'Promotor - Troca de Preços [2ª & 5ª FEIRA]', nomeMoki: 'Promotor - Troca de Preços [2ª & 5ª FEIRA]', aliases: ['Promotor - Troca de Preços [2a'], horarioInicio: '', horarioFim: '', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [1,4], escopo: 'todas', ativa: true },
  { id: 'rotina-12x36-inventario-saida', nome: 'Inventário de saída 12x36', nomeMoki: 'Inventário de saída 12x36', horarioInicio: '', horarioFim: '', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: '12x36', ativa: true },
  { id: 'rotina-12x36-reab-14', nome: 'Reabastecimento 14:00h', nomeMoki: 'Reabastecimento 14:00h', horarioInicio: '', horarioFim: '14:00', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: '12x36', ativa: true },
  { id: 'rotina-12x36-reab-16', nome: 'Reabastecimento 16:00h', nomeMoki: 'Reabastecimento 16:00h', horarioInicio: '', horarioFim: '16:00', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: '12x36', ativa: true },
  { id: 'rotina-12x36-saida-1745', nome: 'Reabastecimento Saída Até 17:45', nomeMoki: 'Reabastecimento Saída Até 17:45', horarioInicio: '', horarioFim: '17:45', toleranciaInicioMin: 0, toleranciaFimMin: 0, dias: [0,1,2,3,4,5,6], escopo: '12x36', ativa: true }

];

// Regras específicas das nomenclaturas antigas encontradas nos relatórios de janeiro a julho.
// Elas preservam o horário válido no nome histórico sem alterar a regra atual da rotina.
const REGRAS_HISTORICAS_CHECKLIST = [
  {
    rotinaId: 'rotina-09',
    aliases: [
      '09ºPromotor - Relatório Fotográfico Até 11hrs',
      '09oPromotor - Relatório Fotográfico Até 11hrs',
      '08oPromotor - Relatório Fotográfico Até 11hrs',
      '9oPromotor - Relatório Fotográfico Até 11hrs',
      'Relatório Fotográfico Até 11hrs',
      '[Até 11h] Promotor - Relatório Fotográfico'
    ],
    horarioFim: '11:00'
  },
  {
    rotinaId: 'rotina-04',
    aliases: [
      '04o Promotor - Montagem de Exposições Até 9h00',
      '3o Promotor - Montagem de Exposições Até 9h00',
      '[Até 9h00] Promotor - Montagem de Exposições'
    ],
    horarioFim: '09:00'
  }
];

const LOJAS_ATIVAS = [
  { codigo: '085', nome: 'ASSAÍ CESAMAR' },
  { codigo: '086', nome: 'ASSAÍ TEOTÔNIO' },
  { codigo: '049', nome: 'COMPER ASA SUL' },
  { codigo: '051', nome: 'COMPER GAMA' },
  { codigo: '052', nome: 'COMPER SOBRADINHO' },
  { codigo: '046', nome: 'COMPER ÁGUAS CLARAS' },
  { codigo: '061', nome: 'COSTA ADE' },
  { codigo: '080', nome: 'COSTA AVENIDA GOIÁS' },
  { codigo: '083', nome: 'COSTA GO-070' },
  { codigo: '059', nome: 'COSTA GOIÂNIA' },
  { codigo: '081', nome: 'COSTA JARDIM GOIÁS' },
  { codigo: '058', nome: 'COSTA LARANJEIRAS' },
  { codigo: '056', nome: 'COSTA LUZIÂNIA' },
  { codigo: '084', nome: 'COSTA RIO VERDE' },
  { codigo: '060', nome: 'COSTA SANTA MARIA' },
  { codigo: '082', nome: 'COSTA SENADOR CANEDO' },
  { codigo: '079', nome: 'COSTA T-63' },
  { codigo: '057', nome: 'COSTA TAGUATINGA' },
  { codigo: '055', nome: 'COSTA TAQUARI' },
  { codigo: '062', nome: 'COSTA UNIEURO' },
  { codigo: '063', nome: 'COSTA VALPARAISO' },
  { codigo: '019', nome: 'DD APARECIDA GOIÂNIA' },
  { codigo: '011', nome: 'DD BR 070' },
  { codigo: '004', nome: 'DD CEILANDIA CENTRO' },
  { codigo: '008', nome: 'DD CEILANDIA SUL' },
  { codigo: '078', nome: 'DD CEILÂNDIA NORTE' },
  { codigo: '015', nome: 'DD CESAR LATES' },
  { codigo: '028', nome: 'DD EPTG' },
  { codigo: '030', nome: 'DD FORMOSA' },
  { codigo: '032', nome: 'DD FURNAS' },
  { codigo: '001', nome: 'DD GAMA' },
  { codigo: '025', nome: 'DD GOIANÉSIA' },
  { codigo: '006', nome: 'DD GUARÁ' },
  { codigo: '020', nome: 'DD GURUPI' },
  { codigo: '014', nome: 'DD HORACIO COSTA' },
  { codigo: '034', nome: 'DD ITUMBIARA' },
  { codigo: '022', nome: 'DD JD BOTÂNICO' },
  { codigo: '021', nome: 'DD LEM' },
  { codigo: '007', nome: 'DD LUZIÂNIA' },
  { codigo: '024', nome: 'DD MESTRE DARMAS' },
  { codigo: '002', nome: 'DD NOVO GAMA' },
  { codigo: '033', nome: 'DD PARK JK' },
  { codigo: '018', nome: 'DD PLANALTINA-DF' },
  { codigo: '010', nome: 'DD PLANALTINA-GO' },
  { codigo: '029', nome: 'DD RECANTO' },
  { codigo: '031', nome: 'DD RIACHO' },
  { codigo: '026', nome: 'DD RIO VERDE' },
  { codigo: '027', nome: 'DD SAMAMBAIA' },
  { codigo: '005', nome: 'DD SANTO ÂNTONIO' },
  { codigo: '013', nome: 'DD SIA' },
  { codigo: '017', nome: 'DD SOBRADINHO' },
  { codigo: '016', nome: 'DD TAGUATINGA SUL' },
  { codigo: '012', nome: 'DD VICENTE PIRES' },
  { codigo: '023', nome: 'DD VICENTE PIRES 2' },
  { codigo: '009', nome: 'DD ÁGUAS CLARAS' },
  { codigo: '003', nome: 'DD ÁGUAS LINDAS' },
  { codigo: '047', nome: 'FORT CEILÂNDIA' },
  { codigo: '048', nome: 'FORT PLANALTINA' },
  { codigo: '054', nome: 'FORT RECANTO DAS EMAS' },
  { codigo: '053', nome: 'FORT SOL NASCENTE' },
  { codigo: '050', nome: 'FORT TAGUATINGA' },
  { codigo: '045', nome: 'FORT VALPARAÍSO' }
];

const CODIGOS_LOJAS_12X36 = new Set(['009', '022', '013', '079', '081', '082', '059']);
const LOJAS_FIXAS_12X36 = LOJAS_ATIVAS.filter((loja) => CODIGOS_LOJAS_12X36.has(loja.codigo)).map((loja) => loja.nome);
const LOJAS_ATIVAS_POR_CODIGO = new Map(LOJAS_ATIVAS.map((loja) => [loja.codigo, loja]));
const LOJAS_ATIVAS_POR_SLUG = new Map(LOJAS_ATIVAS.map((loja) => [slug(loja.nome), loja]));


const REGIONAIS = [
  { id: 'df_go', nome: 'Regional DF/GO', nomeCurto: 'DF/GO' },
  { id: 'goiania_fora', nome: 'Regional Goiânia – Lojas Fora', nomeCurto: 'Goiânia – Lojas Fora' }
];
const REGIONAIS_POR_ID = new Map(REGIONAIS.map((regional) => [regional.id, regional]));
const CODIGOS_REGIONAL_GOIANIA_FORA = new Set([
  '085', '086', '080', '083', '059', '081', '058', '084', '082', '079',
  '019', '015', '025', '020', '014', '034', '021', '026'
]);
const defaultLojaRegionalMap = LOJAS_ATIVAS.reduce((acc, loja) => {
  acc[loja.codigo] = CODIGOS_REGIONAL_GOIANIA_FORA.has(loja.codigo) ? 'goiania_fora' : 'df_go';
  return acc;
}, {});

const registrosSimulados = [];

const CADASTRO_LOJAS_FORMADORES = [
  ['COMPER ASA SUL', 'Luciano'],
  ['COMPER SOBRADINHO', 'Luciano'],
  ['COMPER ÁGUAS CLARAS', 'Luciano'],
  ['COSTA ADE', 'Luciano'],
  ['COSTA TAQUARI', 'Luciano'],
  ['COSTA UNIEURO', 'Luciano'],
  ['DD CEILÂNDIA CENTRO', 'Luciano'],
  ['DD CEILÂNDIA SUL', 'Luciano'],
  ['DD EPTG', 'Luciano'],
  ['DD FORMOSA', 'Luciano'],
  ['DD GUARÁ', 'Luciano'],
  ['DD JD BOTÂNICO', 'Luciano'],
  ['DD MESTRE DARMAS', 'Luciano'],
  ['DD PLANALTINA-DF', 'Luciano'],
  ['DD PLANALTINA-GO', 'Luciano'],
  ['DD SIA', 'Luciano'],
  ['DD SOBRADINHO', 'Luciano'],
  ['DD TAGUATINGA SUL', 'Luciano'],
  ['DD ÁGUAS LINDAS', 'Luciano'],
  ['FORT CEILÂNDIA', 'Luciano'],
  ['FORT PLANALTINA', 'Luciano'],
  ['FORT SOL NASCENTE', 'Luciano'],
  ['FORT TAGUATINGA', 'Luciano'],
  ['TT - ÁGUAS LINDAS NOVA', 'Luciano'],
  ['TT - ÁGUAS LINDAS VELHA', 'Luciano'],
  ['TT - CEILÂNDIA PSUL', 'Luciano'],
  ['TT - EPTG', 'Luciano'],

  ['BRETAS ARMAZÉM', 'Karina'],
  ['COSTA GOIÂNIA', 'Karina'],
  ['COSTA LARANJEIRAS', 'Karina'],
  ['DANIEL PEREIRA GOMES', 'Karina'],
  ['DD APARECIDA GOIÂNIA', 'Karina'],
  ['DD CESAR LATES', 'Karina'],
  ['DD GOIANÉSIA', 'Karina'],
  ['DD GURUPI', 'Karina'],
  ['DD HORACIO COSTA', 'Karina'],
  ['DD ITUMBIARA', 'Karina'],
  ['DD LEM', 'Karina'],
  ['DD RIO VERDE', 'Karina'],

  ['COMPER GAMA', 'Luana'],
  ['COSTA LUZIÂNIA', 'Luana'],
  ['COSTA SANTA MARIA', 'Luana'],
  ['COSTA TAGUATINGA', 'Luana'],
  ['COSTA VALPARAÍSO', 'Luana'],
  ['DD BR 070', 'Luana'],
  ['DD FURNAS', 'Luana'],
  ['DD GAMA', 'Luana'],
  ['DD LUZIÂNIA', 'Luana'],
  ['DD NOVO GAMA', 'Luana'],
  ['DD PARK JK', 'Luana'],
  ['DD RECANTO', 'Luana'],
  ['DD RIACHO', 'Luana'],
  ['DD SAMAMBAIA', 'Luana'],
  ['DD SANTO ANTÔNIO', 'Luana'],
  ['DD VICENTE PIRES', 'Luana'],
  ['DD VICENTE PIRES 2', 'Luana'],
  ['DD ÁGUAS CLARAS', 'Luana'],
  ['FORT RECANTO DAS EMAS', 'Luana'],
  ['FORT VALPARAÍSO', 'Luana'],
  ['TT - LUZIÂNIA', 'Luana'],
  ['TT - RECANTO DAS EMAS', 'Luana'],
  ['TT - SAMAMBAIA NORTE', 'Luana'],
  ['TT - SAMAMBAIA SUL', 'Luana'],
  ['TT - SANTA MARIA', 'Luana'],
  ['TT - VICENTE PIRES', 'Luana'],
];

const ALIASES_LOJAS = {
  'COSTA GOIÂNIA': ['COSTA GOIANIA', 'COSTA GOIÂNIA (ANEL VIÁRIO)', 'COSTA GOIANIA (ANEL VIARIO)', 'COSTA GOIANIA ANEL VIARIO'],
  'COSTA JARDIM GOIÁS': ['COSTA JARDIM GOIAS'],
  'COSTA SENADOR CANEDO': ['COSTA SENADOR CANÊDO'],
  'COSTA AVENIDA GOIÁS': ['COSTA AVENIDA GOIAS'],
  'ASSAÍ CESAMAR': ['ASSAI CESAMAR'],
  'ASSAÍ TEOTÔNIO': ['ASSAI TEOTONIO', 'ASSAÍ TEOTONIO'],
  'COMPER ASA SUL': ['G.P - 55 ASA SUL', 'GP 55 ASA SUL', 'G P 55 ASA SUL'],
  'COMPER SOBRADINHO': ['G.P - 30 COMPER SOBRAD', 'GP 30 COMPER SOBRAD', 'COMPER SOBRAD', 'COMPER SOBRADINHO 30'],
  'COMPER ÁGUAS CLARAS': ['G.P - 58 AGUAS CLARAS', 'GP 58 AGUAS CLARAS', 'COMPER AGUAS CLARAS'],
  'COSTA VALPARAÍSO': ['COSTA VALPARAISO'],
  'DD CEILÂNDIA CENTRO': ['DD CEILANDIA CENTRO'],
  'DD CEILÂNDIA SUL': ['DD CEILANDIA SUL'],
  'DD EPTG': ['DD EPTG'],
  'DD GOIANÉSIA': ['DD GOIANESIA'],
  'DD JD BOTÂNICO': ['DD JD BOTANICO', 'DD JD. BOTANICO', 'DD JD BOTÃNICO'],
  'DD LUZIÂNIA': ['DD LUZIANIA'],
  'DD SANTO ANTÔNIO': ['DD SANTO ANTONIO', 'DD SANTO ÂNTONIO'],
  'DD ÁGUAS CLARAS': ['DD AGUAS CLARAS'],
  'DD ÁGUAS LINDAS': ['DD AGUAS LINDAS'],
  'FORT CEILÂNDIA': ['G.P - 39 CEILÂNDIA', 'GP 39 CEILANDIA', 'FORT CEILANDIA'],
  'FORT PLANALTINA': ['G.P - 82 PLANALTINA', 'GP 82 PLANALTINA'],
  'FORT RECANTO DAS EMAS': ['G.P - 64 RECANTO DAS EMAS', 'GP 64 RECANTO DAS EMAS'],
  'FORT SOL NASCENTE': ['G.P - 22 SOL NASCENTE', 'GP 22 SOL NASCENTE'],
  'FORT TAGUATINGA': ['G.P - 74 TAGUATINGA', 'GP 74 TAGUATINGA'],
  'FORT VALPARAÍSO': ['G.P - 77 VALPARAISO', 'GP 77 VALPARAISO', 'FORT VALPARAISO'],
  'TT - ÁGUAS LINDAS NOVA': ['TT - AGUAS LINDAS NOVA'],
  'TT - ÁGUAS LINDAS VELHA': ['TT - AGUAS LINDAS VELHA'],
  'TT - CEILÂNDIA PSUL': ['TT - CEILANDIA PSUL'],
  'TT - LUZIÂNIA': ['TT - LUZIANIA'],
  'COMPER GAMA': ['G.P - 17 COMPER GAMA', 'GP 17 COMPER GAMA'],
  'DD ÁGUAS CLARAS': ['DD AGUAS CLARAS', 'DIA A DIA AGUAS CLARAS', 'DIA A DIA ÁGUAS CLARAS'],
  'DD JD BOTÂNICO': ['DD JD BOTANICO', 'DD JD. BOTANICO', 'DD JD BOTÃNICO', 'DIA A DIA JARDIM BOTANICO', 'DIA A DIA JARDIM BOTÂNICO'],
  'DD SIA': ['DIA A DIA SIA'],
  'COSTA T-63': ['COSTA T63', 'COSTA T 63'],
  'COSTA JARDIM GOIÁS': ['COSTA JARDIM GOIAS', 'COSTA JD GOIAS', 'COSTA JD GOIÁS'],
  'COSTA SENADOR CANEDO': ['COSTA SENADOR CANÊDO'],
  'COSTA GOIÂNIA (ANEL VIÁRIO)': ['COSTA GOIANIA (ANEL VIARIO)', 'COSTA GOIANIA ANEL VIARIO', 'COSTA GOIÂNIA ANEL VIÁRIO', 'COSTA ANEL VIARIO', 'COSTA ANEL VIÁRIO'],
};

const lojaFormadorInicial = [...CADASTRO_LOJAS_FORMADORES];

function construirMapaPorSlug(pares) {
  return pares.reduce((acc, [loja, valor]) => {
    acc[slug(loja)] = valor;
    return acc;
  }, {});
}

function construirMapaAliases() {
  return Object.entries(ALIASES_LOJAS).reduce((acc, [oficial, aliases]) => {
    acc[slug(oficial)] = oficial;
    aliases.forEach((alias) => {
      acc[slug(alias)] = oficial;
    });
    return acc;
  }, {});
}

const lojaAliasMap = construirMapaAliases();
const defaultLojaRenameMap = { ...lojaAliasMap };
const defaultLojaFormadorMap = (() => {
  const mapa = construirMapaPorSlug(CADASTRO_LOJAS_FORMADORES);
  Object.entries(lojaAliasMap).forEach(([aliasSlug, oficial]) => {
    const formador = mapa[slug(oficial)];
    if (formador) mapa[aliasSlug] = formador;
  });
  return mapa;
})();

const filtros = {
  rede: document.getElementById('filterRede'),
  loja: document.getElementById('filterLoja'),
  formador: document.getElementById('filterFormador'),
  status: document.getElementById('filterStatus'),
  dataInicial: document.getElementById('filterDataInicial'),
  dataFinal: document.getElementById('filterDataFinal'),
  rotina: document.getElementById('filterRotina')
};

const datasetStatus = document.getElementById('datasetStatus');
const importBadge = document.getElementById('importBadge');
const importSummary = document.getElementById('importSummary');
const fileInput = document.getElementById('fileInput');

function setImportStatus(summaryText, badgeText = '') {
  if (importSummary) importSummary.textContent = summaryText;
  if (importBadge) importBadge.textContent = badgeText;
}

function adminPainelEstaVisivel() {
  const experiencia = document.getElementById('adminModal');
  const painel = document.getElementById('adminPanelView');
  return Boolean(experiencia && painel && !experiencia.classList.contains('hidden') && !painel.classList.contains('hidden'));
}

const formatarNumero = new Intl.NumberFormat('pt-BR');

function normalizarMapaChaves(mapa = {}) {
  return Object.entries(mapa || {}).reduce((acc, [chave, valor]) => {
    acc[slug(chave)] = valor;
    return acc;
  }, {});
}

function ehFormadorAtivo(valor) {
  return FORMADORES_ATIVOS_SLUG.has(slug(valor));
}

function normalizarNomeFormador(valor) {
  const encontrado = FORMADORES_ATIVOS.find((item) => slug(item) === slug(valor));
  return encontrado || '';
}

function sanitizarMapaFormadores(mapa = {}) {
  return Object.entries(mapa || {}).reduce((acc, [chave, valor]) => {
    const formador = normalizarNomeFormador(valor);
    if (formador) acc[slug(chave)] = formador;
    return acc;
  }, {});
}


function sanitizarMapaRegionais(mapa = {}) {
  return LOJAS_ATIVAS.reduce((acc, loja) => {
    const informado = mapa?.[loja.codigo] || mapa?.[String(Number(loja.codigo))] || '';
    if (REGIONAIS_POR_ID.has(informado) || informado === 'sem_regional') acc[loja.codigo] = informado;
    return acc;
  }, {});
}

function resolverRegional(loja = '', codigoUnidade = '') {
  const lojaAtiva = resolverLojaAtiva(loja, codigoUnidade);
  const codigo = lojaAtiva?.codigo || normalizarCodigoUnidade(codigoUnidade);
  const regionalId = codigo ? lojaRegionalMap?.[codigo] : '';
  const regional = REGIONAIS_POR_ID.get(regionalId);
  return regional ? { ...regional } : { id: 'sem_regional', nome: 'Sem regional', nomeCurto: 'Sem regional' };
}

function registroPertenceRegional(item, regionalId = regionalSelecionada) {
  if (!regionalId || regionalId === 'geral') return true;
  return resolverRegional(item?.loja, item?.codigoUnidade).id === regionalId;
}

migrarArmazenamentoSeNecessario();

let lojaFormadorMap = sanitizarMapaFormadores({ ...defaultLojaFormadorMap, ...normalizarMapaChaves(carregarStore(STORAGE_KEYS.storeFormadorMap, {})) });
let lojaPromotorMap = normalizarMapaChaves(carregarStore(STORAGE_KEYS.storePromotorMap, {}));
let lojaRegionalMap = sanitizarMapaRegionais({ ...defaultLojaRegionalMap, ...carregarStore(STORAGE_KEYS.storeRegionalMap, {}) });
let regionalSelecionada = 'geral';
let regionalMapRevisado = localStorage.getItem(STORAGE_KEYS.regionalMapReviewed) === '1';
let lojaRenameMap = normalizarMapaChaves({ ...defaultLojaRenameMap, ...carregarStore(STORAGE_KEYS.storeRenameMap, {}) });
let configRotinas = normalizarConfiguracoesRotinas(carregarStore(STORAGE_KEYS.routineConfig, ROTINAS_PADRAO));
let lojasConhecidas = new Set(LOJAS_ATIVAS.map((loja) => loja.nome));
let snapshotsImportados = carregarStore(STORAGE_KEYS.importedSnapshots, []);
let snapshotsRecentes = [...snapshotsImportados];
let snapshotsSobDemanda = [];
let resumosDiarios = carregarStore(STORAGE_KEYS.dailySummaries, []);
let periodoSobDemandaAtual = { dataInicial: '', dataFinal: '' };
let carregamentoPeriodoPromise = null;
let limiteHistoricoVisivel = 30;
let versaoCacheDados = 0;
let cacheConsolidado = { versao: -1, dados: [] };
let cacheRespostasPersistidas = { versao: -1, respostas: [] };

snapshotsRecentes = snapshotsRecentes
  .filter((item) => item && item.id)
  .sort((a, b) => String(b.latestDate || '').localeCompare(String(a.latestDate || '')))
  .slice(0, LIMITE_DIAS_DETALHES_INICIAIS);
resumosDiarios = resumosDiarios.map(normalizarResumoDiario).filter(Boolean).slice(0, LIMITE_RESUMOS_HISTORICOS);
snapshotsImportados = [...snapshotsRecentes];
// Compacta imediatamente versões antigas que ainda mantinham muitos dias no navegador.
persistirSnapshotsLocais();

function invalidarCacheDados() {
  versaoCacheDados += 1;
  cacheConsolidado = { versao: -1, dados: [] };
  cacheRespostasPersistidas = { versao: -1, respostas: [] };
}

let registrosBase = normalizarBaseCompleta(registrosSimulados, 'simulada');
let registros = [...registrosBase];
let dadosFiltrados = [...registrosBase];
let ultimaDataDisponivel = obterUltimaData(registrosBase);

lojaFormadorMap = sanitizarMapaFormadores(lojaFormadorMap);
salvarStore(STORAGE_KEYS.storeFormadorMap, lojaFormadorMap);
lojaRenameMap = normalizarMapaChaves({ ...defaultLojaRenameMap, ...lojaRenameMap });
salvarStore(STORAGE_KEYS.storeRenameMap, lojaRenameMap);
salvarStore(STORAGE_KEYS.storeRegionalMap, lojaRegionalMap);

function migrarArmazenamentoSeNecessario() {
  const versaoAtual = localStorage.getItem(STORAGE_KEYS.appVersion);
  if (versaoAtual === APP_STORAGE_VERSION) return;

  localStorage.removeItem(STORAGE_KEYS.activeSnapshotId);
  localStorage.removeItem(STORAGE_KEYS.knownStores);
  if (!localStorage.getItem(STORAGE_KEYS.storeRenameMap)) {
    localStorage.setItem(STORAGE_KEYS.storeRenameMap, JSON.stringify(defaultLojaRenameMap));
  }
  if (!localStorage.getItem(STORAGE_KEYS.storeFormadorMap)) {
    localStorage.setItem(STORAGE_KEYS.storeFormadorMap, JSON.stringify(defaultLojaFormadorMap));
  }
  if (!localStorage.getItem(STORAGE_KEYS.storeRegionalMap)) {
    localStorage.setItem(STORAGE_KEYS.storeRegionalMap, JSON.stringify(defaultLojaRegionalMap));
  }
  if (!localStorage.getItem(STORAGE_KEYS.regionalMapReviewed)) {
    localStorage.setItem(STORAGE_KEYS.regionalMapReviewed, '0');
  }
  localStorage.setItem(STORAGE_KEYS.knownStores, JSON.stringify(LOJAS_ATIVAS.map((loja) => loja.nome)));
  localStorage.setItem(STORAGE_KEYS.appVersion, APP_STORAGE_VERSION);
}

function carregarStore(chave, fallback) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : fallback;
  } catch (error) {
    console.error(error);
    return fallback;
  }
}


function salvarStore(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (error) {
    console.error(`Erro ao salvar no localStorage (${chave}):`, error);
  }
}

function normalizarResumoDiario(item = {}) {
  const data = formatarData(item.latestDate || (typeof item.data === 'string' ? item.data : ''));
  if (!data) return null;
  return {
    id: item.id || `rotinas-${data}`,
    fileName: item.fileName || `Rotinas ${data.split('-').reverse().join('/')}`,
    importedAt: valorDataParaIso(item.importedAt, new Date().toISOString()),
    latestDate: data,
    total: Number(item.total || item.summary?.previstas || 0),
    responsesCount: Number(item.responsesCount || item.summary?.realizadas || 0),
    summary: item.summary || {},
    rawExpiresAt: valorDataParaIso(item.rawExpiresAt, ''),
    rawAvailable: item.rawAvailable !== false,
    rawRowsCount: Number(item.rawRowsCount || 0),
    rawDeletedAt: valorDataParaIso(item.rawDeletedAt, ''),
    chunksCount: Number(item.chunksCount || 0),
    rawChunksCount: Number(item.rawChunksCount || 0),
    dataKind: item.dataKind || 'responses',
    importBatchId: String(item.importBatchId || ''),
    importBatchImportedAt: valorDataParaIso(item.importBatchImportedAt, valorDataParaIso(item.importedAt, '')),
    sourceCompetence: String(item.sourceCompetence || ''),
    sourceCompetenceOrigin: String(item.sourceCompetenceOrigin || ''),
    sourceFileRows: Number(item.sourceFileRows || 0),
    sourceRecognizedRows: Number(item.sourceRecognizedRows || 0),
    sourceOutsideCompetenceCount: Number(item.sourceOutsideCompetenceCount || 0),
    sourceDatesCount: Number(item.sourceDatesCount || 0),
    schemaVersion: Number(item.schemaVersion || RESULT_SCHEMA_VERSION)
  };
}

function persistirResumosLocais() {
  const leves = resumosDiarios
    .map(normalizarResumoDiario)
    .filter(Boolean)
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate))
    .slice(0, LIMITE_RESUMOS_HISTORICOS);
  salvarStore(STORAGE_KEYS.dailySummaries, leves);
}

function recomporSnapshotsAtivos() {
  const mapa = new Map();
  [...snapshotsRecentes, ...snapshotsSobDemanda].forEach((item) => {
    if (!item?.id) return;
    mapa.set(item.id, item);
  });
  snapshotsImportados = [...mapa.values()].sort((a, b) => String(b.latestDate || '').localeCompare(String(a.latestDate || '')));
  invalidarCacheDados();
}

function persistirSnapshotsLocais() {
  const fonte = [...snapshotsRecentes]
    .sort((a, b) => String(b.latestDate || '').localeCompare(String(a.latestDate || '')))
    .slice(0, LIMITE_DIAS_DETALHES_INICIAIS);

  if (!firebaseDisponivel) {
    salvarStore(STORAGE_KEYS.importedSnapshots, fonte.map((item) => ({ ...item, rawData: undefined })));
    persistirResumosLocais();
    return;
  }

  const recentesComDados = new Set(fonte.slice(0, 7).map((item) => item.id));
  const resumo = fonte.map((item) => {
    const manterDadosLocais = recentesComDados.has(item.id) && Array.isArray(item.data);
    return {
      id: item.id,
      fileName: item.fileName,
      importedAt: item.importedAt,
      total: item.total,
      latestDate: item.latestDate,
      responsesCount: item.responsesCount || 0,
      summary: item.summary || {},
      rawExpiresAt: item.rawExpiresAt || '',
      rawAvailable: item.rawAvailable !== false,
      rawRowsCount: item.rawRowsCount || 0,
      rawDeletedAt: item.rawDeletedAt || '',
      chunksCount: item.chunksCount || 0,
      rawChunksCount: item.rawChunksCount || 0,
      dataKind: item.dataKind || (Number(item.schemaVersion || 0) >= RESULT_SCHEMA_VERSION ? 'responses' : 'results'),
      importBatchId: item.importBatchId || '',
      importBatchImportedAt: item.importBatchImportedAt || item.importedAt || '',
      sourceCompetence: item.sourceCompetence || '',
      sourceCompetenceOrigin: item.sourceCompetenceOrigin || '',
      sourceFileRows: item.sourceFileRows || 0,
      sourceRecognizedRows: item.sourceRecognizedRows || 0,
      sourceOutsideCompetenceCount: item.sourceOutsideCompetenceCount || 0,
      sourceDatesCount: item.sourceDatesCount || 0,
      schemaVersion: item.schemaVersion || (Array.isArray(item.data) && item.data.length ? 1 : 2),
      dataLoaded: manterDadosLocais,
      data: manterDadosLocais ? item.data : undefined
    };
  });

  salvarStore(STORAGE_KEYS.importedSnapshots, resumo);
  persistirResumosLocais();
}

function compactarMemoriaOperacional() {
  previewsImportacao = [];
  if (fileInput) fileInput.value = '';
  snapshotsSobDemanda = [];
  periodoSobDemandaAtual = { dataInicial: '', dataFinal: '' };
  snapshotsRecentes = snapshotsRecentes
    .filter((item) => item?.id)
    .sort((a, b) => String(b.latestDate || '').localeCompare(String(a.latestDate || '')))
    .slice(0, LIMITE_DIAS_DETALHES_INICIAIS)
    .map((item) => ({ ...item, rawData: undefined }));
  recomporSnapshotsAtivos();
  persistirSnapshotsLocais();
}

function otimizarSistemaAgora() {
  compactarMemoriaOperacional();
  filtros.rede.value = '';
  filtros.loja.value = '';
  filtros.formador.value = '';
  filtros.status.value = '';
  filtros.rotina.value = '';
  const ultima = obterUltimaDataImportadaNoPeriodo('', '') || ultimaDataDisponivel;
  if (ultima) {
    filtros.dataInicial.value = ultima;
    filtros.dataFinal.value = ultima;
    resumoPeriodoAtual = 'diario';
    document.querySelectorAll('.summary-tab').forEach((button) => button.classList.toggle('active', button.dataset.period === 'diario'));
  }
  atualizarBasePorSnapshots('Memória otimizada. Somente os 7 dias mais recentes permanecem carregados; datas antigas continuam salvas e são abertas sob demanda.');
  renderizarPreviewImportacao();
  const feedback = document.getElementById('memoryOptimizationFeedback');
  if (feedback) feedback.textContent = 'Otimização concluída. Os dados históricos permanecem preservados no Firebase.';
  setImportStatus('Memória liberada. O histórico continua salvo e será carregado apenas quando você consultar uma data antiga.', 'Sistema otimizado');
}

function atualizarBasePorSnapshots(detalhe = '') {
  registrosBase = snapshotsImportados.length
    ? consolidarSnapshotsImportados()
    : normalizarBaseCompleta(registrosSimulados, 'simulada');

  aplicarBase(
    registrosBase,
    snapshotsImportados.length ? 'importada' : 'simulada',
    detalhe || (
      snapshotsImportados.length
        ? `${registrosBase.length} registros consolidados de ${snapshotsImportados.length} planilha(s) importada(s).`
        : 'Painel sem dados. Importe uma ou mais planilhas para carregar as rotinas.'
    )
  );

  atualizarResumoAdmin();
  if (adminPainelEstaVisivel()) {
    popularControlesAdmin();
    renderHistoricoPlanilhas();
  }
}

async function inicializarFirebaseOpcional() {
  try {
    const [{ initializeApp }, firestoreApi] = await Promise.all([
      import(FIREBASE_URLS.app),
      import(FIREBASE_URLS.firestore)
    ]);

    firebaseApi = firestoreApi;
    firebaseApp = initializeApp(firebaseConfig);
    db = firestoreApi.getFirestore(firebaseApp);
    painelConfigRef = firestoreApi.doc(db, 'painel_meta', 'app_state');
    snapshotsCollectionRef = firestoreApi.collection(db, 'painel_snapshots');
    firebaseDisponivel = true;
    firebaseInicializado = true;
    iniciarFirebaseSync();
  } catch (error) {
    firebaseDisponivel = false;
    firebaseInicializado = true;
    console.warn('Firebase indisponível. O painel seguirá funcionando com armazenamento local.', error);
  }
}

async function salvarConfigNoFirebase() {
  if (!firebaseDisponivel || !firebaseApi || !painelConfigRef) return false;
  try {
    await firebaseApi.setDoc(painelConfigRef, {
      appVersion: APP_STORAGE_VERSION,
      storeFormadorMap: sanitizarMapaFormadores(lojaFormadorMap),
      storePromotorMap: lojaPromotorMap,
      storeRegionalMap: sanitizarMapaRegionais(lojaRegionalMap),
      regionalMapReviewed: regionalMapRevisado,
      storeRenameMap: lojaRenameMap,
      routineConfig: configRotinas,
      knownStores: LOJAS_ATIVAS.map((loja) => loja.nome),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao salvar configuração no Firebase:', error);
    return false;
  }
}

function dividirEmLotes(lista, tamanho = 200) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamanho) {
    lotes.push(lista.slice(i, i + tamanho));
  }
  return lotes;
}

async function excluirSubcolecaoSnapshotNoFirebase(snapshotId, nomeSubcolecao) {
  if (!firebaseDisponivel || !firebaseApi || !db) return;

  const chunksRef = firebaseApi.collection(db, 'painel_snapshots', snapshotId, nomeSubcolecao);
  const chunksSnap = await firebaseApi.getDocs(chunksRef);
  const docs = chunksSnap.docs || [];

  for (let i = 0; i < docs.length; i += 200) {
    const batch = firebaseApi.writeBatch(db);
    docs.slice(i, i + 200).forEach((docItem) => batch.delete(docItem.ref));
    await batch.commit();
  }
}

async function excluirChunksSnapshotNoFirebase(snapshotId) {
  return excluirSubcolecaoSnapshotNoFirebase(snapshotId, 'chunks');
}

async function excluirDadosBrutosSnapshotNoFirebase(snapshotId, atualizarMeta = true) {
  if (!firebaseDisponivel || !firebaseApi || !db) return false;
  try {
    await excluirSubcolecaoSnapshotNoFirebase(snapshotId, 'raw_chunks');
    if (atualizarMeta) {
      await firebaseApi.setDoc(firebaseApi.doc(db, 'painel_snapshots', snapshotId), {
        rawAvailable: false,
        rawChunksCount: 0,
        rawDeletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    return true;
  } catch (error) {
    console.error(`Erro ao excluir dados brutos do snapshot ${snapshotId}:`, error);
    return false;
  }
}

async function salvarSnapshotNoFirebase(snapshot) {
  if (!firebaseDisponivel || !firebaseApi || !db) return false;
  try {
    const { data, rawData, ...meta } = snapshot;
    const lotes = dividirEmLotes(Array.isArray(data) ? data : [], 200);
    const temRawData = Array.isArray(rawData);
    const lotesRaw = temRawData ? dividirEmLotes(rawData, 200) : [];

    await excluirChunksSnapshotNoFirebase(snapshot.id);

    for (let i = 0; i < lotes.length; i += 20) {
      const batch = firebaseApi.writeBatch(db);
      lotes.slice(i, i + 20).forEach((lote, indiceInterno) => {
        const indice = i + indiceInterno;
        const chunkRef = firebaseApi.doc(db, 'painel_snapshots', snapshot.id, 'chunks', `chunk-${String(indice).padStart(4, '0')}`);
        batch.set(chunkRef, {
          index: indice,
          rows: lote,
          fileName: snapshot.fileName,
          importedAt: snapshot.importedAt
        });
      });
      await batch.commit();
    }

    if (temRawData) {
      await excluirSubcolecaoSnapshotNoFirebase(snapshot.id, 'raw_chunks');
      const expiraEm = snapshot.rawExpiresAt ? new Date(snapshot.rawExpiresAt) : new Date(Date.now() + PRAZO_DADOS_BRUTOS_DIAS * 86400000);

      for (let i = 0; i < lotesRaw.length; i += 20) {
        const batch = firebaseApi.writeBatch(db);
        lotesRaw.slice(i, i + 20).forEach((lote, indiceInterno) => {
          const indice = i + indiceInterno;
          const chunkRef = firebaseApi.doc(db, 'painel_snapshots', snapshot.id, 'raw_chunks', `raw-${String(indice).padStart(4, '0')}`);
          batch.set(chunkRef, {
            index: indice,
            rows: lote,
            fileName: snapshot.fileName,
            importedAt: snapshot.importedAt,
            expiresAt: firebaseApi.Timestamp.fromDate(expiraEm)
          });
        });
        await batch.commit();
      }
    }

    const metaFinal = {
      ...meta,
      chunksCount: lotes.length,
      schemaVersion: RESULT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      data: firebaseApi.deleteField()
    };

    if (temRawData) {
      metaFinal.rawChunksCount = lotesRaw.length;
      metaFinal.rawRowsCount = rawData.length;
      metaFinal.rawAvailable = true;
      metaFinal.rawDeletedAt = '';
    }

    await firebaseApi.setDoc(firebaseApi.doc(db, 'painel_snapshots', snapshot.id), metaFinal, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao salvar snapshot no Firebase:', error);
    return false;
  }
}

async function verificarSnapshotNoFirebase(snapshot) {
  if (!firebaseDisponivel || !firebaseApi || !db) return true;
  try {
    const docSnap = await firebaseApi.getDoc(firebaseApi.doc(db, 'painel_snapshots', snapshot.id));
    if (!docSnap.exists()) return false;
    const meta = normalizarSnapshotFirebase({ id: docSnap.id, ...docSnap.data() });
    if (Number(meta.responsesCount || 0) !== Number(snapshot.responsesCount || 0)) return false;
    if (Number(meta.total || 0) !== Number(snapshot.total || 0)) return false;
    if (String(meta.latestDate || '') !== String(snapshot.latestDate || '')) return false;
    if (snapshot.importBatchId && String(meta.importBatchId || '') !== String(snapshot.importBatchId)) return false;
    const dados = await carregarDadosSnapshotNoFirebase(meta);
    return dados.length === (Array.isArray(snapshot.data) ? snapshot.data.length : 0);
  } catch (error) {
    console.error(`Erro ao verificar snapshot ${snapshot?.id || ''}:`, error);
    return false;
  }
}

async function salvarSnapshotNoFirebaseVerificado(snapshot, tentativas = 2) {
  if (!firebaseDisponivel) return true;
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    const salvo = await salvarSnapshotNoFirebase(snapshot);
    if (salvo && await verificarSnapshotNoFirebase(snapshot)) return true;
    if (tentativa < tentativas) await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return false;
}

async function carregarSnapshotCompletoPorId(snapshotId) {
  let snapshot = snapshotsImportados.find((item) => item.id === snapshotId)
    || obterHistoricoLeve().find((item) => item.id === snapshotId);
  if (snapshot && Array.isArray(snapshot.data) && snapshot.data.length) return snapshot;
  if (!firebaseDisponivel || !firebaseApi || !db) return snapshot || null;
  try {
    const docSnap = await firebaseApi.getDoc(firebaseApi.doc(db, 'painel_snapshots', snapshotId));
    if (!docSnap.exists()) return null;
    const meta = normalizarSnapshotFirebase({ id: docSnap.id, ...docSnap.data() });
    return { ...meta, data: await carregarDadosSnapshotNoFirebase(meta), dataLoaded: true };
  } catch (error) {
    console.error(`Erro ao carregar snapshot completo ${snapshotId}:`, error);
    return null;
  }
}

async function excluirSnapshotNoFirebase(snapshotId) {
  if (!firebaseDisponivel || !firebaseApi || !db) return false;
  try {
    await excluirChunksSnapshotNoFirebase(snapshotId);
    await excluirSubcolecaoSnapshotNoFirebase(snapshotId, 'raw_chunks');
    await firebaseApi.deleteDoc(firebaseApi.doc(db, 'painel_snapshots', snapshotId));
    return true;
  } catch (error) {
    console.error('Erro ao excluir snapshot no Firebase:', error);
    return false;
  }
}

async function limparSnapshotsNoFirebase(idsInformados = null) {
  if (!firebaseDisponivel || !firebaseApi || !db) return false;
  try {
    let ids = Array.isArray(idsInformados) ? [...new Set(idsInformados.filter(Boolean))] : [];
    if (!ids.length) {
      const metas = await firebaseApi.getDocs(snapshotsCollectionRef);
      ids = metas.docs.map((item) => item.id);
    }
    for (const snapshotId of ids) {
      await excluirSnapshotNoFirebase(snapshotId);
    }
    return true;
  } catch (error) {
    console.error('Erro ao limpar snapshots no Firebase:', error);
    return false;
  }
}

function valorDataParaIso(valor, fallback = '') {
  if (typeof valor === 'string') return valor;
  if (valor?.toDate) return valor.toDate().toISOString();
  return fallback;
}

function normalizarSnapshotFirebase(snapshot) {
  return {
    ...snapshot,
    importedAt: valorDataParaIso(snapshot.importedAt, new Date().toISOString()),
    rawExpiresAt: valorDataParaIso(snapshot.rawExpiresAt, ''),
    rawDeletedAt: valorDataParaIso(snapshot.rawDeletedAt, ''),
    data: Array.isArray(snapshot.data) ? snapshot.data : [],
    chunksCount: Number(snapshot.chunksCount || 0),
    rawChunksCount: Number(snapshot.rawChunksCount || 0),
    rawRowsCount: Number(snapshot.rawRowsCount || 0),
    responsesCount: Number(snapshot.responsesCount || 0),
    rawAvailable: snapshot.rawAvailable !== false,
    schemaVersion: Number(snapshot.schemaVersion || (Array.isArray(snapshot.data) && snapshot.data.length ? 1 : 2))
  };
}

async function carregarDadosSnapshotNoFirebase(snapshot) {
  if (Array.isArray(snapshot?.data) && snapshot.data.length) {
    return snapshot.data;
  }

  if (!firebaseDisponivel || !firebaseApi || !db || !snapshot?.id) return [];
  if (!snapshot.chunksCount) return [];

  try {
    const chunksRef = firebaseApi.collection(db, 'painel_snapshots', snapshot.id, 'chunks');
    const chunksQuery = firebaseApi.query(chunksRef, firebaseApi.orderBy('index', 'asc'));
    const chunksSnap = await firebaseApi.getDocs(chunksQuery);
    const linhas = [];

    chunksSnap.forEach((docItem) => {
      const dados = docItem.data();
      if (Array.isArray(dados.rows)) linhas.push(...dados.rows);
    });

    return linhas;
  } catch (error) {
    console.error(`Erro ao carregar dados do snapshot ${snapshot.id}:`, error);
    return [];
  }
}

function dadosBrutosExpirados(snapshot, agora = Date.now()) {
  if (!snapshot?.rawExpiresAt || snapshot.rawAvailable === false) return false;
  const expira = new Date(snapshot.rawExpiresAt).getTime();
  return Number.isFinite(expira) && expira <= agora;
}

async function limparDadosBrutosExpirados() {
  const agora = Date.now();
  const expirados = snapshotsImportados.filter((snapshot) => dadosBrutosExpirados(snapshot, agora));
  if (!expirados.length) return 0;

  let removidos = 0;
  for (const snapshot of expirados) {
    let removido = true;
    if (firebaseDisponivel) {
      removido = await excluirDadosBrutosSnapshotNoFirebase(snapshot.id, true);
    }
    if (!removido) continue;

    snapshotsImportados = snapshotsImportados.map((item) => item.id === snapshot.id ? {
      ...item,
      rawData: undefined,
      rawAvailable: false,
      rawChunksCount: 0,
      rawDeletedAt: new Date().toISOString()
    } : item);
    removidos += 1;
  }

  persistirSnapshotsLocais();
  if (removidos && adminPainelEstaVisivel()) renderHistoricoPlanilhas();
  return removidos;
}

function agendarLimpezaDadosBrutos() {
  limparDadosBrutosExpirados();
  window.setInterval(() => {
    limparDadosBrutosExpirados();
  }, INTERVALO_LIMPEZA_DADOS_BRUTOS_MS);
}

function aplicarEstadoRemoto() {
  atualizarBasePorSnapshots();
  limparDadosBrutosExpirados();
}

function agendarAplicacaoEstadoRemoto() {
  if (!firebaseConfigRecebida || !firebaseSnapshotsRecebidos) return;
  if (aplicarEstadoRemotoTimer) clearTimeout(aplicarEstadoRemotoTimer);
  aplicarEstadoRemotoTimer = setTimeout(() => {
    aplicarEstadoRemotoTimer = null;
    aplicarEstadoRemoto();
  }, 80);
}

async function carregarSnapshotsEmLotes(metas = [], tamanhoLote = 4) {
  const completos = [];
  for (let inicio = 0; inicio < metas.length; inicio += tamanhoLote) {
    const lote = metas.slice(inicio, inicio + tamanhoLote);
    const carregados = await Promise.all(lote.map(async (item) => ({
      ...item,
      data: await carregarDadosSnapshotNoFirebase(item),
      dataLoaded: true
    })));
    completos.push(...carregados);
  }
  return completos;
}

function iniciarFirebaseSync() {
  if (firebaseListenersIniciados) return;
  firebaseListenersIniciados = true;

  firebaseApi.onSnapshot(painelConfigRef, (snapshot) => {
    const remoto = snapshot.data() || {};
    lojaFormadorMap = sanitizarMapaFormadores({
      ...defaultLojaFormadorMap,
      ...normalizarMapaChaves(remoto.storeFormadorMap || lojaFormadorMap)
    });
    lojaPromotorMap = normalizarMapaChaves(remoto.storePromotorMap || lojaPromotorMap);
    lojaRegionalMap = sanitizarMapaRegionais({ ...defaultLojaRegionalMap, ...(remoto.storeRegionalMap || lojaRegionalMap) });
    if (typeof remoto.regionalMapReviewed === 'boolean') regionalMapRevisado = remoto.regionalMapReviewed;
    lojaRenameMap = normalizarMapaChaves({
      ...defaultLojaRenameMap,
      ...normalizarMapaChaves(remoto.storeRenameMap || lojaRenameMap)
    });
    configRotinas = normalizarConfiguracoesRotinas(remoto.routineConfig || configRotinas);
    lojasConhecidas = new Set(LOJAS_ATIVAS.map((loja) => loja.nome));

    salvarStore(STORAGE_KEYS.storeFormadorMap, lojaFormadorMap);
    salvarStore(STORAGE_KEYS.storePromotorMap, lojaPromotorMap);
    salvarStore(STORAGE_KEYS.storeRegionalMap, lojaRegionalMap);
    localStorage.setItem(STORAGE_KEYS.regionalMapReviewed, regionalMapRevisado ? '1' : '0');
    salvarStore(STORAGE_KEYS.storeRenameMap, lojaRenameMap);
    salvarStore(STORAGE_KEYS.routineConfig, configRotinas);
    salvarStore(STORAGE_KEYS.knownStores, LOJAS_ATIVAS.map((loja) => loja.nome));

    firebaseConfigRecebida = true;
    invalidarCacheDados();
    if (firebaseInicializado) agendarAplicacaoEstadoRemoto();
  }, (error) => {
    console.error('Erro ao sincronizar configurações do Firebase:', error);
  });

  const consultaResumos = firebaseApi.query(
    snapshotsCollectionRef,
    firebaseApi.orderBy('latestDate', 'desc'),
    firebaseApi.limit(LIMITE_RESUMOS_HISTORICOS)
  );

  firebaseApi.onSnapshot(consultaResumos, (snapshot) => {
    resumosDiarios = snapshot.docs
      .map((item) => normalizarResumoDiario({ id: item.id, ...item.data() }))
      .filter(Boolean);
    firebaseResumosRecebidos = true;
    persistirResumosLocais();
    if (adminPainelEstaVisivel()) renderHistoricoPlanilhas();
  }, (error) => {
    console.error('Erro ao sincronizar resumos diários do Firebase:', error);
  });

  const consultaDetalhesRecentes = firebaseApi.query(
    snapshotsCollectionRef,
    firebaseApi.orderBy('latestDate', 'desc'),
    firebaseApi.limit(LIMITE_DIAS_DETALHES_INICIAIS)
  );

  firebaseApi.onSnapshot(consultaDetalhesRecentes, async (snapshot) => {
    const metas = snapshot.docs.map((item) => normalizarSnapshotFirebase({ id: item.id, ...item.data() }));
    snapshotsRecentes = await carregarSnapshotsEmLotes(metas);
    recomporSnapshotsAtivos();
    persistirSnapshotsLocais();
    firebaseSnapshotsRecebidos = true;
    if (firebaseInicializado) agendarAplicacaoEstadoRemoto();
  }, (error) => {
    console.error('Erro ao sincronizar detalhes recentes do Firebase:', error);
  });
}

function percentual(realizadas, total) {
  return total ? Math.round((realizadas / total) * 100) : 0;
}

function classeExecucao(execucao) {
  if (execucao > 90) return 'execucao-alta';
  if (execucao >= 80) return 'execucao-media';
  return 'execucao-baixa';
}

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function slug(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function normalizarCodigoUnidade(codigo) {
  const digitos = String(codigo || '').replace(/\D/g, '');
  return digitos ? digitos.padStart(3, '0') : '';
}

function resolverLojaAtiva(nomeLoja = '', codigoUnidade = '') {
  const codigo = normalizarCodigoUnidade(codigoUnidade);
  if (codigo && LOJAS_ATIVAS_POR_CODIGO.has(codigo)) {
    return LOJAS_ATIVAS_POR_CODIGO.get(codigo);
  }

  const nomeRenomeado = renomearLojaSeNecessario(String(nomeLoja || '').trim());
  const porNome = LOJAS_ATIVAS_POR_SLUG.get(slug(nomeRenomeado)) || LOJAS_ATIVAS_POR_SLUG.get(slug(nomeLoja));
  return porNome || null;
}

function lojaEstaAtiva(loja, codigoUnidade = '') {
  return Boolean(resolverLojaAtiva(loja, codigoUnidade));
}

function tituloCaso(texto) {
  return String(texto || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

function normalizarDataIsoSimples(valor = '') {
  const texto = String(valor || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && dataIsoParaDate(texto) ? texto : '';
}

function normalizarAliasesRotina(aliases = []) {
  const itens = Array.isArray(aliases)
    ? aliases
    : String(aliases || '').split(/[\n;,]+/g);
  const mapa = new Map();
  itens.forEach((item) => {
    const texto = String(item || '').trim().replace(/\s+/g, ' ');
    const chave = slugChecklist(texto);
    if (texto && chave && !mapa.has(chave)) mapa.set(chave, texto);
  });
  return [...mapa.values()];
}

function normalizarRotinaConfigurada(item = {}, padrao = null, ordemFallback = 0) {
  const base = padrao || {};
  const id = String(item.id || base.id || '').trim();
  const nome = String(item.nome || base.nome || '').trim().replace(/\s+/g, ' ');
  if (!id || !nome) return null;

  const nomeMoki = String(item.nomeMoki || base.nomeMoki || nome).trim().replace(/\s+/g, ' ');
  // Os aliases oficiais são obrigatórios e nunca podem ser apagados por uma configuração
  // antiga salva no navegador ou no Firebase. Aliases adicionais do ADM são somados a eles.
  const aliases = normalizarAliasesRotina([
    ...(Array.isArray(base.aliases) ? base.aliases : []),
    ...(Array.isArray(item.aliases) ? item.aliases : normalizarAliasesRotina(item.aliases || []))
  ]).filter((alias) => ![nome, nomeMoki].some((valor) => slugChecklist(valor) === slugChecklist(alias)));
  const diasBase = Array.isArray(item.dias) ? item.dias : (Array.isArray(base.dias) ? base.dias : [1,2,3,4,5,6]);
  const dias = [...new Set(diasBase.map(Number).filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6))].sort((a, b) => a - b);
  const vigenciaInicio = normalizarDataIsoSimples(item.vigenciaInicio || base.vigenciaInicio || '');
  const vigenciaFim = normalizarDataIsoSimples(item.vigenciaFim || base.vigenciaFim || '');
  const ativaInformada = item.ativa ?? base.ativa;

  return {
    ...base,
    ...item,
    id,
    nome,
    nomeMoki: nomeMoki || nome,
    aliases,
    horarioInicio: validarHorario(item.horarioInicio ?? base.horarioInicio),
    horarioFim: validarHorario(item.horarioFim ?? base.horarioFim),
    toleranciaInicioMin: limitarInteiro(item.toleranciaInicioMin ?? base.toleranciaInicioMin, 0, 1440),
    toleranciaFimMin: limitarInteiro(item.toleranciaFimMin ?? base.toleranciaFimMin, 0, 1440),
    dias: dias.length ? dias : [1,2,3,4,5,6],
    escopo: (item.escopo || base.escopo) === '12x36' ? '12x36' : 'todas',
    ativa: ativaInformada !== false,
    vigenciaInicio,
    vigenciaFim,
    origem: padrao ? 'padrao' : (item.origem === 'padrao' ? 'padrao' : 'personalizada'),
    ordem: Number.isFinite(Number(item.ordem)) ? Number(item.ordem) : ordemFallback,
    createdAt: valorDataParaIso(item.createdAt, padrao ? '' : new Date().toISOString()),
    updatedAt: valorDataParaIso(item.updatedAt, ''),
    firstUsedAt: valorDataParaIso(item.firstUsedAt, ''),
    lastUsedAt: valorDataParaIso(item.lastUsedAt, '')
  };
}

function normalizarConfiguracoesRotinas(configuracoes = []) {
  const recebidas = Array.isArray(configuracoes) ? configuracoes.filter(Boolean) : [];
  const recebidasPorId = new Map(recebidas.map((item) => [String(item.id || '').trim(), item]));
  const padroesPorId = new Map(ROTINAS_PADRAO.map((item) => [item.id, item]));
  const resultado = [];

  ROTINAS_PADRAO.forEach((padrao, index) => {
    const salvo = recebidasPorId.get(padrao.id) || {};
    const rotina = normalizarRotinaConfigurada({ ...padrao, ...salvo, id: padrao.id }, padrao, index + 1);
    if (rotina) resultado.push(rotina);
  });

  recebidas.forEach((item, index) => {
    const id = String(item?.id || '').trim();
    if (!id || padroesPorId.has(id) || resultado.some((rotina) => rotina.id === id)) return;
    const rotina = normalizarRotinaConfigurada(item, null, ROTINAS_PADRAO.length + index + 1);
    if (rotina) resultado.push(rotina);
  });

  return resultado.sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function limitarInteiro(valor, minimo = 0, maximo = Number.MAX_SAFE_INTEGER) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero)) return minimo;
  return Math.max(minimo, Math.min(maximo, numero));
}

function validarHorario(valor) {
  const texto = String(valor || '').trim();
  const match = texto.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hora = Number(match[1]);
  const minuto = Number(match[2]);
  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return '';
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function horarioParaMinutos(horario) {
  const valido = validarHorario(horario);
  if (!valido) return null;
  const [hora, minuto] = valido.split(':').map(Number);
  return hora * 60 + minuto;
}

function slugChecklist(texto) {
  return slug(String(texto || '')
    // O RelChecklist exporta ordinais como 01o, 09oPromotor e 2a feira.
    // Mantém também a compatibilidade com º, ° e ª do modelo anterior.
    .replace(/(\d{1,2})\s*[º°ª]/g, '$1')
    .replace(/(\d{1,2})\s*[oOaA](?=\s|[A-Za-zÀ-ÿ]|[.\]&-])/g, '$1')
    .replace(/\bhoras?\b/gi, 'h')
    .replace(/\bhrs?\b/gi, 'h')
    .replace(/(\d{1,2})h(\d{2})\b/gi, '$1-$2')
    .replace(/(\d{1,2}):(\d{2})/g, '$1-$2'));
}

function separarCodigoNomeUnidade(valor = '') {
  const texto = String(valor || '').trim().replace(/\s+/g, ' ');
  const match = texto.match(/^(\d{1,3})\s*(?:[-–—|]\s*|\s+)(.+)$/);
  if (!match) return { codigoUnidade: '', nomeUnidade: texto };
  return {
    codigoUnidade: normalizarCodigoUnidade(match[1]),
    nomeUnidade: String(match[2] || '').trim()
  };
}

function encontrarCorrespondenciaRotinaPorNome(nome) {
  const chave = slugChecklist(nome);
  if (!chave) return null;

  for (const rotina of configRotinas) {
    const principais = [rotina.nome, rotina.nomeMoki].filter(Boolean);
    const principal = principais.find((item) => slugChecklist(item) === chave);
    if (principal) return { rotina, tipo: 'principal', nomeCorrespondente: principal };

    const alias = (Array.isArray(rotina.aliases) ? rotina.aliases : [])
      .find((item) => slugChecklist(item) === chave);
    if (alias) return { rotina, tipo: 'alias', nomeCorrespondente: alias };
  }

  return null;
}

function encontrarConfigRotinaPorNome(nome) {
  return encontrarCorrespondenciaRotinaPorNome(nome)?.rotina || null;
}

function obterRegraPontualidadeResposta(rotina, checklistOriginal = '') {
  if (!rotina) return rotina;
  const chave = slugChecklist(checklistOriginal);
  if (!chave) return rotina;

  const regra = REGRAS_HISTORICAS_CHECKLIST.find((item) =>
    item.rotinaId === rotina.id
    && item.aliases.some((alias) => slugChecklist(alias) === chave)
  );

  return regra ? { ...rotina, horarioFim: regra.horarioFim || rotina.horarioFim } : rotina;
}

function obterConfigRotinaPorId(id) {
  return configRotinas.find((item) => item.id === id) || null;
}

function dataIsoParaDate(dataIso) {
  const match = String(dataIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const data = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(data.getTime()) ? null : data;
}

function rotinaEstaVigenteNaData(rotina, dataIso) {
  if (!rotina) return false;
  const data = normalizarDataIsoSimples(dataIso);
  if (!data) return false;
  const inicio = normalizarDataIsoSimples(rotina.vigenciaInicio);
  const fim = normalizarDataIsoSimples(rotina.vigenciaFim);
  if (inicio && data < inicio) return false;
  if (fim && data > fim) return false;
  if (rotina.ativa === false && !fim) return false;
  return true;
}

function rotinaAplicaNaData(rotina, dataIso) {
  if (!rotinaEstaVigenteNaData(rotina, dataIso)) return false;
  const data = dataIsoParaDate(dataIso);
  return Boolean(data && Array.isArray(rotina.dias) && rotina.dias.includes(data.getDay()));
}

function statusAdministrativoRotina(rotina, hoje = dataLocalIso()) {
  const inicio = normalizarDataIsoSimples(rotina?.vigenciaInicio);
  const fim = normalizarDataIsoSimples(rotina?.vigenciaFim);
  if (rotina?.ativa === false || (fim && fim < hoje)) return { id: 'inativa', label: 'Inativa' };
  if (inicio && inicio > hoje) return { id: 'agendada', label: 'Agendada' };
  return { id: 'ativa', label: 'Ativa' };
}

function lojaEh12x36(loja, codigoUnidade = '') {
  const ativa = resolverLojaAtiva(loja, codigoUnidade);
  return Boolean(ativa && CODIGOS_LOJAS_12X36.has(ativa.codigo));
}

function rotinaAplicaNaLoja(rotina, loja, dataIso = '', codigoUnidade = '') {
  const ativa = resolverLojaAtiva(loja, codigoUnidade);
  if (!ativa) return false;

  const data = dataIsoParaDate(dataIso);
  const domingo = Boolean(data && data.getDay() === 0);
  const loja12x36 = CODIGOS_LOJAS_12X36.has(ativa.codigo);
  if (domingo && !loja12x36) return false;

  return rotina?.escopo !== '12x36' || loja12x36;
}

function registrarLojasConhecidas() {
  lojasConhecidas = new Set(LOJAS_ATIVAS.map((loja) => loja.nome));
  return false;
}

function formatarDiasRotina(dias = []) {
  const todos = [0,1,2,3,4,5,6];
  if (todos.every((dia) => dias.includes(dia))) return 'Todos os dias';
  const nomes = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };
  return dias.map((dia) => nomes[dia]).filter(Boolean).join(', ');
}

function formatarEscopoRotina(escopo) {
  return escopo === '12x36' ? 'Somente lojas 12x36' : 'Todas as lojas';
}

function parseDataHoraMoki(valor, dataReferencia = '') {
  if (!valor) return { data: formatarData(dataReferencia), hora: '', dataHoraIso: '' };

  if (typeof valor === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const data = new Date(excelEpoch.getTime() + valor * 86400000);
    const dataIso = data.toISOString().slice(0, 10);
    const hora = `${String(data.getUTCHours()).padStart(2, '0')}:${String(data.getUTCMinutes()).padStart(2, '0')}`;
    return { data: dataIso, hora, dataHoraIso: `${dataIso}T${hora}:00` };
  }

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const dataIso = `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
    const hora = `${String(valor.getHours()).padStart(2, '0')}:${String(valor.getMinutes()).padStart(2, '0')}`;
    return { data: dataIso, hora, dataHoraIso: `${dataIso}T${hora}:00` };
  }

  const texto = String(valor).trim();
  const br = texto.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
    const data = `${ano.padStart(4, '0')}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    const hora = br[4] !== undefined ? `${String(br[4]).padStart(2, '0')}:${String(br[5]).padStart(2, '0')}` : '';
    return { data, hora, dataHoraIso: hora ? `${data}T${hora}:${String(br[6] || '00').padStart(2, '0')}` : '' };
  }

  const data = formatarData(dataReferencia || texto);
  const horaMatch = texto.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
  const hora = horaMatch ? `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}` : '';
  return { data, hora, dataHoraIso: data && hora ? `${data}T${hora}:00` : '' };
}

function classificarPontualidade(rotina, horaRealizada, status = 'realizada') {
  if (normalizarStatus(status) !== 'realizada') {
    return {
      statusDetalhado: 'pendente',
      pontualidade: 'pendente',
      pontualidadeLabel: 'Pendente',
      minutosAtraso: 0,
      minutosAntes: 0
    };
  }

  const realizado = horarioParaMinutos(horaRealizada);
  const inicio = horarioParaMinutos(rotina?.horarioInicio);
  const fim = horarioParaMinutos(rotina?.horarioFim);
  const toleranciaInicio = limitarInteiro(rotina?.toleranciaInicioMin, 0, 1440);
  const toleranciaFim = limitarInteiro(rotina?.toleranciaFimMin, 0, 1440);

  if (realizado === null || (inicio === null && fim === null)) {
    return {
      statusDetalhado: 'realizada_sem_horario',
      pontualidade: 'sem_regra',
      pontualidadeLabel: 'Realizada • horário não configurado',
      minutosAtraso: 0,
      minutosAntes: 0
    };
  }

  if (inicio !== null && realizado < inicio - toleranciaInicio) {
    return {
      statusDetalhado: 'realizada_antes_do_horario',
      pontualidade: 'antes_horario',
      pontualidadeLabel: 'Realizada antes do horário',
      minutosAtraso: 0,
      minutosAntes: inicio - realizado
    };
  }

  if (inicio !== null && realizado < inicio) {
    return {
      statusDetalhado: 'realizada_tolerancia_inicio',
      pontualidade: 'tolerancia_inicio',
      pontualidadeLabel: 'Realizada na tolerância inicial',
      minutosAtraso: 0,
      minutosAntes: inicio - realizado
    };
  }

  if (fim !== null && realizado > fim + toleranciaFim) {
    return {
      statusDetalhado: 'realizada_em_atraso',
      pontualidade: 'atrasada',
      pontualidadeLabel: 'Realizada em atraso',
      minutosAtraso: realizado - fim,
      minutosAntes: 0
    };
  }

  if (fim !== null && realizado > fim) {
    return {
      statusDetalhado: 'realizada_tolerancia_fim',
      pontualidade: 'tolerancia_fim',
      pontualidadeLabel: 'Realizada na tolerância final',
      minutosAtraso: realizado - fim,
      minutosAntes: 0
    };
  }

  return {
    statusDetalhado: 'realizada_no_prazo',
    pontualidade: 'no_prazo',
    pontualidadeLabel: 'Realizada no prazo',
    minutosAtraso: 0,
    minutosAntes: 0
  };
}

function normalizarStatus(status) {
  const valor = String(status || '').trim().toLowerCase();
  return valor.includes('real') ? 'realizada' : 'pendente';
}

function formatarData(valor) {
  if (!valor) return '';
  if (typeof valor === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const data = new Date(excelEpoch.getTime() + valor * 86400000);
    return data.toISOString().slice(0, 10);
  }

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }

  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  const br = texto.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (br) {
    const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${ano.padStart(4, '0')}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }

  const data = new Date(texto);
  if (!Number.isNaN(data.getTime())) return data.toISOString().slice(0, 10);
  return '';
}

function obterUltimaData(base) {
  const datas = base.map((item) => item.data).filter(Boolean).sort();
  return datas[datas.length - 1] || '';
}

function parseLoja(lojaCompleta, redesMap = {}) {
  const valorOriginal = String(lojaCompleta || '').trim().replace(/\s+/g, ' ');
  const valor = valorOriginal.toUpperCase();

  const prefixos = [
    ['DIA A DIA', 'Dia a Dia'],
    ['DD', 'Dia a Dia'],
    ['TT', 'Tatico'],
    ['TATICO', 'Tatico'],
    ['COSTA', 'Costa'],
    ['FORT', 'Fort'],
    ['COMPER', 'Comper'],
    ['BRETAS', 'Bretas']
  ];

  const chavesMap = Object.entries(redesMap)
    .map(([sigla, nome]) => [String(sigla).toUpperCase(), tituloCaso(String(nome).replace(/^Rede\s+/i, ''))]);

  const mapaCompleto = [...chavesMap, ...prefixos];
  let rede = 'Rede não identificada';
  let unidade = valorOriginal;

  for (const [sigla, nomeRede] of mapaCompleto) {
    const padrao = new RegExp(`^${sigla}(?:\\s*-\\s*|\\s+)`, 'i');
    if (padrao.test(valorOriginal)) {
      rede = nomeRede;
      unidade = valorOriginal.replace(padrao, '').trim();
      break;
    }

    if (valor === sigla) {
      rede = nomeRede;
      unidade = valorOriginal;
      break;
    }
  }

  if (rede === 'Rede não identificada') {
    const primeiraPalavra = valorOriginal.split(' ')[0];
    rede = tituloCaso(primeiraPalavra);
    unidade = valorOriginal.replace(new RegExp(`^${primeiraPalavra}(?:\\s*-\\s*|\\s+)`, 'i'), '').trim() || valorOriginal;
  }

  return {
    rede,
    loja: valorOriginal,
    unidade: unidade || valorOriginal
  };
}

function renomearLojaSeNecessario(loja) {
  const chave = slug(loja);
  return lojaRenameMap[chave] || defaultLojaRenameMap[chave] || String(loja || '').trim();
}

function resolverFormador(loja, formadorPlanilha = '', mapaPlanilha = new Map()) {
  const lojaNormalizada = renomearLojaSeNecessario(loja);
  const chave = slug(lojaNormalizada);
  const candidato = lojaFormadorMap[chave] || mapaPlanilha.get(chave) || String(formadorPlanilha || '').trim();
  return normalizarNomeFormador(candidato) || 'Não informado';
}

function resolverPromotor(loja, promotorPlanilha = '', mapaPromotores = new Map()) {
  const lojaNormalizada = renomearLojaSeNecessario(loja);
  const chave = slug(lojaNormalizada);
  const valor = lojaPromotorMap[chave] || mapaPromotores.get(chave) || String(promotorPlanilha || '').trim();
  if (valor) return valor;
  return parseLoja(lojaNormalizada).unidade;
}

function enriquecerRegistro(base, index, mapaFormadores = new Map(), mapaPromotores = new Map()) {
  const lojaTratada = renomearLojaSeNecessario(base.loja);
  const lojaInfo = parseLoja(lojaTratada, base.redesMap || {});
  const rotinaNome = String(base.rotina || '').trim();
  const status = normalizarStatus(base.status);
  const rotinaConfig = obterConfigRotinaPorId(base.rotinaId) || encontrarConfigRotinaPorNome(rotinaNome);
  const rotinaPontualidade = obterRegraPontualidadeResposta(
    rotinaConfig,
    base.checklistOriginal || base.checklist || rotinaNome
  );
  const pontualidade = classificarPontualidade(rotinaPontualidade, base.horaRealizada, status);

  return {
    ...base,
    id: base.id || `reg-${index + 1}`,
    data: formatarData(base.data),
    rede: base.rede || lojaInfo.rede,
    loja: lojaInfo.loja,
    unidade: base.unidade || lojaInfo.unidade,
    formador: resolverFormador(lojaInfo.loja, base.formador, mapaFormadores),
    regional: resolverRegional(lojaInfo.loja, base.codigoUnidade).id,
    regionalNome: resolverRegional(lojaInfo.loja, base.codigoUnidade).nome,
    promotor: resolverPromotor(lojaInfo.loja, base.promotor, mapaPromotores),
    rotina: rotinaConfig?.nome || rotinaNome,
    rotinaId: rotinaConfig?.id || base.rotinaId || '',
    status,
    horaRealizada: validarHorario(base.horaRealizada),
    horarioInicioPrevisto: rotinaPontualidade?.horarioInicio || '',
    horarioFimPrevisto: rotinaPontualidade?.horarioFim || '',
    toleranciaInicioMin: rotinaPontualidade?.toleranciaInicioMin ?? 0,
    toleranciaFimMin: rotinaPontualidade?.toleranciaFimMin ?? 0,
    ...pontualidade
  };
}

function normalizarBaseCompleta(base, origem = 'simulada', mapaFormadores = new Map(), mapaPromotores = new Map()) {
  return base
    .map((item, index) => enriquecerRegistro(item, index, mapaFormadores, mapaPromotores))
    .filter((item) => item.data && item.rotina && item.loja && item.status)
    .map((item) => ({ ...item, origem }));
}

function obterLojasConhecidas() {
  return LOJAS_ATIVAS.map((loja) => loja.nome);
}

function preencherSelect(select, valores, placeholder) {
  const atual = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  valores.forEach((valor) => {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });

  if ([...select.options].some((option) => option.value === atual)) {
    select.value = atual;
  }
}

function popularFiltros() {
  const baseRegional = registros.filter((item) => registroPertenceRegional(item));
  preencherSelect(filtros.rede, [...new Set(baseRegional.map((item) => item.rede))].sort(), 'Todas');
  preencherSelect(filtros.loja, [...new Set(baseRegional.map((item) => item.loja))].sort(), 'Todas');
  preencherSelect(filtros.formador, [...new Set(baseRegional.map((item) => item.formador).filter(ehFormadorAtivo))].sort(), 'Todos');
  preencherSelect(filtros.rotina, [...new Set(baseRegional.map((item) => item.rotina))].sort((a, b) => a.localeCompare(b, 'pt-BR')), 'Todas');
}

function sincronizarFiltrosDependentes() {
  const redeSelecionada = filtros.rede.value;
  const formadorSelecionado = filtros.formador.value;

  const baseLojas = registros.filter((item) => {
    const matchRede = redeSelecionada ? item.rede === redeSelecionada : true;
    const matchFormador = formadorSelecionado ? item.formador === formadorSelecionado : true;
    const matchRegional = registroPertenceRegional(item);
    return matchRede && matchFormador && matchRegional;
  });

  preencherSelect(filtros.loja, [...new Set(baseLojas.map((item) => item.loja))].sort(), 'Todas');
}

function normalizarPeriodo(dataInicial, dataFinal) {
  if (dataInicial && dataFinal && dataInicial > dataFinal) {
    return { dataInicial: dataFinal, dataFinal: dataInicial };
  }
  return { dataInicial, dataFinal };
}

function dataDentroDoPeriodo(dataRegistro, dataInicial, dataFinal) {
  if (!dataRegistro) return false;
  const periodo = normalizarPeriodo(dataInicial, dataFinal);
  if (periodo.dataInicial && dataRegistro < periodo.dataInicial) return false;
  if (periodo.dataFinal && dataRegistro > periodo.dataFinal) return false;
  return true;
}

function obterDadosFiltrados() {
  const periodo = normalizarPeriodo(filtros.dataInicial.value, filtros.dataFinal.value);
  const dataInicial = periodo.dataInicial;
  const dataFinal = periodo.dataFinal;
  return registros.filter((item) => {
    const matchRede = filtros.rede.value ? item.rede === filtros.rede.value : true;
    const matchLoja = filtros.loja.value ? item.loja === filtros.loja.value : true;
    const matchFormador = filtros.formador.value ? item.formador === filtros.formador.value : true;
    const matchStatus = filtros.status.value ? item.status === filtros.status.value : true;
    const matchData = dataDentroDoPeriodo(item.data, dataInicial, dataFinal);
    const matchRotina = filtros.rotina.value ? item.rotina === filtros.rotina.value : true;
    const matchRegional = registroPertenceRegional(item);
    return matchRede && matchLoja && matchFormador && matchStatus && matchData && matchRotina && matchRegional;
  });
}

function atualizarKPIs(dados) {
  const previstas = dados.length;
  const realizadas = dados.filter((item) => item.status === 'realizada').length;
  const pendentes = dados.filter((item) => item.status === 'pendente').length;
  const execucao = percentual(realizadas, previstas);

  const kpiPrevistas = document.getElementById('kpiPrevistas');
  const kpiHoje = document.getElementById('kpiHoje');
  const kpiExecucao = document.getElementById('kpiExecucao');
  const kpiPendentes = document.getElementById('kpiPendentes');
  if (kpiPrevistas) kpiPrevistas.textContent = formatarNumero.format(previstas);
  if (kpiHoje) kpiHoje.textContent = formatarNumero.format(realizadas);
  if (kpiExecucao) kpiExecucao.textContent = `${execucao}%`;
  if (kpiPendentes) kpiPendentes.textContent = formatarNumero.format(pendentes);

  const executionRing = document.getElementById('executionRing');
  if (executionRing) executionRing.style.setProperty('--progress', String(Math.max(0, Math.min(execucao, 100))));

  const totalAnterior = registros.filter((item) => registroPertenceRegional(item) && dataDentroDoPeriodo(item.data, ...obterPeriodoComparativo().split('|'))).length;
  const realizadasAnterior = registros.filter((item) => registroPertenceRegional(item) && item.status === 'realizada' && dataDentroDoPeriodo(item.data, ...obterPeriodoComparativo().split('|'))).length;
  const execucaoAnterior = percentual(realizadasAnterior, totalAnterior);
  const delta = execucao - execucaoAnterior;
  const deltaEl = document.getElementById('execucaoDelta');
  if (deltaEl) {
    const sinal = delta > 0 ? '↑' : delta < 0 ? '↓' : '•';
    const valor = delta === 0 ? '0%' : `${Math.abs(delta)}%`;
    deltaEl.textContent = `${sinal}${valor}`;
  }

  const meta = 80;
  const metaLabel = document.getElementById('metaPeriodoLabel');
  const goalFill = document.getElementById('goalProgressFill');
  const goalStatus = document.getElementById('goalStatusText');
  const goalGap = document.getElementById('goalGapText');
  if (metaLabel) metaLabel.textContent = `${meta}%`;
  if (goalFill) goalFill.style.width = `${Math.max(0, Math.min(execucao, 100))}%`;
  if (goalStatus) goalStatus.textContent = execucao >= meta ? 'Acima da meta' : 'Abaixo da meta';
  if (goalGap) goalGap.textContent = execucao >= meta ? `+${execucao - meta}%` : `Faltam ${meta - execucao}%`;

  atualizarPendenciasHero(dados);
}

function criarBarra(percent) {
  return `<div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(percent, 100))}%"></div></div>`;
}

function medalhaPosicao(index, total) {
  if (index === 0) return { emoji: '🥇', label: 'Ouro', classe: 'gold' };
  if (index === 1) return { emoji: '🥈', label: 'Prata', classe: 'silver' };
  if (index === 2) return { emoji: '🥉', label: 'Bronze', classe: 'bronze' };
  if (index === total - 1) return { emoji: '🐢', label: 'Último lugar', classe: 'turtle' };
  return { emoji: '•', label: 'Ranking', classe: '' };
}

function agregarPorFormador(dados) {
  return Object.values(dados.reduce((acc, item) => {
    const chave = item.formador || 'Sem formador';
    if (!acc[chave]) acc[chave] = { nome: chave, realizadas: 0, total: 0, lojas: new Set() };
    acc[chave].total += 1;
    acc[chave].lojas.add(item.loja);
    if (item.status === 'realizada') acc[chave].realizadas += 1;
    return acc;
  }, {})).map((item) => ({ ...item, quantidadeLojas: item.lojas.size }))
    .sort((a, b) => percentual(b.realizadas, b.total) - percentual(a.realizadas, a.total) || b.realizadas - a.realizadas || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function agregarLojasPorFormador(dados) {
  const mapa = dados.reduce((acc, item) => {
    const chave = `${item.formador || 'Sem formador'}||${item.loja}`;
    if (!acc[chave]) {
      acc[chave] = {
        formador: item.formador || 'Sem formador',
        loja: item.loja,
        rede: item.rede,
        realizadas: 0,
        total: 0
      };
    }
    acc[chave].total += 1;
    if (item.status === 'realizada') acc[chave].realizadas += 1;
    return acc;
  }, {});

  return Object.values(mapa).reduce((acc, item) => {
    if (!acc[item.formador]) acc[item.formador] = [];
    acc[item.formador].push(item);
    return acc;
  }, {});
}

function renderRankingFormadores(dados) {
  const tbody = document.getElementById('rankingFormadoresTabela');
  const agrupado = agregarPorFormador(dados);

  if (!agrupado.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Nenhum formador encontrado no recorte atual.</div></td></tr>';
    return;
  }

  tbody.innerHTML = agrupado.map((item, index, array) => {
    const execucao = percentual(item.realizadas, item.total);
    const medalha = medalhaPosicao(index, array.length);
    const posicao = `${index + 1}º`;
    const status = medalha.emoji === '•'
      ? '<span class="ranking-status-badge">Em análise</span>'
      : `<span class="ranking-status-badge ${medalha.classe}">${medalha.emoji} ${medalha.label}</span>`;

    return `<tr>
      <td>${posicao}</td>
      <td>${escaparHtml(item.nome)}</td>
      <td>${item.realizadas}</td>
      <td>${item.total}</td>
      <td>${execucao}%</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
}

function calcularTendencia(registrosGrupo) {
  const ordenados = [...new Set(registrosGrupo.map((item) => item.data))].sort();
  const ultimos = ordenados.slice(-2);
  if (ultimos.length < 2) return 'estável';

  const taxas = ultimos.map((data) => {
    const dia = registrosGrupo.filter((item) => item.data === data);
    return percentual(dia.filter((item) => item.status === 'realizada').length, dia.length);
  });

  if (taxas[1] > taxas[0]) return 'alta';
  if (taxas[1] < taxas[0]) return 'queda';
  return 'estável';
}

function renderPromotorDestaque(dados) {
  const container = document.getElementById('melhoresLojasFormador');
  const agrupado = agregarLojasPorFormador(dados);
  const formadores = Object.keys(agrupado).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  if (!formadores.length) {
    container.innerHTML = '<div class="empty-state">Nenhum destaque disponível no recorte atual.</div>';
    return;
  }

  container.innerHTML = formadores.map((formador) => {
    const melhorLoja = [...agrupado[formador]].sort((a, b) => percentual(b.realizadas, b.total) - percentual(a.realizadas, a.total) || b.realizadas - a.realizadas || a.loja.localeCompare(b.loja, 'pt-BR'))[0];
    const execucao = percentual(melhorLoja.realizadas, melhorLoja.total);
    return `
      <div class="best-store-card">
        <div class="best-store-head">
          <span class="best-store-formador">${escaparHtml(formador)}</span>
          <div class="best-store-medal">🥇</div>
        </div>
        <div class="best-store-name">${escaparHtml(melhorLoja.loja)}</div>
        <div class="best-store-meta">Rede ${escaparHtml(melhorLoja.rede)} • ${melhorLoja.realizadas}/${melhorLoja.total} realizadas</div>
        ${criarBarra(execucao)}
        <div class="best-store-meta"><strong>${execucao}%</strong> de execução</div>
      </div>`;
  }).join('');
}

function renderRankingsPorFormador(dados) {
  const container = document.getElementById('rankingsPorFormador');
  const agrupado = agregarLojasPorFormador(dados);
  const formadores = Object.keys(agrupado).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  if (!formadores.length) {
    container.innerHTML = '<div class="empty-state">Sem lojas por formador no recorte atual.</div>';
    return;
  }

  container.innerHTML = formadores.map((formador) => {
    const lojas = agrupado[formador]
      .sort((a, b) => percentual(b.realizadas, b.total) - percentual(a.realizadas, a.total) || b.realizadas - a.realizadas || a.loja.localeCompare(b.loja, 'pt-BR'));

    const melhor = lojas[0];
    const melhorExecucao = percentual(melhor.realizadas, melhor.total);

    return `
      <div class="formador-column">
        <div class="formador-title-row">
          <div>
            <div class="formador-title">${escaparHtml(formador)}</div>
            <div class="formador-subtitle">Lojas da melhor para a pior execução</div>
          </div>
          <span class="mini-badge">${lojas.length} lojas</span>
        </div>
        <div class="best-store-meta">Melhor loja: <strong>${escaparHtml(melhor.loja)}</strong> • ${melhorExecucao}%</div>
        <div class="formador-ranking-list">
          ${lojas.map((item, index) => {
            const execucao = percentual(item.realizadas, item.total);
            return `
              <div class="formador-ranking-item ${index === 0 ? 'top-store' : ''}">
                <div class="item-head">
                  <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                    <span class="position-pill">${index + 1}</span>
                    <div>
                      <div class="item-title">${escaparHtml(item.loja)}</div>
                      <div class="meta-line">Rede ${escaparHtml(item.rede)}</div>
                    </div>
                  </div>
                  <strong>${execucao}%</strong>
                </div>
                ${criarBarra(execucao)}
                <div class="percent-line">${item.realizadas} realizadas de ${item.total} previstas</div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
}

function renderRankingLojas(dados) {
  const container = document.getElementById('rankingLojas');
  const agrupado = Object.values(dados.reduce((acc, item) => {
    if (!acc[item.loja]) acc[item.loja] = { loja: item.loja, rede: item.rede, realizadas: 0, total: 0 };
    acc[item.loja].total += 1;
    if (item.status === 'realizada') acc[item.loja].realizadas += 1;
    return acc;
  }, {})).sort((a, b) => percentual(b.realizadas, b.total) - percentual(a.realizadas, a.total) || b.realizadas - a.realizadas);

  if (!agrupado.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma loja encontrada.</div>';
    return;
  }

  container.innerHTML = agrupado.slice(0, 8).map((item) => {
    const execucao = percentual(item.realizadas, item.total);
    return `
      <div class="list-card">
        <div class="list-main">
          <strong>${escaparHtml(item.loja)}</strong>
          <div class="list-meta"><span>Rede: ${escaparHtml(item.rede)}</span><span>${item.realizadas}/${item.total} concluídas</span></div>
          ${criarBarra(execucao)}
        </div>
        <strong>${execucao}%</strong>
      </div>`;
  }).join('');
}

function renderRotinasMenosRealizadas(dados) {
  const container = document.getElementById('rotinasMenos');
  const agrupado = Object.values(dados.reduce((acc, item) => {
    if (!acc[item.rotina]) acc[item.rotina] = { rotina: item.rotina, realizadas: 0, total: 0 };
    acc[item.rotina].total += 1;
    if (item.status === 'realizada') acc[item.rotina].realizadas += 1;
    return acc;
  }, {})).sort((a, b) => percentual(a.realizadas, a.total) - percentual(b.realizadas, b.total) || b.total - a.total).slice(0, 6);

  if (!agrupado.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma rotina disponível.</div>';
    return;
  }

  container.innerHTML = agrupado.map((item) => {
    const execucao = percentual(item.realizadas, item.total);
    return `
      <div class="list-card">
        <div class="list-main">
          <strong>${escaparHtml(item.rotina)}</strong>
          <div class="list-meta"><span>Previsto: ${item.total}</span><span>Realizado: ${item.realizadas}</span></div>
          ${criarBarra(execucao)}
        </div>
        <strong>${execucao}%</strong>
      </div>`;
  }).join('');
}

function renderTabelaRotinas(dados) {
  const tbody = document.getElementById('tabelaRotinas');
  const agrupado = Object.values(dados.reduce((acc, item) => {
    if (!acc[item.rotina]) acc[item.rotina] = { rotina: item.rotina, total: 0, realizadas: 0 };
    acc[item.rotina].total += 1;
    if (item.status === 'realizada') acc[item.rotina].realizadas += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total || a.rotina.localeCompare(b.rotina));

  if (!agrupado.length) {
    tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state">Sem registros para exibir.</div></td></tr>';
    return;
  }

  tbody.innerHTML = agrupado.map((item) => `<tr><td>${escaparHtml(item.rotina)}</td><td>${item.total}</td><td>${percentual(item.realizadas, item.total)}%</td></tr>`).join('');
}


function renderResumoLojas(dados) {
  const tbody = document.getElementById('tabelaResumoLojas');
  const agrupado = Object.values(dados.reduce((acc, item) => {
    if (!acc[item.loja]) acc[item.loja] = { loja: item.loja, rede: item.rede, formador: item.formador, previstas: 0, realizadas: 0 };
    acc[item.loja].previstas += 1;
    if (item.status === 'realizada') acc[item.loja].realizadas += 1;
    return acc;
  }, {})).sort((a, b) => percentual(b.realizadas, b.previstas) - percentual(a.realizadas, a.previstas) || b.realizadas - a.realizadas || a.loja.localeCompare(b.loja, 'pt-BR'));

  if (!agrupado.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Sem registros por loja no recorte atual.</div></td></tr>';
    return;
  }

  tbody.innerHTML = agrupado.map((item) => {
    const execucao = percentual(item.realizadas, item.previstas);
    const classe = classeExecucao(execucao);
    return `<tr class="${classe}"><td>${escaparHtml(item.loja)}</td><td>${escaparHtml(item.rede)}</td><td>${escaparHtml(item.formador)}</td><td>${item.previstas}</td><td>${item.realizadas}</td><td><span class="execucao-badge ${classe}">${execucao}%</span></td></tr>`;
  }).join('');
}

function renderResumoPromotores(dados) {
  const tbody = document.getElementById('tabelaResumoPromotores');
  if (!tbody) return;
  const agrupado = Object.values(dados.reduce((acc, item) => {
    const chave = item.promotor || item.loja;
    if (!acc[chave]) acc[chave] = { promotor: item.promotor || item.unidade || item.loja, formador: item.formador, lojas: new Set(), previstas: 0, realizadas: 0 };
    acc[chave].previstas += 1;
    acc[chave].lojas.add(item.loja);
    if (item.status === 'realizada') acc[chave].realizadas += 1;
    return acc;
  }, {})).map((item) => ({ ...item, totalLojas: item.lojas.size }))
    .sort((a, b) => percentual(b.realizadas, b.previstas) - percentual(a.realizadas, a.previstas) || b.realizadas - a.realizadas || a.promotor.localeCompare(b.promotor, 'pt-BR'));

  if (!agrupado.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Sem registros por promotor no recorte atual.</div></td></tr>';
    return;
  }

  tbody.innerHTML = agrupado.map((item) => `<tr><td>${escaparHtml(item.promotor)}</td><td>${escaparHtml(item.formador)}</td><td>${item.totalLojas}</td><td>${item.previstas}</td><td>${item.realizadas}</td><td>${percentual(item.realizadas, item.previstas)}%</td></tr>`).join('');
}

function renderCalendarioExecucao(dados) {
  const container = document.getElementById('calendarioExecucao');
  if (!container) return;

  if (!dados.length) {
    container.innerHTML = '<div class="empty-state">Sem dados para o calendário.</div>';
    return;
  }

  const periodoAjustado = normalizarPeriodo(filtros.dataInicial.value, filtros.dataFinal.value);
  let referencia = periodoAjustado.dataFinal || periodoAjustado.dataInicial;
  if (!referencia) {
    referencia = [...dados].sort((a, b) => a.data.localeCompare(b.data)).at(-1)?.data || '';
  }

  if (!referencia) {
    container.innerHTML = '<div class="empty-state">Sem mês de referência disponível.</div>';
    return;
  }

  const [ano, mes] = referencia.split('-').map(Number);
  const inicioMes = new Date(ano, mes - 1, 1);
  const totalDias = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = (inicioMes.getDay() + 6) % 7;
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const semanaRotulos = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const mapaDia = dados.reduce((acc, item) => {
    if (!item.data || !item.data.startsWith(`${ano}-${String(mes).padStart(2, '0')}`)) return acc;
    if (!acc[item.data]) acc[item.data] = { total: 0, realizadas: 0 };
    acc[item.data].total += 1;
    if (item.status === 'realizada') acc[item.data].realizadas += 1;
    return acc;
  }, {});

  const diasHtml = [];
  for (let i = 0; i < primeiroDiaSemana; i += 1) {
    diasHtml.push('<div class="calendar-day-empty"></div>');
  }

  for (let dia = 1; dia <= totalDias; dia += 1) {
    const dataIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const info = mapaDia[dataIso];
    const execucao = info ? percentual(info.realizadas, info.total) : null;
    const classe = execucao === null ? 'is-empty-data' : execucao >= 95 ? 'is-top' : execucao >= 80 ? 'is-high' : execucao >= 60 ? 'is-medium' : 'is-low';
    const percentualDia = execucao === null ? '—' : `${execucao}%`;
    const meta = info
      ? `${info.realizadas}/${info.total} rotinas realizadas`
      : 'Sem rotinas registradas';
    const largura = execucao === null ? 0 : execucao;

    diasHtml.push(`
      <div class="calendar-day ${classe}">
        <div class="calendar-day-top">
          <span class="calendar-day-number">${dia}</span>
          <span class="calendar-day-percent">${percentualDia}</span>
        </div>
        <div class="calendar-progress"><div class="calendar-progress-fill" style="width:${largura}%"></div></div>
        <div class="calendar-day-meta">${meta}</div>
      </div>`);
  }

  const diasComDados = Object.values(mapaDia).length;
  container.innerHTML = `
    <div class="calendar-header">
      <div>
        <div class="calendar-title">${nomesMeses[mes - 1]} de ${ano}</div>
        <div class="calendar-subtitle">Cada dia mostra o percentual de rotinas realizadas no mês de referência.</div>
      </div>
      <div class="calendar-subtitle">${diasComDados} dias com registros</div>
    </div>
    <div class="calendar-grid">
      ${semanaRotulos.map((item) => `<div class="calendar-weekday">${item}</div>`).join('')}
      ${diasHtml.join('')}
    </div>`;
}

function formatarPeriodoSelecionado(dataInicial, dataFinal) {
  const inicio = dataInicial ? dataInicial.split('-').reverse().join('/') : '';
  const fim = dataFinal ? dataFinal.split('-').reverse().join('/') : '';
  if (inicio && fim) return `${inicio} até ${fim}`;
  if (inicio) return `a partir de ${inicio}`;
  if (fim) return `até ${fim}`;
  return 'todo o período';
}

function montarResumoFiltrosAtivos() {
  const periodoAjustado = normalizarPeriodo(filtros.dataInicial.value, filtros.dataFinal.value);
  const resumo = [];
  resumo.push({ rotulo: 'Período', valor: formatarPeriodoSelecionado(periodoAjustado.dataInicial, periodoAjustado.dataFinal) });
  resumo.push({ rotulo: 'Rotina', valor: filtros.rotina.value || 'Todas' });
  resumo.push({ rotulo: 'Rede', valor: filtros.rede.value || 'Todas' });
  resumo.push({ rotulo: 'Loja', valor: filtros.loja.value || 'Todas' });
  resumo.push({ rotulo: 'Formador', valor: filtros.formador.value || 'Todos' });
  resumo.push({ rotulo: 'Status', valor: filtros.status.value ? tituloCaso(filtros.status.value) : 'Todos' });
  return resumo;
}

function renderResumoFiltrosAtivos() {
  const container = document.getElementById('activeFiltersSummary');
  if (!container) return;
  container.innerHTML = montarResumoFiltrosAtivos().map((item) => `
    <div class="filter-chip"><strong>${escaparHtml(item.rotulo)}</strong><span>${escaparHtml(item.valor)}</span></div>`).join('');
}

function renderConsultaRotina(dados) {
  const container = document.getElementById('consultaRotinaLojas');
  const rotina = filtros.rotina.value;
  const periodoAjustado = normalizarPeriodo(filtros.dataInicial.value, filtros.dataFinal.value);
  const dataInicial = periodoAjustado.dataInicial;
  const dataFinal = periodoAjustado.dataFinal;
  if (!rotina || (!dataInicial && !dataFinal)) {
    container.innerHTML = '<div class="routine-empty">Selecione a <strong>rotina</strong> e pelo menos uma <strong>data</strong> do período para ver quais lojas realizaram essa atividade.</div>';
    return;
  }

  const baseConsulta = dados.filter((item) => item.rotina === rotina && item.status === 'realizada' && dataDentroDoPeriodo(item.data, dataInicial, dataFinal));
  const periodo = formatarPeriodoSelecionado(dataInicial, dataFinal);
  if (!baseConsulta.length) {
    container.innerHTML = `<div class="routine-summary">Nenhuma loja realizou <strong>${escaparHtml(rotina)}</strong> em <strong>${escaparHtml(periodo)}</strong>.</div>`;
    return;
  }

  const lojas = [...new Map(baseConsulta.map((item) => [item.loja, item])).values()].sort((a, b) => a.loja.localeCompare(b.loja, 'pt-BR'));
  container.innerHTML = `
    <div class="routine-summary"><strong>${lojas.length} lojas</strong> realizaram <strong>${escaparHtml(rotina)}</strong> em <strong>${escaparHtml(periodo)}</strong>.</div>
    <div class="routine-store-grid">
      ${lojas.map((item) => `<div class="routine-store-card"><strong>${escaparHtml(item.loja)}</strong><div class="routine-store-meta">Rede ${escaparHtml(item.rede)} • Formador ${escaparHtml(item.formador || 'Sem formador')}</div></div>`).join('')}
    </div>`;
}

function diasEntreDatas(dataInicial, dataFinal) {
  const inicio = new Date(`${dataInicial}T00:00:00`);
  const fim = new Date(`${dataFinal}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return 0;
  return Math.floor((fim - inicio) / 86400000) + 1;
}

function periodoContidoNosRecentes(dataInicial, dataFinal) {
  const datas = snapshotsRecentes.map((item) => formatarData(item.latestDate)).filter(Boolean).sort();
  if (!datas.length) return false;
  return dataInicial >= datas[0] && dataFinal <= datas[datas.length - 1];
}

async function carregarDetalhesDoPeriodo(dataInicial, dataFinal) {
  if (!firebaseDisponivel || !firebaseApi || !snapshotsCollectionRef) return true;
  if (!dataInicial && !dataFinal) return true;

  const inicio = dataInicial || dataFinal;
  const fim = dataFinal || dataInicial;
  if (!inicio || !fim) return true;

  const periodo = normalizarPeriodo(inicio, fim);
  const dias = diasEntreDatas(periodo.dataInicial, periodo.dataFinal);
  if (dias > LIMITE_DIAS_CONSULTA_DETALHADA) {
    setImportStatus(
      `Para preservar o desempenho, relatórios detalhados aceitam até ${LIMITE_DIAS_CONSULTA_DETALHADA} dias por consulta. Reduza o período; os resumos históricos continuam preservados.`,
      'Período muito amplo'
    );
    return false;
  }

  if (periodoContidoNosRecentes(periodo.dataInicial, periodo.dataFinal)) {
    snapshotsSobDemanda = [];
    periodoSobDemandaAtual = { dataInicial: '', dataFinal: '' };
    recomporSnapshotsAtivos();
    return true;
  }

  if (
    periodoSobDemandaAtual.dataInicial === periodo.dataInicial
    && periodoSobDemandaAtual.dataFinal === periodo.dataFinal
  ) return true;

  if (carregamentoPeriodoPromise) return carregamentoPeriodoPromise;

  carregamentoPeriodoPromise = (async () => {
    try {
      setImportStatus(
        `Carregando detalhes de ${periodo.dataInicial.split('-').reverse().join('/')} até ${periodo.dataFinal.split('-').reverse().join('/')}...`,
        'Carregando período'
      );
      const consulta = firebaseApi.query(
        snapshotsCollectionRef,
        firebaseApi.where('latestDate', '>=', periodo.dataInicial),
        firebaseApi.where('latestDate', '<=', periodo.dataFinal),
        firebaseApi.orderBy('latestDate', 'desc'),
        firebaseApi.limit(LIMITE_DIAS_CONSULTA_DETALHADA)
      );
      const resultado = await firebaseApi.getDocs(consulta);
      const metas = resultado.docs.map((item) => normalizarSnapshotFirebase({ id: item.id, ...item.data() }));
      snapshotsSobDemanda = await carregarSnapshotsEmLotes(metas);
      periodoSobDemandaAtual = { ...periodo };
      recomporSnapshotsAtivos();
      atualizarBasePorSnapshots(`${snapshotsSobDemanda.length} dia(s) detalhado(s) carregado(s) sob demanda.`);
      setImportStatus('Período detalhado carregado. O restante do histórico permaneceu em modo resumido.', 'Período carregado');
      return true;
    } catch (error) {
      console.error('Erro ao carregar período detalhado:', error);
      setImportStatus('Não foi possível carregar os detalhes desse período agora.', 'Falha no período');
      return false;
    } finally {
      carregamentoPeriodoPromise = null;
    }
  })();

  return carregamentoPeriodoPromise;
}

async function prepararFiltrosComDetalhes() {
  const periodo = normalizarPeriodo(filtros.dataInicial.value, filtros.dataFinal.value);
  return carregarDetalhesDoPeriodo(periodo.dataInicial, periodo.dataFinal);
}


function atualizarAbasRegionaisDashboard() {
  const contagens = LOJAS_ATIVAS.reduce((acc, loja) => {
    const id = resolverRegional(loja.nome, loja.codigo).id;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
  const df = document.getElementById('regionalCountDfGo');
  const go = document.getElementById('regionalCountGoiania');
  if (df) df.textContent = `${contagens.df_go || 0} unidades`;
  if (go) go.textContent = `${contagens.goiania_fora || 0} unidades`;
  document.querySelectorAll('.regional-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.regional === regionalSelecionada);
  });
  const semRegional = contagens.sem_regional || 0;
  const aviso = document.getElementById('regionalDashboardNotice');
  if (aviso) {
    const mensagens = [];
    if (!regionalMapRevisado) mensagens.push('A divisão inicial das regionais ainda precisa ser confirmada no ADM.');
    if (semRegional) mensagens.push(`${semRegional} unidade(s) ainda sem regional definida.`);
    aviso.classList.toggle('hidden', !mensagens.length);
    aviso.textContent = mensagens.join(' ');
  }
}

function selecionarRegionalDashboard(regionalId = 'geral') {
  regionalSelecionada = regionalId === 'geral' || REGIONAIS_POR_ID.has(regionalId) ? regionalId : 'geral';
  atualizarAbasRegionaisDashboard();
  popularFiltros();
  sincronizarFiltrosDependentes();
  renderizarPainel();
}

function configurarAbasRegionaisDashboard() {
  const container = document.getElementById('regionalDashboardTabs');
  if (!container || container.dataset.configured === '1') return;
  container.dataset.configured = '1';
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.regional-tab[data-regional]');
    if (!button) return;
    selecionarRegionalDashboard(button.dataset.regional);
  });
  atualizarAbasRegionaisDashboard();
}


const CURVA_PERIODOS = {
  '7d': { label: '7 dias', dias: 7, agrupamento: 'dia' },
  '15d': { label: '15 dias', dias: 15, agrupamento: 'dia' },
  '30d': { label: '30 dias', dias: 30, agrupamento: 'dia' },
  '60d': { label: '60 dias', dias: 60, agrupamento: 'dia' },
  '3m': { label: '3 meses', meses: 3, agrupamento: 'semana' },
  '6m': { label: '6 meses', meses: 6, agrupamento: 'semana' },
  '1a': { label: '1 ano', meses: 12, agrupamento: 'mes' }
};

function dataIsoLocal(data) {
  return dataIsoParaDate(formatarData(data));
}

function dataLocalParaIso(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function somarDiasIso(dataIso, dias) {
  const data = dataIsoLocal(dataIso);
  if (!data) return '';
  data.setDate(data.getDate() + Number(dias || 0));
  return dataLocalParaIso(data);
}

function diferencaDiasInclusiva(inicioIso, fimIso) {
  const inicio = dataIsoLocal(inicioIso);
  const fim = dataIsoLocal(fimIso);
  if (!inicio || !fim) return 0;
  return Math.max(0, Math.round((fim - inicio) / 86400000) + 1);
}

function obterDataAncoraCurva() {
  const periodo = normalizarPeriodo(filtros.dataInicial?.value, filtros.dataFinal?.value);
  const dataRealNoPeriodo = obterUltimaDataImportadaNoPeriodo(periodo.dataInicial, periodo.dataFinal);
  const datasResumo = resumosDiarios.map((item) => formatarData(item.latestDate)).filter(Boolean).sort();
  return dataRealNoPeriodo
    || formatarData(filtros.dataFinal?.value)
    || formatarData(filtros.dataInicial?.value)
    || datasResumo.at(-1)
    || ultimaDataDisponivel
    || new Date().toISOString().slice(0, 10);
}

function obterIntervalosCurva(periodoId = curvaPeriodoAtual) {
  const config = CURVA_PERIODOS[periodoId] || CURVA_PERIODOS['30d'];
  const fimAtual = obterDataAncoraCurva();
  const fimDate = dataIsoLocal(fimAtual) || new Date();
  let inicioAtual = fimAtual;

  if (config.dias) {
    inicioAtual = somarDiasIso(fimAtual, -(config.dias - 1));
  } else if (config.meses === 12) {
    const inicio = new Date(fimDate.getFullYear(), fimDate.getMonth() - 11, 1);
    inicioAtual = dataLocalParaIso(inicio);
  } else {
    const inicio = new Date(fimDate.getFullYear(), fimDate.getMonth() - (config.meses - 1), 1);
    inicioAtual = dataLocalParaIso(inicio);
  }

  const duracao = diferencaDiasInclusiva(inicioAtual, fimAtual);
  const fimAnterior = somarDiasIso(inicioAtual, -1);
  const inicioAnterior = somarDiasIso(fimAnterior, -(duracao - 1));
  return { config, inicioAtual, fimAtual, inicioAnterior, fimAnterior, duracao };
}

function criarBucketsCurva(inicioIso, fimIso, agrupamento = 'dia') {
  const buckets = [];
  let cursor = dataIsoLocal(inicioIso);
  const fim = dataIsoLocal(fimIso);
  if (!cursor || !fim) return buckets;

  while (cursor <= fim) {
    const bucketInicio = new Date(cursor);
    let bucketFim = new Date(cursor);
    if (agrupamento === 'semana') {
      bucketFim.setDate(bucketFim.getDate() + 6);
    } else if (agrupamento === 'mes') {
      bucketFim = new Date(bucketFim.getFullYear(), bucketFim.getMonth() + 1, 0);
    }
    if (bucketFim > fim) bucketFim = new Date(fim);
    buckets.push({ inicio: dataLocalParaIso(bucketInicio), fim: dataLocalParaIso(bucketFim) });
    cursor = new Date(bucketFim);
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

function resumoCurvaRegional(resumo) {
  const base = resumo?.summary || {};
  if (regionalSelecionada === 'geral') return base;
  return base.regionais?.[regionalSelecionada] || null;
}

function mapaResumosCurva() {
  const mapa = new Map();
  resumosDiarios.map(normalizarResumoDiario).filter(Boolean).forEach((resumo) => {
    mapa.set(resumo.latestDate, resumo);
  });
  return mapa;
}

function agregarBucketCurva(bucket, mapa) {
  let previstas = 0;
  let realizadas = 0;
  let pendentes = 0;
  let noPrazo = 0;
  let atrasadas = 0;
  let diasComDados = 0;
  const totalDias = diferencaDiasInclusiva(bucket.inicio, bucket.fim);
  let data = bucket.inicio;

  while (data && data <= bucket.fim) {
    const resumo = mapa.get(data);
    const grupo = resumoCurvaRegional(resumo);
    if (grupo && Number(grupo.previstas || 0) > 0) {
      previstas += Number(grupo.previstas || 0);
      realizadas += Number(grupo.realizadas || 0);
      pendentes += Number(grupo.pendentes || 0);
      noPrazo += Number(grupo.noPrazo || 0);
      atrasadas += Number(grupo.atrasadas || 0);
      diasComDados += 1;
    }
    data = somarDiasIso(data, 1);
  }

  return {
    ...bucket,
    previstas,
    realizadas,
    pendentes,
    noPrazo,
    atrasadas,
    diasComDados,
    totalDias,
    execucao: previstas ? (realizadas / previstas) * 100 : null
  };
}

function formatarRotuloCurva(bucket, agrupamento = 'dia', compacto = false) {
  const inicio = dataIsoLocal(bucket.inicio);
  const fim = dataIsoLocal(bucket.fim);
  if (!inicio || !fim) return '';
  if (agrupamento === 'dia') {
    return inicio.toLocaleDateString('pt-BR', compacto
      ? { day: '2-digit', month: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (agrupamento === 'mes') {
    return inicio.toLocaleDateString('pt-BR', { month: compacto ? 'short' : 'long', year: 'numeric' });
  }
  const mesmoMes = inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear();
  if (mesmoMes) return `${inicio.getDate()}–${fim.getDate()} ${fim.toLocaleDateString('pt-BR', { month: 'short' })}`;
  return `${inicio.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}–${fim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
}

function obterSeriesCurva() {
  const intervalos = obterIntervalosCurva();
  const mapa = mapaResumosCurva();
  const bucketsAtuais = criarBucketsCurva(intervalos.inicioAtual, intervalos.fimAtual, intervalos.config.agrupamento);
  const bucketsAnteriores = criarBucketsCurva(intervalos.inicioAnterior, intervalos.fimAnterior, intervalos.config.agrupamento);
  const atual = bucketsAtuais.map((bucket) => agregarBucketCurva(bucket, mapa));
  const anterior = bucketsAnteriores.map((bucket) => agregarBucketCurva(bucket, mapa));
  const tamanho = Math.max(atual.length, anterior.length);
  const pontos = Array.from({ length: tamanho }, (_, index) => ({
    index,
    atual: atual[index] || null,
    anterior: anterior[index] || null,
    label: atual[index] ? formatarRotuloCurva(atual[index], intervalos.config.agrupamento, true) : `${index + 1}`
  }));
  return { ...intervalos, atual, anterior, pontos };
}

function resumirSerieCurva(serie = []) {
  const validos = serie.filter((item) => item && item.previstas > 0 && item.execucao !== null);
  const previstas = validos.reduce((soma, item) => soma + item.previstas, 0);
  const realizadas = validos.reduce((soma, item) => soma + item.realizadas, 0);
  const diasComDados = validos.reduce((soma, item) => soma + item.diasComDados, 0);
  const melhor = validos.reduce((acc, item) => !acc || item.execucao > acc.execucao ? item : acc, null);
  const pior = validos.reduce((acc, item) => !acc || item.execucao < acc.execucao ? item : acc, null);
  return {
    validos,
    previstas,
    realizadas,
    diasComDados,
    execucao: previstas ? (realizadas / previstas) * 100 : null,
    melhor,
    pior
  };
}

function formatarPctCurva(valor) {
  return Number.isFinite(valor) ? `${Math.round(valor)}%` : '--';
}

function montarCaminhoCurva(valores, x, y) {
  let caminho = '';
  let aberto = false;
  valores.forEach((valor, index) => {
    if (!Number.isFinite(valor)) {
      aberto = false;
      return;
    }
    caminho += `${aberto ? ' L' : ' M'} ${x(index).toFixed(2)} ${y(valor).toFixed(2)}`;
    aberto = true;
  });
  return caminho.trim();
}

function renderizarSvgCurva(series) {
  const container = document.getElementById('executionCurveChart');
  if (!container) return;
  const pontos = series.pontos;
  const largura = Math.max(820, pontos.length * (pontos.length > 40 ? 30 : 48));
  const altura = 330;
  const margem = { topo: 24, direita: 30, baixo: 58, esquerda: 54 };
  const larguraPlot = largura - margem.esquerda - margem.direita;
  const alturaPlot = altura - margem.topo - margem.baixo;
  const x = (index) => margem.esquerda + (pontos.length <= 1 ? larguraPlot / 2 : (index / (pontos.length - 1)) * larguraPlot);
  const y = (valor) => margem.topo + alturaPlot - (Math.max(0, Math.min(100, valor)) / 100) * alturaPlot;
  const atualValores = pontos.map((ponto) => ponto.atual?.execucao ?? null);
  const anteriorValores = pontos.map((ponto) => ponto.anterior?.execucao ?? null);
  const caminhoAtual = montarCaminhoCurva(atualValores, x, y);
  const caminhoAnterior = montarCaminhoCurva(anteriorValores, x, y);
  const passoLabel = Math.max(1, Math.ceil(pontos.length / 9));
  const grades = [0, 25, 50, 75, 100];

  const linhasGrade = grades.map((valor) => `
    <line class="curve-grid-line" x1="${margem.esquerda}" y1="${y(valor)}" x2="${largura - margem.direita}" y2="${y(valor)}"></line>
    <text class="curve-axis-y" x="${margem.esquerda - 12}" y="${y(valor) + 4}" text-anchor="end">${valor}%</text>`).join('');

  const labelsX = pontos.map((ponto, index) => {
    if (index % passoLabel !== 0 && index !== pontos.length - 1) return '';
    return `<text class="curve-axis-x" x="${x(index)}" y="${altura - 20}" text-anchor="middle">${escaparHtml(ponto.label)}</text>`;
  }).join('');

  const pontosAtuais = pontos.map((ponto, index) => {
    if (!Number.isFinite(ponto.atual?.execucao)) return '';
    return `<circle class="curve-point current" cx="${x(index)}" cy="${y(ponto.atual.execucao)}" r="4.5" data-curve-index="${index}"></circle>`;
  }).join('');

  const zonasHit = pontos.map((ponto, index) => {
    const larguraHit = pontos.length <= 1 ? larguraPlot : Math.max(18, larguraPlot / Math.max(1, pontos.length - 1));
    return `<rect class="curve-hit-zone" x="${x(index) - larguraHit / 2}" y="${margem.topo}" width="${larguraHit}" height="${alturaPlot}" data-curve-index="${index}"></rect>`;
  }).join('');

  container.innerHTML = `
    <svg class="execution-curve-svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" aria-hidden="true">
      <defs>
        <filter id="curveGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
      </defs>
      ${linhasGrade}
      ${caminhoAnterior ? `<path class="curve-path previous" d="${caminhoAnterior}"></path>` : ''}
      ${caminhoAtual ? `<path class="curve-path current" d="${caminhoAtual}" filter="url(#curveGlow)"></path>` : ''}
      ${pontosAtuais}
      ${labelsX}
      ${zonasHit}
    </svg>`;

  container.querySelectorAll('[data-curve-index]').forEach((elemento) => {
    elemento.addEventListener('mouseenter', (event) => mostrarTooltipCurva(event, series, Number(elemento.dataset.curveIndex)));
    elemento.addEventListener('mousemove', (event) => posicionarTooltipCurva(event));
    elemento.addEventListener('mouseleave', ocultarTooltipCurva);
    elemento.addEventListener('click', (event) => mostrarTooltipCurva(event, series, Number(elemento.dataset.curveIndex)));
  });
}

function montarDetalheTooltipCurva(titulo, item, agrupamento) {
  if (!item || item.previstas <= 0) return `<div class="curve-tooltip-period"><strong>${escaparHtml(titulo)}</strong><span>Sem dados no período</span></div>`;
  const rotulo = formatarRotuloCurva(item, agrupamento, false);
  return `<div class="curve-tooltip-period">
    <strong>${escaparHtml(titulo)}</strong><span>${escaparHtml(rotulo)}</span>
    <dl><div><dt>Execução</dt><dd>${formatarPctCurva(item.execucao)}</dd></div><div><dt>Previstas</dt><dd>${formatarNumero.format(item.previstas)}</dd></div><div><dt>Realizadas</dt><dd>${formatarNumero.format(item.realizadas)}</dd></div><div><dt>Pendentes</dt><dd>${formatarNumero.format(item.pendentes)}</dd></div><div><dt>No prazo</dt><dd>${formatarNumero.format(item.noPrazo)}</dd></div><div><dt>Em atraso</dt><dd>${formatarNumero.format(item.atrasadas)}</dd></div></dl>
  </div>`;
}

function mostrarTooltipCurva(event, series, index) {
  const tooltip = document.getElementById('executionCurveTooltip');
  const ponto = series.pontos[index];
  if (!tooltip || !ponto) return;
  tooltip.innerHTML = `${montarDetalheTooltipCurva('Período atual', ponto.atual, series.config.agrupamento)}${montarDetalheTooltipCurva('Período anterior', ponto.anterior, series.config.agrupamento)}`;
  tooltip.classList.remove('hidden');
  posicionarTooltipCurva(event);
}

function posicionarTooltipCurva(event) {
  const tooltip = document.getElementById('executionCurveTooltip');
  const shell = document.getElementById('executionCurveChartShell');
  if (!tooltip || !shell || tooltip.classList.contains('hidden')) return;
  const rect = shell.getBoundingClientRect();
  const largura = tooltip.offsetWidth || 280;
  const altura = tooltip.offsetHeight || 220;
  let left = event.clientX - rect.left + 14;
  let top = event.clientY - rect.top - altura / 2;
  if (left + largura > rect.width - 8) left = event.clientX - rect.left - largura - 14;
  top = Math.max(8, Math.min(top, rect.height - altura - 8));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function ocultarTooltipCurva() {
  document.getElementById('executionCurveTooltip')?.classList.add('hidden');
}

function renderizarResumoCurva(series) {
  const atual = resumirSerieCurva(series.atual);
  const anterior = resumirSerieCurva(series.anterior);
  const mediaEl = document.getElementById('curveAverage');
  const mediaDetail = document.getElementById('curveAverageDetail');
  const bestEl = document.getElementById('curveBest');
  const bestDetail = document.getElementById('curveBestDetail');
  const worstEl = document.getElementById('curveWorst');
  const worstDetail = document.getElementById('curveWorstDetail');
  const variationEl = document.getElementById('curveVariation');
  const variationDetail = document.getElementById('curveVariationDetail');
  const previousLegend = document.getElementById('curvePreviousLegend');
  const coverage = document.getElementById('curveCoverage');
  const subtitle = document.getElementById('executionCurveSubtitle');

  if (mediaEl) mediaEl.textContent = formatarPctCurva(atual.execucao);
  if (mediaDetail) mediaDetail.textContent = atual.previstas ? `${formatarNumero.format(atual.realizadas)} de ${formatarNumero.format(atual.previstas)} rotinas` : 'Sem dados';
  if (bestEl) bestEl.textContent = formatarPctCurva(atual.melhor?.execucao);
  if (bestDetail) bestDetail.textContent = atual.melhor ? formatarRotuloCurva(atual.melhor, series.config.agrupamento, false) : 'Sem dados';
  if (worstEl) worstEl.textContent = formatarPctCurva(atual.pior?.execucao);
  if (worstDetail) worstDetail.textContent = atual.pior ? formatarRotuloCurva(atual.pior, series.config.agrupamento, false) : 'Sem dados';

  const temComparacao = Number.isFinite(atual.execucao) && Number.isFinite(anterior.execucao);
  const variacao = temComparacao ? atual.execucao - anterior.execucao : null;
  if (variationEl) {
    variationEl.textContent = Number.isFinite(variacao) ? `${variacao >= 0 ? '+' : ''}${Math.round(variacao)} p.p.` : '--';
    variationEl.classList.toggle('positive', Number.isFinite(variacao) && variacao >= 0);
    variationEl.classList.toggle('negative', Number.isFinite(variacao) && variacao < 0);
  }
  if (variationDetail) variationDetail.textContent = temComparacao ? `Anterior: ${formatarPctCurva(anterior.execucao)}` : 'Período anterior indisponível';
  if (previousLegend) previousLegend.classList.toggle('muted', !anterior.validos.length);

  const regionalNome = regionalSelecionada === 'geral' ? 'Visão Geral' : (REGIONAIS_POR_ID.get(regionalSelecionada)?.nome || 'Regional');
  if (subtitle) subtitle.textContent = `${series.config.label} até ${dataIsoLocal(series.fimAtual)?.toLocaleDateString('pt-BR')} • ${regionalNome}`;
  if (coverage) coverage.textContent = `${atual.diasComDados} dia(s) com dados`;
}

function renderizarCurvaExecucao() {
  const chart = document.getElementById('executionCurveChart');
  const empty = document.getElementById('executionCurveEmpty');
  const shell = document.getElementById('executionCurveChartShell');
  if (!chart || !empty || !shell) return;
  const series = obterSeriesCurva();
  const atual = resumirSerieCurva(series.atual);
  document.querySelectorAll('[data-curve-period]').forEach((button) => button.classList.toggle('active', button.dataset.curvePeriod === curvaPeriodoAtual));
  renderizarResumoCurva(series);

  const semDados = !atual.validos.length;
  empty.classList.toggle('hidden', !semDados);
  shell.classList.toggle('hidden', semDados);
  if (semDados) {
    chart.innerHTML = '';
    ocultarTooltipCurva();
    return;
  }
  renderizarSvgCurva(series);

  requestAnimationFrame(() => {
    const scroll = document.getElementById('executionCurveScroll');
    if (scroll && scroll.scrollWidth > scroll.clientWidth) scroll.scrollLeft = scroll.scrollWidth;
  });
}

function configurarCurvaExecucao() {
  const container = document.getElementById('executionCurvePeriods');
  if (!container || container.dataset.configured === '1') return;
  container.dataset.configured = '1';
  container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-curve-period]');
    if (!button || !CURVA_PERIODOS[button.dataset.curvePeriod]) return;
    curvaPeriodoAtual = button.dataset.curvePeriod;
    ocultarTooltipCurva();
    renderizarCurvaExecucao();
  });
  document.getElementById('executionCurveChartShell')?.addEventListener('mouseleave', ocultarTooltipCurva);
}

function renderizarPainel() {
  dadosFiltrados = obterDadosFiltrados();
  atualizarKPIs(dadosFiltrados);
  renderRankingFormadores(dadosFiltrados);
  renderPromotorDestaque(dadosFiltrados);
  renderRankingsPorFormador(dadosFiltrados);
  renderRankingLojas(dadosFiltrados);
  renderRotinasMenosRealizadas(dadosFiltrados);
  renderTabelaRotinas(dadosFiltrados);
  renderResumoLojas(dadosFiltrados);
  renderCalendarioExecucao(dadosFiltrados);
  renderizarCurvaExecucao();
  renderizarApresentacaoSeAberta();
}


function limparFiltros() {
  filtros.rede.value = '';
  filtros.loja.value = '';
  filtros.formador.value = '';
  filtros.status.value = '';
  filtros.dataInicial.value = '';
  filtros.dataFinal.value = '';
  filtros.rotina.value = '';
  snapshotsSobDemanda = [];
  periodoSobDemandaAtual = { dataInicial: '', dataFinal: '' };
  recomporSnapshotsAtivos();
  atualizarBasePorSnapshots('Exibindo novamente os detalhes recentes.');
  sincronizarFiltrosDependentes();
  renderizarPainel();
}

function consolidarSnapshotsImportados() {
  if (cacheConsolidado.versao === versaoCacheDados) {
    return cacheConsolidado.dados;
  }
  if (!snapshotsImportados.length) {
    cacheConsolidado = { versao: versaoCacheDados, dados: [] };
    return [];
  }

  const respostas = obterRespostasPersistidas();
  const datas = [...new Set([
    ...snapshotsImportados
      .filter((snapshot) => snapshot.dataLoaded !== false && Array.isArray(snapshot.data))
      .map((snapshot) => formatarData(snapshot.latestDate))
      .filter(Boolean),
    ...respostas.map((item) => item.data).filter(Boolean)
  ])].sort();

  const dados = datas.flatMap((data) => gerarResultadosBaseParaData(data, respostas).resultados);
  cacheConsolidado = { versao: versaoCacheDados, dados };
  return dados;
}

function aplicarBase(base, origem = 'simulada', detalhe = '') {
  registros = base.filter((item) => item.data && item.rotina && item.loja && item.status);
  ultimaDataDisponivel = obterUltimaData(registros);
  popularFiltros();
  sincronizarFiltrosDependentes();
  atualizarRotulosAbas();
  if (document.querySelector('.summary-tab.active')) {
    aplicarPeriodoResumo(resumoPeriodoAtual);
  } else {
    renderizarPainel();
  }
  atualizarResumoAdmin();
  atualizarAbasRegionaisDashboard();
  const adminModal = document.getElementById('adminModal');
  const adminPanel = document.getElementById('adminPanelView');
  if (adminModal && !adminModal.classList.contains('hidden') && adminPanel && !adminPanel.classList.contains('hidden')) {
    popularControlesAdmin();
  }

  if (origem === 'importada') {
    if (importBadge) importBadge.textContent = 'Planilhas ativas';
    if (datasetStatus) datasetStatus.textContent = '';
    importSummary.textContent = detalhe || `${registros.length} registros importados com sucesso.`;
  } else {
    if (importBadge) importBadge.textContent = 'Painel zerado';
    if (datasetStatus) datasetStatus.textContent = '';
    importSummary.textContent = detalhe || 'Painel sem dados. Importe uma ou mais planilhas para carregar as rotinas.';
  }
}

function inferirFormadoresPorAba(linhasFormadores) {
  const mapa = new Map();
  if (!linhasFormadores?.length) return mapa;
  const cabecalho = linhasFormadores[0].map((item) => String(item || '').trim().toLowerCase());
  const idxNome = cabecalho.findIndex((item) => item.includes('formador'));
  const idxLojas = cabecalho.findIndex((item) => item.includes('lojas') || item.includes('unidade') || item.includes('loja'));

  linhasFormadores.slice(1).forEach((linha) => {
    const nome = String(linha[idxNome] || '').trim();
    const lojasTexto = String(linha[idxLojas] || '').trim();
    if (!nome || !lojasTexto) return;
    lojasTexto.split(',').map((parte) => parte.trim()).filter(Boolean).forEach((loja) => {
      mapa.set(slug(renomearLojaSeNecessario(loja)), nome);
    });
  });

  return mapa;
}

function inferirPromotoresPorAba(sheets) {
  const nomeAba = Object.keys(sheets).find((nome) => nome.toLowerCase().includes('promotor'));
  const linhas = nomeAba ? sheets[nomeAba] : [];
  const mapa = new Map();
  if (!linhas?.length) return mapa;
  const cabecalho = linhas[0].map((item) => String(item || '').trim().toLowerCase());
  const idxPromotor = cabecalho.findIndex((item) => item.includes('promotor'));
  const idxLoja = cabecalho.findIndex((item) => item.includes('loja') || item.includes('unidade'));
  if (idxPromotor < 0 || idxLoja < 0) return mapa;

  linhas.slice(1).forEach((linha) => {
    const promotor = String(linha[idxPromotor] || '').trim();
    const loja = String(linha[idxLoja] || '').trim();
    if (!promotor || !loja) return;
    mapa.set(slug(renomearLojaSeNecessario(loja)), promotor);
  });

  return mapa;
}

function inferirRedesPorAba(linhasRedes) {
  const mapa = {};
  if (!linhasRedes?.length) return mapa;
  const cabecalho = linhasRedes[0].map((item) => String(item || '').trim().toLowerCase());
  const idxSigla = cabecalho.findIndex((item) => item.includes('sigla'));
  const idxNome = cabecalho.findIndex((item) => item.includes('nome da rede'));
  linhasRedes.slice(1).forEach((linha) => {
    const sigla = String(linha[idxSigla] || '').trim();
    const nome = String(linha[idxNome] || '').trim();
    if (sigla && nome) mapa[sigla] = nome;
  });
  return mapa;
}

function localizarCabecalhoMoki(linhas = []) {
  for (let index = 0; index < Math.min(linhas.length, 30); index += 1) {
    const cabecalho = (linhas[index] || []).map((item) => slug(item));
    const temChecklist = cabecalho.includes('checklist');
    const temLoja = cabecalho.includes('nome-da-unidade') || cabecalho.includes('unidade');
    const temData = cabecalho.includes('data-de-referencia')
      || cabecalho.includes('data-de-inicio')
      || cabecalho.includes('data-avaliacao')
      || cabecalho.includes('data-da-resposta');
    if (temChecklist && temLoja && temData) {
      return { index, cabecalho };
    }
  }
  return null;
}

function encontrarIndiceCabecalho(cabecalho, candidatos = []) {
  return cabecalho.findIndex((item) => candidatos.includes(item));
}

function extrairRespostasMoki(sheets) {
  const nomeAba = Object.keys(sheets).find((nome) => slug(nome).includes('checklists-respondidos'))
    || Object.keys(sheets).find((nome) => slug(nome).includes('checklist'))
    || Object.keys(sheets)[0];
  const linhas = sheets[nomeAba] || [];
  if (!linhas.length) throw new Error('A planilha está vazia.');

  const cabecalhoInfo = localizarCabecalhoMoki(linhas);
  if (!cabecalhoInfo) {
    throw new Error('Não foi possível localizar as colunas do relatório de checklist do Moki.');
  }

  const { index: linhaCabecalho, cabecalho } = cabecalhoInfo;
  const idxId = encontrarIndiceCabecalho(cabecalho, ['id']);
  const idxChecklist = encontrarIndiceCabecalho(cabecalho, ['checklist']);
  const idxDataReferencia = encontrarIndiceCabecalho(cabecalho, ['data-de-referencia']);
  const idxDataInicio = encontrarIndiceCabecalho(cabecalho, ['data-de-inicio']);
  const idxDataAvaliacao = encontrarIndiceCabecalho(cabecalho, ['data-avaliacao']);
  const idxDataResposta = encontrarIndiceCabecalho(cabecalho, ['data-da-resposta']);
  const idxNomeUnidade = encontrarIndiceCabecalho(cabecalho, ['nome-da-unidade']);
  const idxUnidade = encontrarIndiceCabecalho(cabecalho, ['unidade']);
  const idxCodigoUnidade = encontrarIndiceCabecalho(cabecalho, ['cod-da-unidade', 'codigo-da-unidade']);
  const idxAutor = encontrarIndiceCabecalho(cabecalho, ['autor']);
  const idxStatus = encontrarIndiceCabecalho(cabecalho, ['status']);
  const idxDataRealizacao = idxDataResposta >= 0
    ? idxDataResposta
    : (idxDataInicio >= 0 ? idxDataInicio : idxDataAvaliacao);

  if (idxChecklist < 0 || idxDataRealizacao < 0 || (idxNomeUnidade < 0 && idxUnidade < 0)) {
    throw new Error('A planilha precisa conter CHECKLIST, UNIDADE e uma coluna de data/hora: DATA DA RESPOSTA, DATA DE INÍCIO ou DATA AVALIAÇÃO.');
  }

  let respostas = [];
  const naoReconhecidos = [];
  const variacoesReconhecidas = [];
  const linhasInvalidas = [];
  const naoEncerrados = [];
  const datasDivergentes = [];
  const lojasNaoAtivas = [];
  const datasForaPeriodo = [];
  const rawData = [];

  linhas.slice(linhaCabecalho + 1).forEach((linha, index) => {
    if (!Array.isArray(linha) || !linha.some((valor) => String(valor ?? '').trim())) return;

    const numeroLinha = linhaCabecalho + index + 2;
    const checklistOriginal = String(linha[idxChecklist] || '').trim();
    const unidadeOriginal = String(
      (idxNomeUnidade >= 0 ? linha[idxNomeUnidade] : '')
      || (idxUnidade >= 0 ? linha[idxUnidade] : '')
      || ''
    ).trim();
    const unidadeSeparada = separarCodigoNomeUnidade(unidadeOriginal);
    const lojaOriginal = unidadeSeparada.nomeUnidade;
    const dataReferenciaOriginal = idxDataReferencia >= 0 ? linha[idxDataReferencia] : '';
    const dataRealizacaoOriginal = linha[idxDataRealizacao];
    const autor = idxAutor >= 0 ? String(linha[idxAutor] || '').trim() : '';
    const codigoUnidade = normalizarCodigoUnidade(
      (idxCodigoUnidade >= 0 ? linha[idxCodigoUnidade] : '') || unidadeSeparada.codigoUnidade
    );
    const idMoki = idxId >= 0 ? String(linha[idxId] || '').trim() : '';
    const statusMoki = idxStatus >= 0 ? String(linha[idxStatus] || '').trim() : 'Encerrado';
    const dataHora = parseDataHoraMoki(dataRealizacaoOriginal, dataReferenciaOriginal);
    const dataReferencia = formatarData(dataReferenciaOriginal) || dataHora.data;
    const lojaAtiva = resolverLojaAtiva(lojaOriginal, codigoUnidade);
    const loja = lojaAtiva?.nome || renomearLojaSeNecessario(lojaOriginal);
    const correspondenciaRotina = encontrarCorrespondenciaRotinaPorNome(checklistOriginal);
    const rotinaConfig = correspondenciaRotina?.rotina || null;

    const raw = {
      linha: numeroLinha,
      idMoki,
      data: dataReferencia,
      dataInicio: dataHora.data,
      checklist: checklistOriginal,
      loja,
      lojaOriginal,
      unidadeOriginal,
      codigoUnidade,
      statusMoki,
      dataHoraRealizada: dataHora.dataHoraIso,
      horaRealizada: dataHora.hora,
      autor
    };
    rawData.push(raw);

    if (!dataReferencia || !checklistOriginal || !lojaOriginal || !dataHora.hora) {
      linhasInvalidas.push(raw);
      return;
    }

    if (slug(statusMoki) !== 'encerrado') {
      naoEncerrados.push(raw);
      return;
    }

    if (dataHora.data && dataReferencia && dataHora.data !== dataReferencia) {
      datasDivergentes.push(raw);
      return;
    }

    if (!lojaAtiva) {
      lojasNaoAtivas.push(raw);
      return;
    }

    if (!rotinaConfig) {
      naoReconhecidos.push(raw);
      return;
    }

    if (correspondenciaRotina?.tipo === 'alias') {
      const regraHistorica = obterRegraPontualidadeResposta(rotinaConfig, checklistOriginal);
      variacoesReconhecidas.push({
        ...raw,
        rotinaId: rotinaConfig.id,
        rotinaReconhecida: rotinaConfig.nome,
        aliasReconhecido: correspondenciaRotina.nomeCorrespondente,
        horarioFimAplicado: regraHistorica?.horarioFim || rotinaConfig.horarioFim || ''
      });
    }

    respostas.push({
      ...raw,
      data: dataReferencia,
      loja: lojaAtiva.nome,
      codigoUnidade: lojaAtiva.codigo,
      rotina: rotinaConfig.nome,
      rotinaId: rotinaConfig.id,
      promotor: autor
    });
  });

  if (!rawData.length) {
    throw new Error('Nenhuma linha foi encontrada no relatório do Moki.');
  }

  if (!respostas.length) {
    throw new Error('Nenhuma resposta encerrada e válida corresponde às lojas e rotinas cadastradas no sistema.');
  }

  // O relatório com "Data da resposta" pode carregar uma resposta antiga isolada.
  // Quando uma única data concentra pelo menos 90% das rotinas únicas, ela é tratada
  // como o período principal; datas residuais são ignoradas para não gerar um dia inteiro
  // de pendências por causa de uma linha antiga.
  if (idxDataResposta >= 0 && idxDataReferencia < 0) {
    const unicas = mesclarRespostas(respostas);
    const contagemDatas = unicas.reduce((acc, item) => {
      acc[item.data] = (acc[item.data] || 0) + 1;
      return acc;
    }, {});
    const entradasDatas = Object.entries(contagemDatas).sort((a, b) => b[1] - a[1]);
    const totalUnicas = unicas.length;
    const principal = entradasDatas[0];
    if (entradasDatas.length > 1 && principal && totalUnicas > 0 && principal[1] / totalUnicas >= 0.90) {
      const dataPrincipal = principal[0];
      respostas = respostas.filter((item) => {
        if (item.data === dataPrincipal) return true;
        datasForaPeriodo.push(item);
        return false;
      });
    }
  }

  return {
    nomeAba,
    linhaCabecalho,
    respostas,
    naoReconhecidos,
    variacoesReconhecidas,
    linhasInvalidas,
    naoEncerrados,
    datasDivergentes,
    lojasNaoAtivas,
    datasForaPeriodo,
    rawData
  };
}

function chaveResposta(data, loja, rotinaId) {
  return `${data}||${slug(renomearLojaSeNecessario(loja))}||${rotinaId}`;
}

function escolherRespostaConclusao(atual, candidata) {
  if (!atual) return candidata;
  const atualIso = String(atual.dataHoraRealizada || '');
  const candidataIso = String(candidata.dataHoraRealizada || '');
  if (atualIso && candidataIso) return candidataIso > atualIso ? candidata : atual;

  const atualMin = horarioParaMinutos(atual.horaRealizada);
  const candidataMin = horarioParaMinutos(candidata.horaRealizada);
  if (atualMin === null) return candidata;
  if (candidataMin === null) return atual;
  return candidataMin > atualMin ? candidata : atual;
}

function mesclarRespostas(respostas = []) {
  const mapa = new Map();
  respostas.forEach((resposta) => {
    if (!resposta?.data || !resposta?.loja || !resposta?.rotinaId) return;
    const chave = chaveResposta(resposta.data, resposta.loja, resposta.rotinaId);
    mapa.set(chave, escolherRespostaConclusao(mapa.get(chave), resposta));
  });
  return [...mapa.values()];
}

function normalizarRespostaPersistida(item = {}) {
  const data = formatarData(item.data);
  const lojaAtiva = resolverLojaAtiva(item.loja, item.codigoUnidade);
  const rotina = obterConfigRotinaPorId(item.rotinaId) || encontrarConfigRotinaPorNome(item.rotina || item.checklistOriginal || item.checklist);
  const statusInformado = String(item.status || '').trim();

  if (!data || !lojaAtiva || !rotina) return null;
  if (statusInformado && normalizarStatus(statusInformado) !== 'realizada') return null;

  const horaMatch = String(item.dataHoraRealizada || '').match(/T(\d{2}:\d{2})/);
  const horaRealizada = validarHorario(item.horaRealizada) || validarHorario(horaMatch?.[1]);
  if (!horaRealizada) return null;

  return {
    data,
    checklist: item.checklistOriginal || item.checklist || rotina.nomeMoki || rotina.nome,
    loja: lojaAtiva.nome,
    codigoUnidade: lojaAtiva.codigo,
    rotina: rotina.nome,
    rotinaId: rotina.id,
    dataHoraRealizada: item.dataHoraRealizada || `${data}T${horaRealizada}:00`,
    horaRealizada,
    autor: item.autor || item.promotor || '',
    promotor: item.promotor || item.autor || ''
  };
}

function obterRespostasPersistidas() {
  if (cacheRespostasPersistidas.versao === versaoCacheDados) {
    return cacheRespostasPersistidas.respostas;
  }

  const mapa = new Map();
  const ordenados = [...snapshotsImportados].sort((a, b) => new Date(a.importedAt || 0) - new Date(b.importedAt || 0));

  ordenados.forEach((snapshot) => {
    const linhas = Array.isArray(snapshot.data) ? snapshot.data : [];
    linhas.forEach((item) => {
      const resposta = normalizarRespostaPersistida(item);
      if (!resposta) return;
      const chave = chaveResposta(resposta.data, resposta.loja, resposta.rotinaId);
      mapa.set(chave, escolherRespostaConclusao(mapa.get(chave), resposta));
    });
  });

  const respostas = [...mapa.values()];
  cacheRespostasPersistidas = { versao: versaoCacheDados, respostas };
  return respostas;
}

function obterRespostasAnteriores(data) {
  return obterRespostasPersistidas().filter((item) => item.data === data);
}

function gerarResultadosBaseParaData(data, respostasInformadas = []) {
  const respostas = mesclarRespostas(respostasInformadas.filter((item) => item.data === data));
  const lojas = obterLojasConhecidas();
  const mapaRespostas = new Map(respostas.map((item) => [chaveResposta(item.data, item.loja, item.rotinaId), item]));
  const resultados = [];
  const foraDaProgramacao = [];

  respostas.forEach((resposta) => {
    const rotina = obterConfigRotinaPorId(resposta.rotinaId);
    if (!rotina || !rotinaAplicaNaData(rotina, data) || !rotinaAplicaNaLoja(rotina, resposta.loja, data, resposta.codigoUnidade)) {
      foraDaProgramacao.push(resposta);
    }
  });

  const rotinasDoDia = configRotinas.filter((rotina) => rotinaAplicaNaData(rotina, data));
  rotinasDoDia.forEach((rotina) => {
    lojas.forEach((loja) => {
      if (!rotinaAplicaNaLoja(rotina, loja, data)) return;
      const resposta = mapaRespostas.get(chaveResposta(data, loja, rotina.id));
      const status = resposta ? 'realizada' : 'pendente';
      const rotinaPontualidade = obterRegraPontualidadeResposta(rotina, resposta?.checklist || resposta?.checklistOriginal || '');
      const pontualidade = classificarPontualidade(rotinaPontualidade, resposta?.horaRealizada || '', status);
      const lojaAtiva = resolverLojaAtiva(loja);
      const lojaNormalizada = lojaAtiva?.nome || loja;
      const lojaInfo = parseLoja(lojaNormalizada);

      resultados.push({
        id: `resultado-${data}-${slug(lojaNormalizada)}-${rotina.id}`,
        data,
        rede: lojaInfo.rede,
        loja: lojaInfo.loja,
        codigoUnidade: lojaAtiva?.codigo || '',
        unidade: lojaInfo.unidade,
        regional: resolverRegional(lojaNormalizada, lojaAtiva?.codigo).id,
        regionalNome: resolverRegional(lojaNormalizada, lojaAtiva?.codigo).nome,
        formador: resolverFormador(lojaInfo.loja),
        promotor: resposta?.promotor || resposta?.autor || resolverPromotor(lojaInfo.loja),
        autor: resposta?.autor || '',
        rotina: rotina.nome,
        rotinaId: rotina.id,
        checklistOriginal: resposta?.checklist || rotina.nomeMoki,
        status,
        dataHoraRealizada: resposta?.dataHoraRealizada || '',
        horaRealizada: resposta?.horaRealizada || '',
        horarioInicioPrevisto: rotinaPontualidade.horarioInicio,
        horarioFimPrevisto: rotinaPontualidade.horarioFim,
        toleranciaInicioMin: rotinaPontualidade.toleranciaInicioMin,
        toleranciaFimMin: rotinaPontualidade.toleranciaFimMin,
        escopoRotina: rotina.escopo,
        diasRotina: rotina.dias,
        ...pontualidade,
        origem: 'importada'
      });
    });
  });

  return { resultados, foraDaProgramacao, respostasMescladas: respostas };
}

function gerarResultadosParaData(data, respostasNovas = []) {
  const respostas = mesclarRespostas([
    ...obterRespostasAnteriores(data),
    ...respostasNovas.filter((item) => item.data === data)
  ]);
  return gerarResultadosBaseParaData(data, respostas);
}

function compactarRespostaParaPersistencia(resposta = {}) {
  return {
    data: resposta.data,
    loja: resposta.loja,
    codigoUnidade: normalizarCodigoUnidade(resposta.codigoUnidade),
    rotinaId: resposta.rotinaId,
    checklist: resposta.checklist || resposta.checklistOriginal || '',
    horaRealizada: resposta.horaRealizada,
    dataHoraRealizada: resposta.dataHoraRealizada || '',
    autor: resposta.autor || '',
    promotor: resposta.promotor || resposta.autor || ''
  };
}

function resumirResultadosImportacao(resultados = []) {
  const resumirGrupo = (lista) => ({
    previstas: lista.length,
    realizadas: lista.filter((item) => item.status === 'realizada').length,
    pendentes: lista.filter((item) => item.status === 'pendente').length,
    noPrazo: lista.filter((item) => item.pontualidade === 'no_prazo').length,
    toleranciaInicio: lista.filter((item) => item.pontualidade === 'tolerancia_inicio').length,
    toleranciaFim: lista.filter((item) => item.pontualidade === 'tolerancia_fim').length,
    atrasadas: lista.filter((item) => item.pontualidade === 'atrasada').length,
    antesHorario: lista.filter((item) => item.pontualidade === 'antes_horario').length,
    semHorario: lista.filter((item) => item.pontualidade === 'sem_regra').length
  });
  const geral = resumirGrupo(resultados);
  geral.regionais = REGIONAIS.reduce((acc, regional) => {
    acc[regional.id] = resumirGrupo(resultados.filter((item) => registroPertenceRegional(item, regional.id)));
    return acc;
  }, {});
  return geral;
}

function detectarMesNoNomeArquivo(fileName = '') {
  const nome = slug(String(fileName || '').replace(/\.[^.]+$/, ''));
  for (const mes of MESES_ARQUIVO) {
    if (mes.nomes.some((item) => nome.split('-').includes(item) || nome.includes(`-${item}-`) || nome.endsWith(`-${item}`))) {
      return mes.numero;
    }
  }
  return '';
}

function formatarCompetencia(competencia = '') {
  const match = String(competencia).match(/^(\d{4})-(\d{2})$/);
  if (!match) return '';
  const data = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function detectarCompetenciaArquivo(fileName = '', respostas = []) {
  const datas = respostas.map((item) => formatarData(item.data)).filter(Boolean);
  if (!datas.length) return { competencia: '', origem: '', erro: '' };

  const mesNome = detectarMesNoNomeArquivo(fileName);
  if (mesNome) {
    const anos = datas.reduce((acc, data) => {
      if (data.slice(5, 7) !== mesNome) return acc;
      const ano = data.slice(0, 4);
      acc[ano] = (acc[ano] || 0) + 1;
      return acc;
    }, {});
    const principal = Object.entries(anos).sort((a, b) => b[1] - a[1])[0];
    if (!principal) {
      const nomeMes = MESES_ARQUIVO.find((item) => item.numero === mesNome)?.nomes?.[0] || mesNome;
      return {
        competencia: '',
        origem: 'nome-arquivo',
        erro: `O nome do arquivo indica ${nomeMes}, mas nenhuma resposta válida desse mês foi encontrada.`
      };
    }
    return { competencia: `${principal[0]}-${mesNome}`, origem: 'nome-arquivo', erro: '' };
  }

  const datasUnicas = new Set(datas);
  if (datasUnicas.size < 8) return { competencia: '', origem: '', erro: '' };

  const contagem = datas.reduce((acc, data) => {
    const competencia = data.slice(0, 7);
    acc[competencia] = (acc[competencia] || 0) + 1;
    return acc;
  }, {});
  const principal = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
  const total = datas.length;
  if (principal && total > 0 && principal[1] / total >= 0.80) {
    return { competencia: principal[0], origem: 'conteudo-dominante', erro: '' };
  }
  return { competencia: '', origem: '', erro: '' };
}

function processarPlanilhaMoki(sheets, opcoes = {}) {
  const extracaoOriginal = extrairRespostasMoki(sheets);
  const competenciaInfo = detectarCompetenciaArquivo(opcoes.fileName || '', extracaoOriginal.respostas);
  if (competenciaInfo.erro) throw new Error(competenciaInfo.erro);

  let respostas = [...extracaoOriginal.respostas];
  let rawData = [...extracaoOriginal.rawData];
  const respostasForaCompetencia = [];
  const rawDataForaCompetencia = [];

  if (competenciaInfo.competencia) {
    respostas = respostas.filter((item) => {
      const dentro = String(item.data || '').startsWith(`${competenciaInfo.competencia}-`);
      if (!dentro) respostasForaCompetencia.push(item);
      return dentro;
    });
    rawData = rawData.filter((item) => {
      const dentro = String(item.data || '').startsWith(`${competenciaInfo.competencia}-`);
      if (!dentro) rawDataForaCompetencia.push(item);
      return dentro;
    });
  }

  if (!respostas.length) {
    throw new Error(
      competenciaInfo.competencia
        ? `Nenhuma resposta válida pertence à competência ${formatarCompetencia(competenciaInfo.competencia)}.`
        : 'Nenhuma resposta corresponde às rotinas cadastradas no sistema.'
    );
  }

  const extracao = {
    ...extracaoOriginal,
    respostas,
    rawData,
    respostasForaCompetencia,
    rawDataForaCompetencia,
    competenciaArquivo: competenciaInfo.competencia,
    competenciaOrigem: competenciaInfo.origem
  };
  const datas = [...new Set(respostas.map((item) => item.data).filter(Boolean))].sort();
  if (!datas.length) throw new Error('Nenhuma data válida foi encontrada na competência da planilha.');

  const respostasUnicas = mesclarRespostas(respostas);
  const duplicadasRemovidas = Math.max(0, respostas.length - respostasUnicas.length);
  const resultados = [];
  const foraDaProgramacao = [];

  datas.forEach((data) => {
    const gerado = gerarResultadosBaseParaData(data, respostas);
    resultados.push(...gerado.resultados);
    foraDaProgramacao.push(...gerado.foraDaProgramacao);
  });

  return {
    ...extracao,
    datas,
    respostasUnicas,
    duplicadasRemovidas,
    resultados,
    foraDaProgramacao,
    resumo: resumirResultadosImportacao(resultados)
  };
}

function normalizarRegistrosImportados(sheets) {
  return processarPlanilhaMoki(sheets).resultados;
}

function parseCsv(texto) {
  const linhas = [];
  let atual = '';
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i];
    const next = texto[i + 1];
    if (char === '"') {
      if (aspas && next === '"') { atual += '"'; i += 1; } else { aspas = !aspas; }
      continue;
    }
    if (!aspas && (char === ';' || char === ',' || char === '\t')) { linha.push(atual.trim()); atual = ''; continue; }
    if (!aspas && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      if (atual.length || linha.length) { linha.push(atual.trim()); linhas.push(linha); linha = []; atual = ''; }
      continue;
    }
    atual += char;
  }
  if (atual.length || linha.length) { linha.push(atual.trim()); linhas.push(linha); }
  return { Rotinas: linhas };
}

function lerUint16LE(view, offset) { return view.getUint16(offset, true); }
function lerUint32LE(view, offset) { return view.getUint32(offset, true); }

async function extrairZipEntries(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder();
  const entries = {};
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { eocdOffset = i; break; }
  }
  if (eocdOffset < 0) throw new Error('Arquivo XLSX inválido.');

  const centralDirOffset = lerUint32LE(view, eocdOffset + 16);
  const totalEntries = lerUint16LE(view, eocdOffset + 10);
  let pointer = centralDirOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    if (lerUint32LE(view, pointer) !== 0x02014b50) throw new Error('Estrutura ZIP não reconhecida.');
    const compression = lerUint16LE(view, pointer + 10);
    const compressedSize = lerUint32LE(view, pointer + 20);
    const fileNameLength = lerUint16LE(view, pointer + 28);
    const extraLength = lerUint16LE(view, pointer + 30);
    const commentLength = lerUint16LE(view, pointer + 32);
    const localHeaderOffset = lerUint32LE(view, pointer + 42);
    const fileName = decoder.decode(bytes.slice(pointer + 46, pointer + 46 + fileNameLength));
    const localNameLength = lerUint16LE(view, localHeaderOffset + 26);
    const localExtraLength = lerUint16LE(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

    let contentBytes;
    if (compression === 0) {
      contentBytes = compressedData;
    } else if (compression === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Seu navegador não suporta importação XLSX nativa. Use CSV ou um navegador mais recente.');
      const stream = new Blob([compressedData]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const response = new Response(stream);
      contentBytes = new Uint8Array(await response.arrayBuffer());
    } else {
      throw new Error(`Método de compressão não suportado: ${compression}`);
    }

    entries[fileName] = decoder.decode(contentBytes);
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function decodeXml(xml) {
  return String(xml || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si[\s\S]*?<\/si>/g)].map((item) => {
    const partes = [...item[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((parte) => decodeXml(parte[1]));
    return partes.join('');
  });
}

function columnToIndex(col) {
  return col.split('').reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
}

function parseWorksheet(xml, sharedStrings) {
  const rows = [];
  const rowMatches = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
  rowMatches.forEach((rowMatch) => {
    const row = [];
    const cells = [...rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)];
    cells.forEach((cellMatch) => {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = (attrs.match(/r="([A-Z]+)\d+"/) || [])[1];
      const type = (attrs.match(/t="([^"]+)"/) || [])[1];
      const inline = body.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);
      const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/);
      const index = ref ? columnToIndex(ref) : row.length;
      let value = '';
      if (inline) value = decodeXml(inline[1]);
      else if (valueMatch) {
        value = decodeXml(valueMatch[1]);
        if (type === 's') value = sharedStrings[Number(value)] || '';
        else if (type !== 'str' && type !== 'inlineStr' && /^-?\d+(?:\.\d+)?$/.test(value)) value = Number(value);
      }
      row[index] = value;
    });
    rows.push(row.map((item) => item ?? ''));
  });
  return rows;
}

async function parseXlsx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const entries = await extrairZipEntries(arrayBuffer);
  const workbookXml = entries['xl/workbook.xml'];
  const relsXml = entries['xl/_rels/workbook.xml.rels'];
  const sharedStrings = parseSharedStrings(entries['xl/sharedStrings.xml']);
  if (!workbookXml || !relsXml) throw new Error('Workbook XLSX inválido.');

  const rels = Object.fromEntries([...relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => {
    const target = match[2].replace(/^\.\//, '').replace(/^\//, '');
    const normalizado = target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\.\//, '')}`;
    return [match[1], normalizado];
  }));
  const sheets = {};
  [...workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].forEach((match) => {
    const nome = decodeXml(match[1]);
    const path = rels[match[2]];
    if (path && entries[path]) sheets[nome] = parseWorksheet(entries[path], sharedStrings);
  });
  return sheets;
}

let previewsImportacao = [];
let historicoPlanilhasAgrupadoAtual = new Map();

function obterNomeAbaRotinas(sheets = {}) {
  return Object.keys(sheets).find((nome) => slug(nome).includes('rotina')) || Object.keys(sheets)[0] || '';
}

function gerarLinhasPreviewMoki(processamento, limite = 8) {
  const mapaResultados = new Map(
    processamento.resultados
      .filter((item) => item.status === 'realizada')
      .map((item) => [chaveResposta(item.data, item.loja, item.rotinaId), item])
  );

  return processamento.respostas.slice(0, limite).map((resposta) => {
    const resultado = mapaResultados.get(chaveResposta(resposta.data, resposta.loja, resposta.rotinaId));
    return {
      data: resposta.data.split('-').reverse().join('/'),
      checklist: resposta.rotina,
      loja: resposta.loja,
      hora: resposta.horaRealizada,
      resultado: resultado?.pontualidadeLabel || 'Realizada'
    };
  });
}

function resumirVariacoesReconhecidas(lista = [], limite = 12) {
  const grupos = new Map();
  lista.forEach((item) => {
    const original = String(item.checklist || '').trim();
    const rotina = String(item.rotinaReconhecida || '').trim();
    const chave = `${slugChecklist(original)}|${item.rotinaId || ''}`;
    if (!chave || !original) return;
    const atual = grupos.get(chave) || {
      original,
      rotina,
      horarioFimAplicado: item.horarioFimAplicado || '',
      quantidade: 0
    };
    atual.quantidade += 1;
    grupos.set(chave, atual);
  });
  return [...grupos.values()]
    .sort((a, b) => b.quantidade - a.quantidade || a.original.localeCompare(b.original, 'pt-BR'))
    .slice(0, limite);
}

function renderizarPreviewImportacao() {
  const container = document.getElementById('importPreviewList');
  const resumo = document.getElementById('selectedFilesSummary');
  if (!container || !resumo) return;

  if (!previewsImportacao.length) {
    resumo.textContent = 'Nenhuma planilha selecionada.';
    container.innerHTML = '<div class="empty-state">Selecione uma ou mais planilhas Moki para visualizar a prévia antes de importar.</div>';
    return;
  }

  const arquivosValidos = previewsImportacao.filter((item) => !item.error);
  resumo.textContent = `${previewsImportacao.length} arquivo(s) selecionado(s) • ${arquivosValidos.length} pronto(s) para importação.`;

  container.innerHTML = previewsImportacao.map((item) => {
    if (item.error) {
      return `<div class="preview-card preview-card-error"><div class="preview-card-head"><strong>${escaparHtml(item.fileName)}</strong><span class="status-tag">Falha na leitura</span></div><div class="admin-feedback">${escaparHtml(item.error)}</div></div>`;
    }

    const resumoItem = item.processamento.resumo;
    const linhasPreview = gerarLinhasPreviewMoki(item.processamento);
    const body = linhasPreview.length
      ? `<tbody>${linhasPreview.map((linha) => `<tr>
          <td>${escaparHtml(linha.data)}</td>
          <td>${escaparHtml(linha.checklist)}</td>
          <td>${escaparHtml(linha.loja)}</td>
          <td>${escaparHtml(linha.hora)}</td>
          <td>${escaparHtml(linha.resultado)}</td>
        </tr>`).join('')}</tbody>`
      : '<tbody><tr><td colspan="5">Sem respostas reconhecidas para pré-visualizar.</td></tr></tbody>';

    const avisos = [];
    if (item.processamento.naoReconhecidos.length) avisos.push(`${item.processamento.naoReconhecidos.length} checklist(s) não reconhecido(s)`);
    if (item.processamento.variacoesReconhecidas?.length) avisos.push(`${item.processamento.variacoesReconhecidas.length} variação(ões) histórica(s) reconhecida(s)`);
    if (item.processamento.linhasInvalidas.length) avisos.push(`${item.processamento.linhasInvalidas.length} linha(s) inválida(s)`);
    if (item.processamento.naoEncerrados.length) avisos.push(`${item.processamento.naoEncerrados.length} resposta(s) em aberto ignorada(s)`);
    if (item.processamento.datasDivergentes.length) avisos.push(`${item.processamento.datasDivergentes.length} resposta(s) com data de início divergente`);
    if (item.processamento.lojasNaoAtivas.length) avisos.push(`${item.processamento.lojasNaoAtivas.length} resposta(s) de loja não ativa`);
    if (item.processamento.datasForaPeriodo?.length) avisos.push(`${item.processamento.datasForaPeriodo.length} resposta(s) encerrada(s) de data isolada ignorada(s)`);
    if (item.processamento.respostasForaCompetencia?.length) avisos.push(`${item.processamento.respostasForaCompetencia.length} resposta(s) encerrada(s) fora da competência ignorada(s)`);
    if (item.processamento.rawDataForaCompetencia?.length) avisos.push(`${item.processamento.rawDataForaCompetencia.length} linha(s) bruta(s) fora da competência bloqueada(s)`);
    if (item.processamento.duplicadasRemovidas) avisos.push(`${item.processamento.duplicadasRemovidas} linha(s) repetida(s) consolidadas pelo último horário`);
    if (item.processamento.foraDaProgramacao.length) avisos.push(`${item.processamento.foraDaProgramacao.length} resposta(s) fora da programação`);

    const variacoes = resumirVariacoesReconhecidas(item.processamento.variacoesReconhecidas || []);
    const variacoesHtml = variacoes.length ? `<details class="preview-variation-details">
      <summary>Ver variações históricas reconhecidas (${item.processamento.variacoesReconhecidas.length})</summary>
      <div class="preview-variation-list">${variacoes.map((variacao) => `<div class="preview-variation-item">
        <strong>${formatarNumero.format(variacao.quantidade)}×</strong>
        <span><b>${escaparHtml(variacao.original)}</b> → ${escaparHtml(variacao.rotina)}${variacao.horarioFimAplicado ? ` • limite aplicado: ${escaparHtml(variacao.horarioFimAplicado)}` : ''}</span>
      </div>`).join('')}</div>
    </details>` : '';

    return `<div class="preview-card">
      <div class="preview-card-head">
        <div>
          <strong>${escaparHtml(item.fileName)}</strong>
          <div class="preview-meta">${item.processamento.respostas.length} linha(s) encerrada(s) reconhecida(s) • ${item.processamento.respostasUnicas?.length || 0} rotina(s) única(s) • ${item.processamento.datas.length} data(s) • aba ${escaparHtml(item.sheetName || 'principal')}</div>
        </div>
        <span class="status-tag">${item.processamento.competenciaArquivo ? `Competência: ${escaparHtml(formatarCompetencia(item.processamento.competenciaArquivo))}` : 'Pronta'}</span>
      </div>
      <div class="import-result-summary">
        <span><strong>${resumoItem.previstas}</strong> previstas</span>
        <span><strong>${resumoItem.realizadas}</strong> realizadas</span>
        <span><strong>${resumoItem.atrasadas}</strong> em atraso</span>
        <span><strong>${resumoItem.pendentes}</strong> pendentes</span>
      </div>
      ${avisos.length ? `<div class="admin-feedback">${escaparHtml(avisos.join(' • '))}</div>` : ''}
      ${variacoesHtml}
      <div class="table-shell preview-table-shell">
        <table>
          <thead><tr><th>Data</th><th>Checklist</th><th>Loja</th><th>Hora</th><th>Resultado</th></tr></thead>
          ${body}
        </table>
      </div>
    </div>`;
  }).join('');
}

async function montarPreviewArquivos() {
  const arquivos = Array.from(fileInput?.files || []);
  previewsImportacao = [];
  renderizarPreviewImportacao();

  if (!arquivos.length) {
    setImportStatus('Selecione uma ou mais planilhas de checklist do Moki.', 'Sem arquivo');
    return;
  }

  setImportStatus(
    arquivos.length === 1 ? `Lendo ${arquivos[0].name} para pré-visualização...` : `Lendo ${arquivos.length} planilhas para pré-visualização...`,
    'Preparando prévia'
  );

  for (const arquivo of arquivos) {
    try {
      const sheets = /\.csv$/i.test(arquivo.name) ? parseCsv(await arquivo.text()) : await parseXlsx(arquivo);
      const processamento = processarPlanilhaMoki(sheets, { fileName: arquivo.name });
      const sheetName = processamento.nomeAba || obterNomeAbaRotinas(sheets);
      previewsImportacao.push({
        fileName: arquivo.name,
        processamento,
        respostas: processamento.respostas,
        resultados: processamento.resultados,
        rawData: processamento.rawData,
        total: processamento.resultados.length,
        latestDate: processamento.datas.at(-1) || '',
        sheetName
      });
    } catch (error) {
      previewsImportacao.push({
        fileName: arquivo.name,
        error: error?.message || 'Não foi possível ler a planilha selecionada.'
      });
    }
  }

  renderizarPreviewImportacao();

  const validos = previewsImportacao.filter((item) => !item.error).length;
  if (validos) {
    setImportStatus(
      validos === 1
        ? 'Pré-visualização pronta. Revise os resultados e clique em “Importar agora”.'
        : `Pré-visualização pronta para ${validos} planilha(s). Revise os resultados e clique em “Importar agora”.`,
      'Prévia pronta'
    );
  } else {
    setImportStatus('Nenhuma das planilhas selecionadas pôde ser lida como relatório de checklist do Moki.', 'Falha na prévia');
  }
}


function dataExpiracaoDadosBrutos(importedAt = new Date()) {
  const data = importedAt instanceof Date ? new Date(importedAt) : new Date(importedAt);
  data.setDate(data.getDate() + PRAZO_DADOS_BRUTOS_DIAS);
  return data.toISOString();
}

function substituirSnapshotLocal(snapshot) {
  const atualizarLista = (lista) => {
    const indice = lista.findIndex((item) => item.id === snapshot.id);
    if (indice >= 0) lista.splice(indice, 1, snapshot);
    else lista.push(snapshot);
    lista.sort((a, b) => String(b.latestDate || '').localeCompare(String(a.latestDate || '')));
  };

  atualizarLista(snapshotsRecentes);
  snapshotsRecentes = snapshotsRecentes.slice(0, LIMITE_DIAS_DETALHES_INICIAIS);
  snapshotsSobDemanda = snapshotsSobDemanda.filter((item) => item.id !== snapshot.id);

  const resumo = normalizarResumoDiario(snapshot);
  if (resumo) {
    resumosDiarios = [resumo, ...resumosDiarios.filter((item) => item.id !== resumo.id)]
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate))
      .slice(0, LIMITE_RESUMOS_HISTORICOS);
  }

  recomporSnapshotsAtivos();
}

function agruparItensPorData(lista = []) {
  return lista.reduce((mapa, item) => {
    const data = formatarData(item?.data);
    if (!data) return mapa;
    if (!mapa.has(data)) mapa.set(data, []);
    mapa.get(data).push(item);
    return mapa;
  }, new Map());
}

function hashTextoSimples(texto = '') {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function gerarImportBatchId(fileName, importedAt, indice = 0) {
  return `import-${String(importedAt).replace(/[^0-9]/g, '').slice(0, 17)}-${indice}-${hashTextoSimples(fileName)}`;
}

function dataDentroPrazoDeBruto(dataIso) {
  const data = dataIsoParaDate(dataIso);
  if (!data) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() - PRAZO_DADOS_BRUTOS_DIAS);
  return data >= limite;
}

async function restaurarSnapshotAnterior(snapshotAnterior, snapshotId) {
  if (!firebaseDisponivel) return true;
  if (snapshotAnterior && Array.isArray(snapshotAnterior.data)) {
    return salvarSnapshotNoFirebaseVerificado(snapshotAnterior, 1);
  }
  return excluirSnapshotNoFirebase(snapshotId);
}

async function importarArquivo() {
  const arquivos = Array.from(fileInput?.files || []);
  if (!arquivos.length) {
    setImportStatus('Selecione pelo menos um arquivo .xlsx, .xlsm ou .csv do Moki.');
    return;
  }

  if (!previewsImportacao.length) await montarPreviewArquivos();
  const previewsValidas = previewsImportacao.filter((item) => !item.error && Array.isArray(item.respostas));
  if (!previewsValidas.length) {
    setImportStatus('Nenhuma planilha Moki válida ficou pronta para importação.', 'Falha na importação');
    return;
  }

  let arquivosImportados = 0;
  let datasImportadas = 0;
  let sincronizadas = 0;
  let totalPrevistas = 0;
  let totalRealizadas = 0;
  let totalAtrasadas = 0;
  let totalPendentes = 0;
  let totalForaCompetencia = 0;
  const erros = [];
  const respostasEfetivamenteImportadas = [];

  for (let indiceArquivo = 0; indiceArquivo < previewsValidas.length; indiceArquivo += 1) {
    const preview = previewsValidas[indiceArquivo];
    const respostasArquivo = mesclarRespostas(preview.respostas || []);
    const rawArquivo = Array.isArray(preview.rawData) ? preview.rawData : [];
    const gruposRespostas = agruparItensPorData(respostasArquivo);
    const gruposRaw = agruparItensPorData(rawArquivo);
    const datas = [...gruposRespostas.keys()].sort();
    if (!datas.length) {
      erros.push(`${preview.fileName}: nenhuma data válida`);
      continue;
    }

    const importadoEm = new Date().toISOString();
    const importBatchId = gerarImportBatchId(preview.fileName, importadoEm, indiceArquivo);
    const foraCompetencia = preview.processamento?.respostasForaCompetencia?.length || 0;
    totalForaCompetencia += foraCompetencia;
    let arquivoCompleto = true;

    for (let indiceData = 0; indiceData < datas.length; indiceData += 1) {
      const data = datas[indiceData];
      setImportStatus(
        `${preview.fileName}: processando ${indiceData + 1} de ${datas.length} datas (${data.split('-').reverse().join('/')})...`,
        'Importando e conferindo'
      );

      const respostasData = gruposRespostas.get(data) || [];
      const gerado = gerarResultadosBaseParaData(data, respostasData);
      const resultados = normalizarBaseCompleta(gerado.resultados, 'importada');
      const summary = resumirResultadosImportacao(resultados);
      const snapshotId = `rotinas-${data}`;
      const rawDataDiaCompleto = gruposRaw.get(data) || [];
      const manterRaw = dataDentroPrazoDeBruto(data);
      const respostasPersistidas = gerado.respostasMescladas.map(compactarRespostaParaPersistencia);
      const snapshotAnterior = await carregarSnapshotCompletoPorId(snapshotId);
      const snapshot = {
        id: snapshotId,
        fileName: preview.fileName,
        importedAt: importadoEm,
        importBatchId,
        importBatchImportedAt: importadoEm,
        sourceCompetence: preview.processamento?.competenciaArquivo || '',
        sourceCompetenceOrigin: preview.processamento?.competenciaOrigem || '',
        sourceFileRows: Number(preview.processamento?.rawData?.length || 0) + Number(preview.processamento?.rawDataForaCompetencia?.length || 0),
        sourceRecognizedRows: preview.processamento?.respostas?.length || 0,
        sourceOutsideCompetenceCount: foraCompetencia,
        sourceDatesCount: datas.length,
        total: resultados.length,
        responsesCount: respostasPersistidas.length,
        latestDate: data,
        data: respostasPersistidas,
        dataKind: 'responses',
        rawData: manterRaw ? rawDataDiaCompleto : undefined,
        rawRowsCount: manterRaw ? rawDataDiaCompleto.length : 0,
        rawExpiresAt: manterRaw ? dataExpiracaoDadosBrutos(importadoEm) : '',
        rawAvailable: manterRaw,
        rawDeletedAt: manterRaw ? '' : importadoEm,
        summary,
        chunksCount: 0,
        rawChunksCount: 0,
        schemaVersion: RESULT_SCHEMA_VERSION
      };

      const sincronizado = firebaseDisponivel
        ? await salvarSnapshotNoFirebaseVerificado(snapshot)
        : true;

      if (!sincronizado) {
        arquivoCompleto = false;
        await restaurarSnapshotAnterior(snapshotAnterior, snapshotId);
        erros.push(`${preview.fileName} • ${data.split('-').reverse().join('/')}: falha na gravação ou conferência; o resultado anterior foi preservado`);
        continue;
      }

      const snapshotMemoria = firebaseDisponivel ? { ...snapshot, rawData: undefined } : snapshot;
      substituirSnapshotLocal(snapshotMemoria);
      respostasEfetivamenteImportadas.push(...respostasData);
      datasImportadas += 1;
      if (firebaseDisponivel) sincronizadas += 1;
      totalPrevistas += summary.previstas;
      totalRealizadas += summary.realizadas;
      totalAtrasadas += summary.atrasadas;
      totalPendentes += summary.pendentes;
    }

    if (arquivoCompleto) arquivosImportados += 1;
  }

  const usoRotinasAtualizado = registrarUsoRotinas(respostasEfetivamenteImportadas);
  if (usoRotinasAtualizado) {
    salvarStore(STORAGE_KEYS.routineConfig, configRotinas);
    await salvarConfigNoFirebase();
  }

  compactarMemoriaOperacional();
  atualizarBasePorSnapshots(
    `${totalPrevistas} rotinas previstas • ${totalRealizadas} realizadas • ${totalAtrasadas} em atraso • ${totalPendentes} pendentes. O sistema liberou automaticamente os detalhes que não precisam permanecer na memória.`
  );

  renderizarPreviewImportacao();
  limparDadosBrutosExpirados();

  const protecaoTexto = totalForaCompetencia
    ? ` ${totalForaCompetencia} resposta(s) fora da competência foram bloqueadas e não substituíram outras datas.`
    : '';
  if (!erros.length) {
    setImportStatus(
      `${arquivosImportados} planilha(s) e ${datasImportadas} dia(s) processado(s) e conferido(s): ${totalRealizadas} realizadas, ${totalAtrasadas} em atraso e ${totalPendentes} pendentes.${protecaoTexto}`,
      firebaseDisponivel ? 'Importado, conferido e sincronizado' : 'Importado localmente'
    );
    return;
  }

  setImportStatus(
    `${datasImportadas} dia(s) concluído(s). ${sincronizadas} sincronizado(s) online. ${erros.join(' | ')}${protecaoTexto}`,
    sincronizadas ? 'Importação parcial' : 'Falha na importação'
  );
}

async function resetarParaSimulada() {
  const idsAnteriores = snapshotsImportados.map((snapshot) => snapshot.id).filter(Boolean);
  const totalAnterior = snapshotsImportados.length;
  snapshotsImportados = [];
  snapshotsRecentes = [];
  snapshotsSobDemanda = [];
  resumosDiarios = [];
  periodoSobDemandaAtual = { dataInicial: '', dataFinal: '' };
  invalidarCacheDados();
  persistirSnapshotsLocais();
  if (fileInput) fileInput.value = '';
  previewsImportacao = [];
  renderizarPreviewImportacao();
  atualizarBasePorSnapshots('Painel limpo com sucesso.');

  const remotoLimpo = await limparSnapshotsNoFirebase();
  setImportStatus(
    remotoLimpo
      ? 'Painel limpo com sucesso. A atualização foi enviada para todos os usuários.'
      : totalAnterior
        ? 'Painel limpo com sucesso neste dispositivo. A sincronização online não pôde ser concluída agora.'
        : 'Painel já estava limpo.',
    'Painel zerado'
  );
}

function aplicarRegrasAdministrativasNaBaseAtual() {
  const temSnapshots = snapshotsImportados.length > 0;
  invalidarCacheDados();
  registrosBase = temSnapshots ? consolidarSnapshotsImportados() : normalizarBaseCompleta(registrosSimulados, 'simulada');
  persistirSnapshotsLocais();
  aplicarBase(registrosBase, temSnapshots ? 'importada' : 'simulada', importSummary?.textContent || 'Base atualizada.');
}

function obterContagemRegionais() {
  return LOJAS_ATIVAS.reduce((acc, loja) => {
    const regionalId = resolverRegional(loja.nome, loja.codigo).id;
    acc[regionalId] = (acc[regionalId] || 0) + 1;
    return acc;
  }, {});
}

function atualizarResumoAdmin() {
  const adminSummary = document.getElementById('adminSummary');
  const totalDiasHistorico = obterHistoricoLeve().length;
  const contagens = obterContagemRegionais();
  const semRegional = contagens.sem_regional || 0;
  const ultimo = obterHistoricoLeve()[0];
  const ultimaImportacao = ultimo?.latestDate ? ultimo.latestDate.split('-').reverse().join('/') : 'Nenhuma';

  if (adminSummary) adminSummary.textContent = `${LOJAS_ATIVAS.length} unidades ativas • ${configRotinas.filter((item) => statusAdministrativoRotina(item).id !== 'inativa').length} rotinas • ${totalDiasHistorico} dia(s) no histórico.`;

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText('adminKpiUnidades', formatarNumero.format(LOJAS_ATIVAS.length));
  setText('adminKpiSemRegional', formatarNumero.format(semRegional));
  setText('adminKpiRotinas', formatarNumero.format(configRotinas.filter((item) => statusAdministrativoRotina(item).id !== 'inativa').length));
  setText('adminKpi12x36', formatarNumero.format(CODIGOS_LOJAS_12X36.size));
  setText('adminKpiUltimaImportacao', ultimaImportacao);
  setText('adminKpiFirebase', firebaseDisponivel ? 'Online' : 'Modo local');
  setText('adminKpiDiasHistorico', formatarNumero.format(totalDiasHistorico));
  setText('adminKpiDetalhes', formatarNumero.format(snapshotsImportados.length));

  const sync = document.getElementById('adminSyncStatus');
  if (sync) {
    sync.textContent = firebaseDisponivel ? '● Firebase online' : '● Modo local';
    sync.classList.toggle('offline', !firebaseDisponivel);
  }

  const alerts = document.getElementById('adminAlerts');
  if (alerts) {
    const itens = [];
    if (!regionalMapRevisado) itens.push({ tipo: 'warn', titulo: 'Divisão regional aguardando confirmação', texto: 'A classificação inicial foi criada a partir da estrutura operacional atual. Revise e salve a seção Regionais.' });
    if (semRegional) itens.push({ tipo: 'warn', titulo: `${semRegional} unidade(s) sem regional`, texto: 'Classifique as unidades na seção Regionais para evitar resultados fora das abas.' });
    const semHorario = configRotinas.filter((rotina) => !rotina.horarioInicio && !rotina.horarioFim).length;
    if (semHorario) itens.push({ tipo: 'info', titulo: `${semHorario} rotina(s) sem limite de horário`, texto: 'Essas rotinas contam como realizadas, mas não recebem classificação de atraso.' });
    const expirando = snapshotsImportados.filter((snapshot) => snapshot.rawAvailable !== false && snapshot.rawExpiresAt && new Date(snapshot.rawExpiresAt).getTime() - Date.now() < 86400000 && new Date(snapshot.rawExpiresAt).getTime() > Date.now()).length;
    if (expirando) itens.push({ tipo: 'info', titulo: `${expirando} arquivo(s) bruto(s) expiram em até 24h`, texto: 'Os resultados processados continuarão preservados.' });
    if (!itens.length) itens.push({ tipo: 'ok', titulo: 'Nenhuma pendência crítica', texto: 'As configurações principais estão completas.' });
    alerts.innerHTML = itens.map((item) => `<div class="admin-alert-item ${item.tipo}"><span>${item.tipo === 'ok' ? '✓' : item.tipo === 'warn' ? '!' : 'i'}</span><div><strong>${escaparHtml(item.titulo)}</strong><small>${escaparHtml(item.texto)}</small></div></div>`).join('');
  }

  const overview = document.getElementById('adminRegionalOverviewCards');
  if (overview) {
    overview.innerHTML = REGIONAIS.map((regional) => {
      const quantidade = contagens[regional.id] || 0;
      const pct = Math.round((quantidade / Math.max(1, LOJAS_ATIVAS.length)) * 100);
      return `<div class="admin-regional-card"><div><span>${escaparHtml(regional.nome)}</span><strong>${quantidade} unidades</strong></div><div class="admin-regional-progress"><i style="width:${pct}%"></i></div><small>${pct}% do cadastro ativo</small></div>`;
    }).join('');
  }
}

function dataLocalIso(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function gerarIdRotina(nome = 'rotina') {
  const base = slug(nome).replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'nova';
  let id = `rotina-${base}-${Date.now().toString(36)}`;
  let contador = 2;
  while (configRotinas.some((item) => item.id === id)) id = `rotina-${base}-${Date.now().toString(36)}-${contador++}`;
  return id;
}

function rotinaPossuiHistorico(rotinaId) {
  const rotina = obterConfigRotinaPorId(rotinaId);
  if (rotina?.firstUsedAt) return true;
  return snapshotsImportados.some((snapshot) => Array.isArray(snapshot.data) && snapshot.data.some((item) => item?.rotinaId === rotinaId));
}

function formatarVigenciaRotina(rotina) {
  const inicio = rotina.vigenciaInicio ? rotina.vigenciaInicio.split('-').reverse().join('/') : 'Desde o início';
  const fim = rotina.vigenciaFim ? rotina.vigenciaFim.split('-').reverse().join('/') : 'sem data final';
  return `${inicio} • ${fim}`;
}

function renderTabelaRotinasAdmin() {
  const tbody = document.getElementById('adminRoutinesTable');
  if (!tbody) return;
  const busca = slugChecklist(document.getElementById('adminRoutineSearch')?.value || '');
  const filtro = document.getElementById('adminRoutineStatusFilter')?.value || '';
  const hoje = dataLocalIso();
  const rotinas = configRotinas.filter((rotina) => {
    const status = statusAdministrativoRotina(rotina, hoje).id;
    const texto = slugChecklist([rotina.id, rotina.nome, rotina.nomeMoki, ...(rotina.aliases || [])].join(' '));
    return (!busca || texto.includes(busca)) && (!filtro || status === filtro);
  });

  if (!rotinas.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Nenhuma rotina corresponde aos filtros.</div></td></tr>';
    return;
  }

  tbody.innerHTML = rotinas.map((rotina) => {
    const status = statusAdministrativoRotina(rotina, hoje);
    const historico = rotinaPossuiHistorico(rotina.id);
    const podeExcluir = rotina.origem !== 'padrao' && !historico;
    return `<tr>
      <td><div class="routine-name-cell"><strong>${escaparHtml(rotina.nome)}</strong><small>${escaparHtml(rotina.nomeMoki)}</small><code>${escaparHtml(rotina.id)}</code></div></td>
      <td>${escaparHtml(formatarDiasRotina(rotina.dias))}</td>
      <td>${escaparHtml(formatarEscopoRotina(rotina.escopo))}</td>
      <td><span class="routine-vigencia">${escaparHtml(formatarVigenciaRotina(rotina))}</span></td>
      <td><span class="status-tag ${status.id === 'ativa' ? 'success' : status.id === 'agendada' ? '' : 'muted'}">${escaparHtml(status.label)}</span></td>
      <td><div class="routine-row-actions">
        <button class="btn btn-secondary btn-compact" type="button" data-routine-action="edit" data-id="${escaparHtml(rotina.id)}">Editar</button>
        <button class="btn btn-secondary btn-compact" type="button" data-routine-action="duplicate" data-id="${escaparHtml(rotina.id)}">Duplicar</button>
        ${status.id !== 'inativa' ? `<button class="btn btn-secondary btn-compact" type="button" data-routine-action="deactivate" data-id="${escaparHtml(rotina.id)}">Desativar</button>` : ''}
        ${podeExcluir ? `<button class="btn btn-danger btn-compact" type="button" data-routine-action="delete" data-id="${escaparHtml(rotina.id)}">Excluir</button>` : ''}
      </div></td>
    </tr>`;
  }).join('');
}

function definirDiasEditor(dias = []) {
  const ativos = new Set((Array.isArray(dias) ? dias : []).map(Number));
  document.querySelectorAll('input[name="routineDays"]').forEach((input) => { input.checked = ativos.has(Number(input.value)); });
}

function obterDiasEditor() {
  return [...document.querySelectorAll('input[name="routineDays"]:checked')]
    .map((input) => Number(input.value))
    .filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6)
    .sort((a, b) => a - b);
}

function abrirEditorRotina(rotinaId = '', duplicar = false) {
  const editor = document.getElementById('routineEditor');
  if (!editor) return;
  const origem = rotinaId ? obterConfigRotinaPorId(rotinaId) : null;
  const editando = Boolean(origem && !duplicar);
  const hoje = dataLocalIso();
  const rotina = origem ? { ...origem } : {
    nome: '', nomeMoki: '', aliases: [], horarioInicio: '', horarioFim: '', toleranciaInicioMin: 0,
    toleranciaFimMin: 0, dias: [1,2,3,4,5,6], escopo: 'todas', ativa: true,
    vigenciaInicio: hoje, vigenciaFim: '', origem: 'personalizada'
  };

  document.getElementById('routineEditorId').value = editando ? rotina.id : '';
  document.getElementById('routineName').value = duplicar ? `Cópia de ${rotina.nome}` : rotina.nome;
  document.getElementById('routineMokiName').value = duplicar ? '' : rotina.nomeMoki;
  document.getElementById('routineAliases').value = duplicar ? '' : (rotina.aliases || []).join('\n');
  document.getElementById('routineScope').value = rotina.escopo === '12x36' ? '12x36' : 'todas';
  document.getElementById('routineEffectiveStart').value = duplicar ? hoje : (editando ? (rotina.vigenciaInicio || '') : hoje);
  document.getElementById('routineEffectiveEnd').value = duplicar ? '' : (rotina.vigenciaFim || '');
  document.getElementById('routineStartTime').value = rotina.horarioInicio || '';
  document.getElementById('routineEndTime').value = rotina.horarioFim || '';
  document.getElementById('routineStartTolerance').value = rotina.toleranciaInicioMin ?? 0;
  document.getElementById('routineEndTolerance').value = rotina.toleranciaFimMin ?? 0;
  document.getElementById('routineActive').checked = duplicar ? true : rotina.ativa !== false;
  definirDiasEditor(rotina.dias);

  const title = document.getElementById('routineEditorTitle');
  const subtitle = document.getElementById('routineEditorSubtitle');
  if (title) title.textContent = editando ? 'Editar rotina' : (duplicar ? 'Duplicar rotina' : 'Nova rotina');
  if (subtitle) subtitle.textContent = editando
    ? 'Altere o nome, reconhecimento, dias, horários ou vigência sem perder o vínculo com o histórico.'
    : 'Cadastre uma nova rotina com data de início para não criar pendências retroativas.';

  const meta = document.getElementById('routineEditorMeta');
  if (meta) meta.innerHTML = editando
    ? `<span>ID permanente: <strong>${escaparHtml(rotina.id)}</strong></span><span>${rotinaPossuiHistorico(rotina.id) ? 'Possui histórico e não pode ser excluída definitivamente.' : 'Ainda não possui respostas importadas.'}</span>`
    : '<span>O sistema criará um código permanente automaticamente.</span>';

  document.getElementById('duplicateRoutineButton')?.classList.toggle('hidden', !editando);
  document.getElementById('deactivateRoutineButton')?.classList.toggle('hidden', !editando || statusAdministrativoRotina(rotina).id === 'inativa');
  document.getElementById('deleteRoutineButton')?.classList.toggle('hidden', !editando || rotina.origem === 'padrao' || rotinaPossuiHistorico(rotina.id));
  const feedback = document.getElementById('routineEditorFeedback');
  if (feedback) feedback.textContent = '';
  editor.classList.remove('hidden');
  editor.setAttribute('aria-hidden', 'false');
  editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('routineName')?.focus(), 50);
}

function fecharEditorRotina() {
  const editor = document.getElementById('routineEditor');
  if (!editor) return;
  editor.classList.add('hidden');
  editor.setAttribute('aria-hidden', 'true');
  const feedback = document.getElementById('routineEditorFeedback');
  if (feedback) feedback.textContent = '';
}

function validarConflitosRotina(candidata, idAtual = '') {
  const chaves = new Map();
  [candidata.nome, candidata.nomeMoki, ...(candidata.aliases || [])].forEach((valor) => {
    const chave = slugChecklist(valor);
    if (chave) chaves.set(chave, valor);
  });
  for (const rotina of configRotinas) {
    if (rotina.id === idAtual) continue;
    const existentes = [rotina.nome, rotina.nomeMoki, ...(rotina.aliases || [])];
    const conflito = existentes.find((valor) => chaves.has(slugChecklist(valor)));
    if (conflito) return `O nome “${conflito}” já está vinculado à rotina “${rotina.nome}”.`;
  }
  return '';
}

async function persistirRotinasEReprocessar(mensagem = 'Rotinas atualizadas.') {
  configRotinas = normalizarConfiguracoesRotinas(configRotinas);
  salvarStore(STORAGE_KEYS.routineConfig, configRotinas);
  invalidarCacheDados();
  const sincronizado = await salvarConfigNoFirebase();
  registrosBase = snapshotsImportados.length ? consolidarSnapshotsImportados() : normalizarBaseCompleta(registrosSimulados, 'simulada');
  aplicarBase(registrosBase, snapshotsImportados.length ? 'importada' : 'simulada', mensagem);
  renderTabelaRotinasAdmin();
  atualizarResumoAdmin();
  renderHistoricoPlanilhas();
  return sincronizado;
}

async function salvarRotinaAdmin() {
  const feedback = document.getElementById('routineEditorFeedback');
  const idAtual = document.getElementById('routineEditorId')?.value || '';
  const existente = idAtual ? obterConfigRotinaPorId(idAtual) : null;
  const nome = String(document.getElementById('routineName')?.value || '').trim().replace(/\s+/g, ' ');
  const nomeMoki = String(document.getElementById('routineMokiName')?.value || '').trim().replace(/\s+/g, ' ');
  const aliasesInformados = normalizarAliasesRotina(document.getElementById('routineAliases')?.value || '');
  const dias = obterDiasEditor();
  const escopo = document.getElementById('routineScope')?.value === '12x36' ? '12x36' : 'todas';
  const vigenciaInicio = normalizarDataIsoSimples(document.getElementById('routineEffectiveStart')?.value || '');
  let vigenciaFim = normalizarDataIsoSimples(document.getElementById('routineEffectiveEnd')?.value || '');
  const ativa = Boolean(document.getElementById('routineActive')?.checked);
  const horarioInicio = validarHorario(document.getElementById('routineStartTime')?.value);
  const horarioFim = validarHorario(document.getElementById('routineEndTime')?.value);
  const toleranciaInicioMin = limitarInteiro(document.getElementById('routineStartTolerance')?.value, 0, 1440);
  const toleranciaFimMin = limitarInteiro(document.getElementById('routineEndTolerance')?.value, 0, 1440);

  if (!nome || !nomeMoki) { if (feedback) feedback.textContent = 'Informe o nome exibido e o nome do checklist no Moki.'; return; }
  if (!dias.length) { if (feedback) feedback.textContent = 'Selecione pelo menos um dia da semana.'; return; }
  if (!vigenciaInicio && !existente) { if (feedback) feedback.textContent = 'Informe a data de início da vigência para a nova rotina.'; return; }
  if (existente && statusAdministrativoRotina(existente).id === 'inativa' && ativa) {
    if (feedback) feedback.textContent = 'Para reativar sem alterar o histórico, duplique esta rotina e informe uma nova data de início.';
    return;
  }
  if (!ativa && !vigenciaFim && (!vigenciaInicio || vigenciaInicio <= dataLocalIso())) vigenciaFim = dataLocalIso();
  if (vigenciaFim && vigenciaFim < vigenciaInicio) { if (feedback) feedback.textContent = 'A data final não pode ser anterior à data inicial.'; return; }
  if (horarioInicio && horarioFim && horarioParaMinutos(horarioInicio) > horarioParaMinutos(horarioFim)) { if (feedback) feedback.textContent = 'O horário de início não pode ser depois do horário de fim.'; return; }

  const aliases = [...aliasesInformados];
  if (existente) {
    [existente.nome, existente.nomeMoki].forEach((antigo) => {
      if (antigo && ![nome, nomeMoki].some((atual) => slugChecklist(atual) === slugChecklist(antigo))) aliases.push(antigo);
    });
  }

  const agora = new Date().toISOString();
  const candidata = normalizarRotinaConfigurada({
    ...(existente || {}),
    id: existente?.id || gerarIdRotina(nome),
    nome,
    nomeMoki,
    aliases: normalizarAliasesRotina(aliases),
    dias,
    escopo,
    vigenciaInicio,
    vigenciaFim,
    ativa,
    horarioInicio,
    horarioFim,
    toleranciaInicioMin,
    toleranciaFimMin,
    origem: existente?.origem || 'personalizada',
    ordem: existente?.ordem || (Math.max(0, ...configRotinas.map((item) => Number(item.ordem) || 0)) + 1),
    createdAt: existente?.createdAt || agora,
    updatedAt: agora,
    firstUsedAt: existente?.firstUsedAt || '',
    lastUsedAt: existente?.lastUsedAt || ''
  }, existente?.origem === 'padrao' ? ROTINAS_PADRAO.find((item) => item.id === existente.id) : null, existente?.ordem || configRotinas.length + 1);

  const conflito = validarConflitosRotina(candidata, existente?.id || '');
  if (conflito) { if (feedback) feedback.textContent = conflito; return; }

  if (existente) configRotinas = configRotinas.map((item) => item.id === existente.id ? candidata : item);
  else configRotinas = [...configRotinas, candidata];

  const sincronizado = await persistirRotinasEReprocessar(`Rotina “${nome}” salva e aplicada ao painel.`);
  if (feedback) feedback.textContent = sincronizado || !firebaseDisponivel
    ? `Rotina “${nome}” salva com sucesso.`
    : 'A rotina foi salva neste dispositivo, mas a sincronização online não foi concluída.';
  renderTabelaRotinasAdmin();
  setTimeout(fecharEditorRotina, 650);
}

async function desativarRotinaAdmin(rotinaId) {
  const rotina = obterConfigRotinaPorId(rotinaId);
  if (!rotina) return;
  const hoje = dataLocalIso();
  const aindaNaoIniciou = rotina.vigenciaInicio && rotina.vigenciaInicio > hoje;
  const dataFim = aindaNaoIniciou ? '' : hoje;
  const descricaoFim = aindaNaoIniciou ? 'antes de entrar em vigência' : `com vigência até ${dataFim.split('-').reverse().join('/')}`;
  if (!window.confirm(`Desativar “${rotina.nome}” ${descricaoFim}? O histórico anterior será preservado.`)) return;
  configRotinas = configRotinas.map((item) => item.id === rotinaId ? { ...item, ativa: false, vigenciaFim: item.vigenciaFim || dataFim, updatedAt: new Date().toISOString() } : item);
  await persistirRotinasEReprocessar(`Rotina “${rotina.nome}” desativada.`);
  fecharEditorRotina();
}

async function excluirRotinaAdmin(rotinaId) {
  const rotina = obterConfigRotinaPorId(rotinaId);
  if (!rotina) return;
  if (rotina.origem === 'padrao' || rotinaPossuiHistorico(rotinaId)) {
    const feedback = document.getElementById('routineManagerFeedback');
    if (feedback) feedback.textContent = 'Esta rotina possui histórico ou pertence ao cadastro original. Use “Desativar” para preservar os relatórios.';
    return;
  }
  if (!window.confirm(`Excluir definitivamente a rotina “${rotina.nome}”?`)) return;
  configRotinas = configRotinas.filter((item) => item.id !== rotinaId);
  await persistirRotinasEReprocessar(`Rotina “${rotina.nome}” excluída.`);
  fecharEditorRotina();
}

function registrarUsoRotinas(respostas = []) {
  const porRotina = new Map();
  respostas.forEach((resposta) => {
    if (!resposta?.rotinaId || !resposta?.data) return;
    const atual = porRotina.get(resposta.rotinaId) || { min: resposta.data, max: resposta.data };
    if (resposta.data < atual.min) atual.min = resposta.data;
    if (resposta.data > atual.max) atual.max = resposta.data;
    porRotina.set(resposta.rotinaId, atual);
  });
  if (!porRotina.size) return false;
  let mudou = false;
  configRotinas = configRotinas.map((rotina) => {
    const uso = porRotina.get(rotina.id);
    if (!uso) return rotina;
    mudou = true;
    return {
      ...rotina,
      firstUsedAt: rotina.firstUsedAt && rotina.firstUsedAt.slice(0, 10) <= uso.min ? rotina.firstUsedAt : `${uso.min}T00:00:00`,
      lastUsedAt: rotina.lastUsedAt && rotina.lastUsedAt.slice(0, 10) >= uso.max ? rotina.lastUsedAt : `${uso.max}T23:59:59`,
      updatedAt: new Date().toISOString()
    };
  });
  return mudou;
}


function formatarRegional(regionalId) {
  return REGIONAIS_POR_ID.get(regionalId)?.nome || 'Sem regional';
}

function renderTabelaRegionaisAdmin() {
  const tbody = document.getElementById('regionalUnitsTable');
  if (!tbody) return;
  const busca = slug(document.getElementById('adminRegionalSearch')?.value || '');
  const filtro = document.getElementById('adminRegionalFilter')?.value || '';
  const lojas = LOJAS_ATIVAS.filter((loja) => {
    const regionalId = resolverRegional(loja.nome, loja.codigo).id;
    const matchBusca = !busca || slug(`${loja.codigo} ${loja.nome}`).includes(busca);
    const matchFiltro = !filtro || regionalId === filtro;
    return matchBusca && matchFiltro;
  });
  if (!lojas.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Nenhuma unidade encontrada.</div></td></tr>';
    return;
  }
  tbody.innerHTML = lojas.map((loja) => {
    const regionalId = resolverRegional(loja.nome, loja.codigo).id;
    const options = [`<option value="sem_regional" ${regionalId === 'sem_regional' ? 'selected' : ''}>Sem regional</option>`, ...REGIONAIS.map((regional) => `<option value="${regional.id}" ${regional.id === regionalId ? 'selected' : ''}>${escaparHtml(regional.nome)}</option>`)].join('');
    return `<tr><td><span class="admin-code-pill">${escaparHtml(loja.codigo)}</span></td><td><strong>${escaparHtml(loja.nome)}</strong></td><td><select class="regional-row-select" data-code="${escaparHtml(loja.codigo)}">${options}</select></td><td>${CODIGOS_LOJAS_12X36.has(loja.codigo) ? '<span class="status-tag">Sim</span>' : '<span class="status-tag muted">Não</span>'}</td><td>${escaparHtml(resolverFormador(loja.nome))}</td></tr>`;
  }).join('');
}

function renderTabelaUnidadesAdmin() {
  const tbody = document.getElementById('adminUnitsTable');
  if (!tbody) return;
  tbody.innerHTML = LOJAS_ATIVAS.map((loja) => {
    const info = parseLoja(loja.nome);
    const regional = resolverRegional(loja.nome, loja.codigo);
    return `<tr><td><span class="admin-code-pill">${escaparHtml(loja.codigo)}</span></td><td><strong>${escaparHtml(loja.nome)}</strong></td><td>${escaparHtml(info.rede)}</td><td>${escaparHtml(regional.nome)}</td><td>${escaparHtml(resolverFormador(loja.nome))}</td><td>${CODIGOS_LOJAS_12X36.has(loja.codigo) ? 'Sim' : 'Não'}</td><td><span class="status-tag success">Ativa</span></td></tr>`;
  }).join('');
}

async function salvarRegionaisAdmin() {
  const selects = [...document.querySelectorAll('.regional-row-select[data-code]')];
  selects.forEach((select) => {
    const codigo = normalizarCodigoUnidade(select.dataset.code);
    const regionalId = select.value;
    if (REGIONAIS_POR_ID.has(regionalId) || regionalId === 'sem_regional') lojaRegionalMap[codigo] = regionalId;
    else lojaRegionalMap[codigo] = 'sem_regional';
  });
  lojaRegionalMap = sanitizarMapaRegionais(lojaRegionalMap);
  regionalMapRevisado = true;
  salvarStore(STORAGE_KEYS.storeRegionalMap, lojaRegionalMap);
  localStorage.setItem(STORAGE_KEYS.regionalMapReviewed, '1');
  const sincronizado = await salvarConfigNoFirebase();
  invalidarCacheDados();
  registrosBase = snapshotsImportados.length ? consolidarSnapshotsImportados() : normalizarBaseCompleta(registrosSimulados, 'simulada');
  aplicarBase(registrosBase, snapshotsImportados.length ? 'importada' : 'simulada', importSummary?.textContent || 'Regionais atualizadas.');
  renderTabelaRegionaisAdmin();
  renderTabelaUnidadesAdmin();
  atualizarResumoAdmin();
  const feedback = document.getElementById('regionalConfigFeedback');
  if (feedback) feedback.textContent = sincronizado || !firebaseDisponivel ? 'Regionais salvas com sucesso.' : 'Regionais salvas neste dispositivo, mas a sincronização online falhou.';
}

function popularControlesAdmin() {
  const lojas = obterLojasConhecidas();
  const formadores = [...new Set([...Object.values(lojaFormadorMap), ...registrosBase.map((item) => item.formador)].filter(ehFormadorAtivo))].sort();
  preencherSelect(document.getElementById('adminLojaSelect'), lojas, 'Selecione a loja');
  preencherSelect(document.getElementById('renameLojaSelect'), lojas, 'Selecione a loja');
  preencherSelect(document.getElementById('adminFormadorSelect'), formadores, 'Selecione o formador');
  renderTabelaRotinasAdmin();
  renderVinculosLista();
  renderRenamesLista();
  renderTabelaRegionaisAdmin();
  renderTabelaUnidadesAdmin();
  atualizarResumoAdmin();
}

function renderVinculosLista() {
  const container = document.getElementById('vinculosLista');
  const lojas = obterLojasConhecidas();
  if (!lojas.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma loja disponível.</div>';
    return;
  }
  container.innerHTML = lojas.map((loja) => {
    const formador = resolverFormador(loja);
    const info = parseLoja(loja);
    return `<div class="link-row"><div><strong>${escaparHtml(loja)}</strong><span>${escaparHtml(info.rede)} • ${escaparHtml(info.unidade)}</span></div><div class="status-tag">${escaparHtml(formador)}</div></div>`;
  }).join('');
}

function renderRenamesLista() {
  const container = document.getElementById('renamesLista');
  const entries = Object.entries(lojaRenameMap);
  if (!entries.length) {
    container.innerHTML = '<div class="empty-state">Nenhum nome personalizado cadastrado.</div>';
    return;
  }
  container.innerHTML = entries.map(([originalSlug, novoNome]) => `<div class="rename-row"><div><strong>${escaparHtml(originalSlug)}</strong><span>${escaparHtml(novoNome)}</span></div></div>`).join('');
}

function obterHistoricoLeve() {
  const mapa = new Map();
  resumosDiarios.map(normalizarResumoDiario).filter(Boolean).forEach((item) => mapa.set(item.id, item));
  snapshotsImportados.map(normalizarResumoDiario).filter(Boolean).forEach((item) => mapa.set(item.id, { ...mapa.get(item.id), ...item }));
  return [...mapa.values()]
    .sort((a, b) => String(b.latestDate || '').localeCompare(String(a.latestDate || '')))
    .slice(0, LIMITE_RESUMOS_HISTORICOS);
}

function somarResumoHistorico(itens = []) {
  const campos = ['previstas', 'realizadas', 'atrasadas', 'pendentes', 'noPrazo', 'toleranciaInicio', 'toleranciaFim', 'antesHorario', 'semHorario'];
  return campos.reduce((acc, campo) => {
    acc[campo] = itens.reduce((total, item) => total + Number(item.summary?.[campo] || 0), 0);
    return acc;
  }, {});
}

function finalizarGrupoHistorico(grupo) {
  grupo.itens.sort((a, b) => String(a.latestDate || '').localeCompare(String(b.latestDate || '')));
  grupo.ids = grupo.itens.map((item) => item.id);
  grupo.datas = grupo.itens.map((item) => item.latestDate).filter(Boolean);
  grupo.dataInicial = grupo.datas[0] || '';
  grupo.dataFinal = grupo.datas.at(-1) || '';
  grupo.summary = somarResumoHistorico(grupo.itens);
  grupo.rawDisponiveis = grupo.itens.filter((item) => item.rawAvailable !== false && item.rawExpiresAt && !dadosBrutosExpirados(item)).length;
  grupo.rawExpiresAt = grupo.itens.map((item) => item.rawExpiresAt).filter(Boolean).sort().at(-1) || '';
  grupo.sourceCompetence = grupo.itens.find((item) => item.sourceCompetence)?.sourceCompetence || '';
  if (!grupo.sourceCompetence && grupo.dataInicial && grupo.dataFinal && grupo.dataInicial.slice(0, 7) === grupo.dataFinal.slice(0, 7)) {
    grupo.sourceCompetence = grupo.dataInicial.slice(0, 7);
  }
  grupo.sourceOutsideCompetenceCount = Math.max(...grupo.itens.map((item) => Number(item.sourceOutsideCompetenceCount || 0)), 0);
  grupo.sourceFileRows = Math.max(...grupo.itens.map((item) => Number(item.sourceFileRows || 0)), 0);
  grupo.sourceRecognizedRows = Math.max(...grupo.itens.map((item) => Number(item.sourceRecognizedRows || 0)), 0);
  grupo.importedAt = grupo.itens.map((item) => item.importBatchImportedAt || item.importedAt).filter(Boolean).sort()[0] || '';
  return grupo;
}

function obterHistoricoAgrupadoPorPlanilha() {
  const itens = obterHistoricoLeve();
  const gruposExplicitos = new Map();
  const legadosPorArquivo = new Map();

  itens.forEach((item) => {
    if (item.importBatchId) {
      const chave = `batch:${item.importBatchId}`;
      if (!gruposExplicitos.has(chave)) gruposExplicitos.set(chave, { chave, fileName: item.fileName, itens: [] });
      gruposExplicitos.get(chave).itens.push(item);
      return;
    }
    const arquivo = String(item.fileName || 'Importação sem nome');
    if (!legadosPorArquivo.has(arquivo)) legadosPorArquivo.set(arquivo, []);
    legadosPorArquivo.get(arquivo).push(item);
  });

  const grupos = [...gruposExplicitos.values()];
  legadosPorArquivo.forEach((lista, fileName) => {
    const ordenados = [...lista].sort((a, b) => new Date(a.importedAt || 0) - new Date(b.importedAt || 0));
    let grupoAtual = null;
    ordenados.forEach((item) => {
      const instante = new Date(item.importedAt || 0).getTime();
      const podeAgrupar = grupoAtual
        && Number.isFinite(instante)
        && Number.isFinite(grupoAtual.ultimoInstante)
        && instante - grupoAtual.ultimoInstante <= JANELA_AGRUPAMENTO_IMPORTACAO_LEGADA_MS;
      if (!podeAgrupar) {
        grupoAtual = {
          chave: `legacy:${hashTextoSimples(fileName)}:${String(item.importedAt || item.latestDate || grupos.length)}`,
          fileName,
          itens: [],
          ultimoInstante: instante
        };
        grupos.push(grupoAtual);
      }
      grupoAtual.itens.push(item);
      grupoAtual.ultimoInstante = instante;
    });
  });

  return grupos
    .map(finalizarGrupoHistorico)
    .sort((a, b) => new Date(b.importedAt || 0) - new Date(a.importedAt || 0));
}

function renderHistoricoPlanilhas() {
  const container = document.getElementById('historicoPlanilhas');
  if (!container) return;
  const historico = obterHistoricoAgrupadoPorPlanilha();
  historicoPlanilhasAgrupadoAtual = new Map();
  if (!historico.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma importação foi processada ainda.</div>';
    return;
  }

  const historicoVisivel = historico.slice(0, limiteHistoricoVisivel);
  const cards = historicoVisivel.map((grupo, indice) => {
    const uiKey = `grupo-${indice}-${hashTextoSimples(grupo.chave)}`;
    historicoPlanilhasAgrupadoAtual.set(uiKey, grupo);
    const dataImportacao = grupo.importedAt ? new Date(grupo.importedAt).toLocaleString('pt-BR') : 'não identificada';
    const dataInicial = grupo.dataInicial ? grupo.dataInicial.split('-').reverse().join('/') : 'não identificada';
    const dataFinal = grupo.dataFinal ? grupo.dataFinal.split('-').reverse().join('/') : dataInicial;
    const periodo = dataInicial === dataFinal ? dataInicial : `${dataInicial} a ${dataFinal}`;
    const resumo = grupo.summary || {};
    const statusRaw = grupo.rawDisponiveis
      ? `Dados temporários em ${grupo.rawDisponiveis} de ${grupo.itens.length} dia(s)${grupo.rawExpiresAt ? ` até ${new Date(grupo.rawExpiresAt).toLocaleString('pt-BR')}` : ''}`
      : 'Dados brutos excluídos ou não armazenados • resultados preservados';
    const competencia = grupo.sourceCompetence ? ` • competência protegida: ${formatarCompetencia(grupo.sourceCompetence)}` : '';
    const bloqueadas = grupo.sourceOutsideCompetenceCount ? ` • ${grupo.sourceOutsideCompetenceCount} resposta(s) fora da competência bloqueada(s)` : '';

    return `
      <div class="history-card">
        <div>
          <div class="history-title">${escaparHtml(grupo.fileName || 'Planilha importada')}</div>
          <div class="history-meta">Importada em ${escaparHtml(dataImportacao)} • ${grupo.itens.length} dia(s) • período ${escaparHtml(periodo)}${escaparHtml(competencia)}</div>
          <div class="history-meta">${resumo.previstas || 0} previstas • ${resumo.realizadas || 0} realizadas • ${resumo.atrasadas || 0} em atraso • ${resumo.pendentes || 0} pendentes${escaparHtml(bloqueadas)}</div>
          <div class="history-meta">${escaparHtml(statusRaw)}</div>
        </div>
        <div class="status-tag">${grupo.rawDisponiveis ? 'Dados temporários' : 'Resultado permanente'}</div>
        <div class="history-actions">
          <button class="btn btn-secondary" type="button" data-action="apply-import-batch" data-group="${escaparHtml(uiKey)}">Reprocessar planilha</button>
          <button class="btn btn-danger" type="button" data-action="delete-import-batch" data-group="${escaparHtml(uiKey)}">Excluir planilha</button>
        </div>
      </div>`;
  }).join('');

  const restante = Math.max(0, historico.length - historicoVisivel.length);
  container.innerHTML = `${cards}${restante ? `
    <div class="history-load-more">
      <button class="btn btn-secondary" type="button" data-action="load-more-history">Carregar mais ${Math.min(30, restante)} planilha(s)</button>
    </div>` : ''}`;
}

function salvarVinculoLoja() {
  const loja = document.getElementById('adminLojaSelect').value;
  const formador = document.getElementById('adminFormadorSelect').value;
  const feedback = document.getElementById('linkFeedback');
  if (!loja || !formador) {
    feedback.textContent = 'Selecione uma loja e um formador para salvar o vínculo.';
    return;
  }
  const formadorValido = normalizarNomeFormador(formador);
  if (!formadorValido) {
    feedback.textContent = 'Selecione um formador ativo.';
    return;
  }
  lojaFormadorMap[slug(loja)] = formadorValido;
  salvarStore(STORAGE_KEYS.storeFormadorMap, sanitizarMapaFormadores(lojaFormadorMap));
  salvarConfigNoFirebase();
  aplicarRegrasAdministrativasNaBaseAtual();
  feedback.textContent = `Vínculo salvo: ${loja} → ${formador}.`;
}

function salvarNovoNomeLoja() {
  const lojaAtual = document.getElementById('renameLojaSelect').value;
  const novoNome = document.getElementById('renameLojaInput').value.trim().replace(/\s+/g, ' ');
  const feedback = document.getElementById('renameFeedback');
  if (!lojaAtual || !novoNome) {
    feedback.textContent = 'Selecione a loja e informe o novo nome.';
    return;
  }
  lojaRenameMap[slug(lojaAtual)] = novoNome;
  salvarStore(STORAGE_KEYS.storeRenameMap, lojaRenameMap);

  if (lojaFormadorMap[slug(lojaAtual)]) {
    lojaFormadorMap[slug(novoNome)] = lojaFormadorMap[slug(lojaAtual)];
    delete lojaFormadorMap[slug(lojaAtual)];
    salvarStore(STORAGE_KEYS.storeFormadorMap, sanitizarMapaFormadores(lojaFormadorMap));
  }
  salvarConfigNoFirebase();

  registrosBase = registrosBase.map((item) => item.loja === lojaAtual ? { ...item, loja: novoNome } : item);
  aplicarRegrasAdministrativasNaBaseAtual();
  document.getElementById('renameLojaInput').value = '';
  feedback.textContent = `Nome alterado para ${novoNome}.`;
}

async function usarSnapshot(snapshotId) {
  let snapshot = snapshotsImportados.find((item) => item.id === snapshotId);
  if (!snapshot && firebaseDisponivel && firebaseApi && db) {
    try {
      const docSnap = await firebaseApi.getDoc(firebaseApi.doc(db, 'painel_snapshots', snapshotId));
      if (docSnap.exists()) {
        const meta = normalizarSnapshotFirebase({ id: docSnap.id, ...docSnap.data() });
        snapshot = { ...meta, data: await carregarDadosSnapshotNoFirebase(meta), dataLoaded: true };
        snapshotsSobDemanda = [snapshot];
        recomporSnapshotsAtivos();
      }
    } catch (error) {
      console.error('Erro ao carregar dia para reprocessamento:', error);
    }
  }
  if (!snapshot) {
    setImportStatus('Não foi possível carregar os detalhes desse dia para reprocessar.', 'Detalhes indisponíveis');
    return;
  }

  const data = formatarData(snapshot.latestDate);
  const respostas = (Array.isArray(snapshot.data) ? snapshot.data : [])
    .map(normalizarRespostaPersistida)
    .filter(Boolean);
  const gerado = data ? gerarResultadosBaseParaData(data, respostas) : { resultados: [] };
  const dadosPersistidos = respostas.map(compactarRespostaParaPersistencia);
  const atualizado = {
    ...snapshot,
    data: dadosPersistidos,
    dataKind: 'responses',
    schemaVersion: RESULT_SCHEMA_VERSION,
    responsesCount: dadosPersistidos.length,
    total: gerado.resultados.length,
    summary: resumirResultadosImportacao(gerado.resultados)
  };

  substituirSnapshotLocal(atualizado);
  persistirSnapshotsLocais();
  atualizarBasePorSnapshots(`Planilha ${snapshot.fileName} reprocessada e aplicada no painel.`);
  const sincronizado = await salvarSnapshotNoFirebase(atualizado);
  setImportStatus(
    sincronizado
      ? `Planilha ${snapshot.fileName} reprocessada e sincronizada.`
      : `Planilha ${snapshot.fileName} reprocessada no painel, mas a sincronização online falhou.`,
    sincronizado ? 'Sincronizado' : 'Reprocessada localmente'
  );
}

async function excluirSnapshot(snapshotId) {
  const snapshot = snapshotsImportados.find((item) => item.id === snapshotId)
    || obterHistoricoLeve().find((item) => item.id === snapshotId);
  if (!snapshot) return;
  snapshotsRecentes = snapshotsRecentes.filter((item) => item.id !== snapshotId);
  snapshotsSobDemanda = snapshotsSobDemanda.filter((item) => item.id !== snapshotId);
  resumosDiarios = resumosDiarios.filter((item) => item.id !== snapshotId);
  recomporSnapshotsAtivos();
  persistirSnapshotsLocais();
  atualizarBasePorSnapshots(
    snapshotsImportados.length
      ? `Planilha ${snapshot.fileName} removida. O painel foi recalculado com os detalhes carregados.`
      : 'Planilha removida. O painel ficou sem dados detalhados carregados.'
  );

  const sincronizado = await excluirSnapshotNoFirebase(snapshotId);
  setImportStatus(
    sincronizado
      ? 'Planilha removida com sucesso. Todos os usuários verão a atualização.'
      : 'Planilha removida neste dispositivo, mas a sincronização online falhou.',
    sincronizado ? 'Removida' : 'Removida localmente'
  );
}

async function reprocessarPlanilhaImportada(groupKey) {
  const grupo = historicoPlanilhasAgrupadoAtual.get(groupKey);
  if (!grupo) return;
  let concluidos = 0;
  const erros = [];
  for (let indice = 0; indice < grupo.ids.length; indice += 1) {
    const snapshot = await carregarSnapshotCompletoPorId(grupo.ids[indice]);
    if (!snapshot) {
      erros.push(grupo.ids[indice]);
      continue;
    }
    setImportStatus(`${grupo.fileName}: reprocessando ${indice + 1} de ${grupo.ids.length} dias...`, 'Reprocessando planilha');
    const data = formatarData(snapshot.latestDate);
    const respostas = (Array.isArray(snapshot.data) ? snapshot.data : []).map(normalizarRespostaPersistida).filter(Boolean);
    const gerado = data ? gerarResultadosBaseParaData(data, respostas) : { resultados: [] };
    const dadosPersistidos = respostas.map(compactarRespostaParaPersistencia);
    const atualizado = {
      ...snapshot,
      data: dadosPersistidos,
      dataKind: 'responses',
      schemaVersion: RESULT_SCHEMA_VERSION,
      responsesCount: dadosPersistidos.length,
      total: gerado.resultados.length,
      summary: resumirResultadosImportacao(gerado.resultados)
    };
    const sincronizado = firebaseDisponivel ? await salvarSnapshotNoFirebaseVerificado(atualizado) : true;
    if (!sincronizado) {
      erros.push(data || snapshot.id);
      continue;
    }
    substituirSnapshotLocal(firebaseDisponivel ? { ...atualizado, rawData: undefined } : atualizado);
    concluidos += 1;
  }
  persistirSnapshotsLocais();
  atualizarBasePorSnapshots(`${grupo.fileName}: ${concluidos} dia(s) reprocessado(s).`);
  setImportStatus(
    erros.length
      ? `${concluidos} dia(s) reprocessado(s). Falha em: ${erros.join(', ')}.`
      : `${grupo.fileName} reprocessada e conferida por completo.`,
    erros.length ? 'Reprocessamento parcial' : 'Planilha reprocessada'
  );
}

async function excluirPlanilhaImportada(groupKey) {
  const grupo = historicoPlanilhasAgrupadoAtual.get(groupKey);
  if (!grupo) return;
  const confirmado = window.confirm(`Excluir a planilha “${grupo.fileName}” e todos os ${grupo.ids.length} dia(s) importados por ela? Esta ação não pode ser desfeita.`);
  if (!confirmado) return;

  setImportStatus(`Excluindo ${grupo.fileName}...`, 'Excluindo planilha');
  const idsRemovidos = [];
  const idsComFalha = [];
  for (let indice = 0; indice < grupo.ids.length; indice += 1) {
    const id = grupo.ids[indice];
    const removido = firebaseDisponivel ? await excluirSnapshotNoFirebase(id) : true;
    if (removido) idsRemovidos.push(id);
    else idsComFalha.push(id);
  }

  const removidosSet = new Set(idsRemovidos);
  snapshotsRecentes = snapshotsRecentes.filter((item) => !removidosSet.has(item.id));
  snapshotsSobDemanda = snapshotsSobDemanda.filter((item) => !removidosSet.has(item.id));
  resumosDiarios = resumosDiarios.filter((item) => !removidosSet.has(item.id));
  recomporSnapshotsAtivos();
  persistirSnapshotsLocais();
  atualizarBasePorSnapshots(
    idsComFalha.length
      ? `${idsRemovidos.length} dia(s) da planilha removido(s); ${idsComFalha.length} não puderam ser excluídos.`
      : `Planilha ${grupo.fileName} removida por completo.`
  );
  setImportStatus(
    idsComFalha.length
      ? `Exclusão parcial: ${idsRemovidos.length} dia(s) removido(s) e ${idsComFalha.length} com falha de sincronização.`
      : `${grupo.fileName} e todos os seus ${idsRemovidos.length} dia(s) foram excluídos.`,
    idsComFalha.length ? 'Exclusão parcial' : 'Planilha excluída'
  );
}

function configurarAdmin() {
  const experiencia = document.getElementById('adminModal');
  const loginView = document.getElementById('adminLoginView');
  const panelView = document.getElementById('adminPanelView');
  const loginFeedback = document.getElementById('adminLoginFeedback');
  const titulos = {
    'visao-geral': 'Visão geral',
    importacao: 'Importações',
    regionais: 'Configuração de regionais',
    unidades: 'Unidades ativas',
    rotinas: 'Rotinas e tolerâncias',
    vinculos: 'Equipe e formadores',
    nomes: 'Padronização de nomes',
    historico: 'Histórico de importações',
    configuracoes: 'Configurações do sistema'
  };

  function ativarSecao(tab = 'visao-geral') {
    document.querySelectorAll('.admin-tab').forEach((item) => item.classList.toggle('active', item.dataset.tab === tab));
    document.querySelectorAll('.admin-tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tab));
    const titulo = document.getElementById('adminPageTitle');
    if (titulo) titulo.textContent = titulos[tab] || 'Administração';
    if (tab === 'regionais') renderTabelaRegionaisAdmin();
    if (tab === 'unidades') renderTabelaUnidadesAdmin();
    if (tab === 'historico') renderHistoricoPlanilhas();
    if (tab === 'rotinas') renderTabelaRotinasAdmin();
  }

  function refreshAdminView() {
    const isLogged = localStorage.getItem(STORAGE_KEYS.adminLogged) === '1';
    loginView.classList.toggle('hidden', isLogged);
    panelView.classList.toggle('hidden', !isLogged);
    if (isLogged) {
      atualizarResumoAdmin();
      popularControlesAdmin();
      renderHistoricoPlanilhas();
      ativarSecao(document.querySelector('.admin-tab.active')?.dataset.tab || 'visao-geral');
    }
  }

  const abrirAdmin = () => {
    experiencia.classList.remove('hidden');
    experiencia.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-mode');
    refreshAdminView();
  };
  const fecharAdmin = () => {
    experiencia.classList.add('hidden');
    experiencia.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-mode');
  };

  document.getElementById('adminToggle')?.addEventListener('click', abrirAdmin);
  document.getElementById('closeAdmin')?.addEventListener('click', fecharAdmin);
  document.getElementById('adminBackDashboard')?.addEventListener('click', fecharAdmin);

  document.getElementById('adminLoginForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    if (user === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass) {
      localStorage.setItem(STORAGE_KEYS.adminLogged, '1');
      loginFeedback.textContent = '';
      refreshAdminView();
    } else {
      loginFeedback.textContent = 'Usuário ou senha incorretos.';
    }
  });

  document.getElementById('adminLogout')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.adminLogged);
    refreshAdminView();
  });

  document.querySelectorAll('.admin-tab').forEach((button) => {
    button.addEventListener('click', () => ativarSecao(button.dataset.tab));
  });

  document.getElementById('saveLojaVinculo')?.addEventListener('click', salvarVinculoLoja);
  document.getElementById('saveLojaRename')?.addEventListener('click', salvarNovoNomeLoja);
  document.getElementById('saveRegionals')?.addEventListener('click', salvarRegionaisAdmin);
  document.getElementById('adminRegionalSearch')?.addEventListener('input', renderTabelaRegionaisAdmin);
  document.getElementById('adminRegionalFilter')?.addEventListener('change', renderTabelaRegionaisAdmin);

  document.getElementById('createRoutineButton')?.addEventListener('click', () => abrirEditorRotina());
  document.getElementById('closeRoutineEditor')?.addEventListener('click', fecharEditorRotina);
  document.getElementById('cancelRoutineButton')?.addEventListener('click', fecharEditorRotina);
  document.getElementById('saveRoutineButton')?.addEventListener('click', salvarRotinaAdmin);
  document.getElementById('duplicateRoutineButton')?.addEventListener('click', () => {
    const id = document.getElementById('routineEditorId')?.value;
    if (id) abrirEditorRotina(id, true);
  });
  document.getElementById('deactivateRoutineButton')?.addEventListener('click', () => {
    const id = document.getElementById('routineEditorId')?.value;
    if (id) desativarRotinaAdmin(id);
  });
  document.getElementById('deleteRoutineButton')?.addEventListener('click', () => {
    const id = document.getElementById('routineEditorId')?.value;
    if (id) excluirRotinaAdmin(id);
  });
  document.getElementById('adminRoutineSearch')?.addEventListener('input', renderTabelaRotinasAdmin);
  document.getElementById('adminRoutineStatusFilter')?.addEventListener('change', renderTabelaRotinasAdmin);
  document.getElementById('adminRoutinesTable')?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-routine-action]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.routineAction;
    if (action === 'edit') abrirEditorRotina(id);
    if (action === 'duplicate') abrirEditorRotina(id, true);
    if (action === 'deactivate') desativarRotinaAdmin(id);
    if (action === 'delete') excluirRotinaAdmin(id);
  });
  document.getElementById('routineActive')?.addEventListener('change', (event) => {
    const fim = document.getElementById('routineEffectiveEnd');
    const inicio = document.getElementById('routineEffectiveStart')?.value || '';
    if (!event.target.checked && fim && !fim.value && (!inicio || inicio <= dataLocalIso())) fim.value = dataLocalIso();
  });

  const historicoPlanilhas = document.getElementById('historicoPlanilhas');
  if (historicoPlanilhas) {
    historicoPlanilhas.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'load-more-history') {
        limiteHistoricoVisivel += 30;
        renderHistoricoPlanilhas();
        return;
      }
      if (button.dataset.action === 'apply-import-batch') reprocessarPlanilhaImportada(button.dataset.group);
      if (button.dataset.action === 'delete-import-batch') excluirPlanilhaImportada(button.dataset.group);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !experiencia.classList.contains('hidden')) fecharAdmin();
  });

  refreshAdminView();
}

function obterPeriodoComparativo() {
  const periodo = normalizarPeriodo(filtros.dataInicial.value, filtros.dataFinal.value);
  if (!periodo.dataInicial || !periodo.dataFinal) return '|';
  const inicio = new Date(`${periodo.dataInicial}T00:00:00`);
  const fim = new Date(`${periodo.dataFinal}T00:00:00`);
  const diffDias = Math.max(1, Math.round((fim - inicio) / 86400000) + 1);
  const novoFim = new Date(inicio);
  novoFim.setDate(novoFim.getDate() - 1);
  const novoInicio = new Date(novoFim);
  novoInicio.setDate(novoInicio.getDate() - (diffDias - 1));
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `${fmt(novoInicio)}|${fmt(novoFim)}`;
}

function atualizarPendenciasHero(dados) {
  const container = document.getElementById('painelPendencias');
  if (!container) return;
  const pendentes = dados.filter((item) => item.status === 'pendente');
  const lojasBaixasMap = {};
  dados.forEach((item) => {
    if (!lojasBaixasMap[item.loja]) lojasBaixasMap[item.loja] = { total: 0, realizadas: 0 };
    lojasBaixasMap[item.loja].total += 1;
    if (item.status === 'realizada') lojasBaixasMap[item.loja].realizadas += 1;
  });
  const lojasBaixas = Object.values(lojasBaixasMap).filter((item) => percentual(item.realizadas, item.total) < 50).length;
  const promotoresSemRegistro = Object.values(dados.reduce((acc, item) => {
    const chave = item.formador || 'Sem formador';
    if (!acc[chave]) acc[chave] = { total: 0 };
    acc[chave].total += 1;
    return acc;
  }, {})).filter((item) => item.total === 0).length;
  const pendenciasAntigas = pendentes.length;
  const itens = [
    { texto: `${lojasBaixas} lojas com execução abaixo de 50%` },
    { texto: `${promotoresSemRegistro} promotores sem registro no período` },
    { texto: `${pendenciasAntigas} rotinas pendentes no recorte atual` }
  ];
  container.innerHTML = itens.map((item) => `<div class="hero-alert-item"><span class="hero-alert-bullet">⚠️</span><span><strong>${item.texto}</strong></span></div>`).join('');
}

function obterDatasImportadasDisponiveis() {
  const datas = new Set();
  resumosDiarios.forEach((item) => {
    const data = formatarData(item?.latestDate);
    if (data) datas.add(data);
  });
  [...snapshotsRecentes, ...snapshotsSobDemanda, ...snapshotsImportados].forEach((item) => {
    const data = formatarData(item?.latestDate);
    if (data) datas.add(data);
  });
  // A base detalhada pode ter dezenas de milhares de linhas. Só a percorre no modo simulado,
  // quando ainda não existem resumos ou snapshots importados.
  if (!datas.size) {
    registros.forEach((item) => {
      const data = formatarData(item?.data);
      if (data) datas.add(data);
    });
  }
  return [...datas].sort();
}

function obterUltimaDataImportadaNoPeriodo(dataInicial = '', dataFinal = '') {
  const periodo = normalizarPeriodo(dataInicial, dataFinal);
  const datas = obterDatasImportadasDisponiveis().filter((data) => {
    if (periodo.dataInicial && data < periodo.dataInicial) return false;
    if (periodo.dataFinal && data > periodo.dataFinal) return false;
    return true;
  });
  return datas.at(-1) || '';
}

function obterPrimeiraDataImportadaNoPeriodo(dataInicial = '', dataFinal = '') {
  const periodo = normalizarPeriodo(dataInicial, dataFinal);
  const datas = obterDatasImportadasDisponiveis().filter((data) => {
    if (periodo.dataInicial && data < periodo.dataInicial) return false;
    if (periodo.dataFinal && data > periodo.dataFinal) return false;
    return true;
  });
  return datas[0] || '';
}

function obterFimRealDoMes(ref = '') {
  const dataRef = dataIsoParaDate(formatarData(ref));
  if (!dataRef) return '';
  const fmt = (data) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  const inicioMes = fmt(new Date(dataRef.getFullYear(), dataRef.getMonth(), 1));
  const fimCalendario = fmt(new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, 0));
  return obterUltimaDataImportadaNoPeriodo(inicioMes, fimCalendario) || formatarData(ref);
}

function atualizarRotulosAbas() {
  const inicioFiltro = formatarData(filtros.dataInicial?.value);
  const fimFiltro = formatarData(filtros.dataFinal?.value);
  const dataReal = obterUltimaDataImportadaNoPeriodo(inicioFiltro, fimFiltro);
  const ref = dataReal || fimFiltro || inicioFiltro || ultimaDataDisponivel || new Date().toISOString().slice(0, 10);
  const primeiroReal = obterPrimeiraDataImportadaNoPeriodo(inicioFiltro, fimFiltro);
  const inicioEfetivo = primeiroReal || inicioFiltro || ref;
  const fimEfetivo = dataReal || fimFiltro || ref;
  const dataRef = dataIsoParaDate(ref) || new Date();
  const dataInicio = dataIsoParaDate(inicioEfetivo) || dataRef;
  const dataFim = dataIsoParaDate(fimEfetivo) || dataRef;
  const diario = document.getElementById('tabLabelDiario');
  const semanal = document.getElementById('tabLabelSemanal');
  const mensal = document.getElementById('tabLabelMensal');

  if (diario) {
    diario.textContent = `Data • ${dataRef.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;
  }
  if (semanal) {
    semanal.textContent = `${dataInicio.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${dataFim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
  }
  if (mensal) {
    const mesmoMes = dataInicio.getFullYear() === dataFim.getFullYear() && dataInicio.getMonth() === dataFim.getMonth();
    mensal.textContent = mesmoMes
      ? dataFim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : 'Período personalizado';
  }
}

function aplicarPeriodoResumo(periodo) {
  resumoPeriodoAtual = periodo;
  const periodoFiltro = normalizarPeriodo(filtros.dataInicial?.value, filtros.dataFinal?.value);
  const refFiltro = periodoFiltro.dataFinal
    || periodoFiltro.dataInicial
    || ultimaDataDisponivel
    || new Date().toISOString().slice(0, 10);
  const refReal = obterUltimaDataImportadaNoPeriodo(periodoFiltro.dataInicial, periodoFiltro.dataFinal)
    || obterFimRealDoMes(refFiltro)
    || refFiltro;
  const base = new Date(`${refReal}T00:00:00`);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (periodo === 'diario') {
    filtros.dataInicial.value = refReal;
    filtros.dataFinal.value = refReal;
  } else if (periodo === 'semanal') {
    const ini = new Date(base);
    ini.setDate(base.getDate() - 6);
    const inicioSemana = fmt(ini);
    const primeiroDisponivel = obterPrimeiraDataImportadaNoPeriodo(inicioSemana, refReal) || inicioSemana;
    filtros.dataInicial.value = primeiroDisponivel;
    filtros.dataFinal.value = refReal;
  } else {
    const ini = new Date(base.getFullYear(), base.getMonth(), 1);
    filtros.dataInicial.value = fmt(ini);
    filtros.dataFinal.value = refReal;
  }
  document.querySelectorAll('.summary-tab').forEach((button) => button.classList.toggle('active', button.dataset.period === periodo));
  atualizarRotulosAbas();
  renderizarPainel();
}

function configurarAbasResumo() {
  atualizarRotulosAbas();
  document.querySelectorAll('.summary-tab').forEach((button) => {
    button.addEventListener('click', () => aplicarPeriodoResumo(button.dataset.period));
  });
}

function configurarSidebar() {
  const close = document.getElementById('closeSidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (close) close.addEventListener('click', () => window.PainelSF.alternarSidebar(false));
  if (overlay) overlay.addEventListener('click', () => window.PainelSF.alternarSidebar(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.PainelSF.alternarSidebar(false);
  });
}

function ativarResumoMensalSemSobrescreverDatas() {
  resumoPeriodoAtual = 'mensal';
  document.querySelectorAll('.summary-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.period === 'mensal');
  });
}

async function aplicarFiltroComResumoMensal({ preservarDatas = false, sincronizarDependentes = false } = {}) {
  if (sincronizarDependentes) sincronizarFiltrosDependentes();
  if (preservarDatas) {
    ativarResumoMensalSemSobrescreverDatas();
    atualizarRotulosAbas();
    const pronto = await prepararFiltrosComDetalhes();
    if (pronto) renderizarPainel();
  } else {
    aplicarPeriodoResumo('mensal');
  }
}

function configurarEventos() {
  filtros.rede.addEventListener('change', () => aplicarFiltroComResumoMensal({ sincronizarDependentes: true }));
  filtros.formador.addEventListener('change', () => aplicarFiltroComResumoMensal({ sincronizarDependentes: true }));
  filtros.loja.addEventListener('change', () => aplicarFiltroComResumoMensal());
  filtros.status.addEventListener('change', () => aplicarFiltroComResumoMensal());
  filtros.rotina.addEventListener('change', () => aplicarFiltroComResumoMensal());
  filtros.dataInicial.addEventListener('change', () => aplicarFiltroComResumoMensal({ preservarDatas: true }));
  filtros.dataFinal.addEventListener('change', () => aplicarFiltroComResumoMensal({ preservarDatas: true }));
  document.getElementById('applyFilters').addEventListener('click', () => { aplicarFiltroComResumoMensal({ preservarDatas: Boolean(filtros.dataInicial.value || filtros.dataFinal.value), sincronizarDependentes: true }); document.body.classList.remove('sidebar-open'); });
  document.getElementById('clearFilters').addEventListener('click', () => { limparFiltros(); document.body.classList.remove('sidebar-open'); });
  const importButton = document.getElementById('importFile');
  const resetButton = document.getElementById('resetData');
  const optimizeButton = document.getElementById('optimizeMemory');
  if (importButton) importButton.addEventListener('click', importarArquivo);
  if (resetButton) resetButton.addEventListener('click', resetarParaSimulada);
  if (optimizeButton) optimizeButton.addEventListener('click', otimizarSistemaAgora);
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      montarPreviewArquivos();
    });
  }
}

function inicializarBaseAtiva() {
  if (snapshotsImportados.length) {
    registrosBase = consolidarSnapshotsImportados();
    aplicarBase(registrosBase, 'importada', `${registrosBase.length} registros consolidados de ${snapshotsImportados.length} planilha(s) importada(s).`);
  } else {
    registrosBase = normalizarBaseCompleta(registrosSimulados, 'simulada');
    aplicarBase(registrosBase, 'simulada', 'Painel sem dados. Importe uma ou mais planilhas para carregar as rotinas.');
  }
}


window.PainelSF = Object.assign(window.PainelSF || {}, {
  alternarSidebar(forceOpen) {
    const body = document.body;
    const abrir = typeof forceOpen === 'boolean' ? forceOpen : !body.classList.contains('sidebar-open');
    body.classList.toggle('sidebar-open', abrir);
  },
  abrirAdminModal() {
    const modal = document.getElementById('adminModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-mode');
  },
  fecharAdminModal() {
    const modal = document.getElementById('adminModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-mode');
  },
  aplicarPeriodoResumo,
  selecionarRegionalDashboard,
  abrirApresentacao,
  fecharApresentacao,
  proximoSlideApresentacao() { irParaSlideApresentacao(apresentacaoState.slideAtual + 1); },
  slideAnteriorApresentacao() { irParaSlideApresentacao(apresentacaoState.slideAtual - 1); },
  alternarAutoplayApresentacao,
  alternarFullscreenApresentacao,
  async aplicarFiltrosRapido() {
    try {
      const pronto = await prepararFiltrosComDetalhes();
      if (pronto) renderizarPainel();
    } catch (error) { console.error(error); }
    document.body.classList.remove('sidebar-open');
  },
  limparFiltrosRapido() {
    try { limparFiltros(); } catch (error) { console.error(error); }
    document.body.classList.remove('sidebar-open');
  }
});


function obterPeriodoResumoLabel() {
  const labels = {
    diario: document.getElementById('tabLabelDiario')?.textContent?.trim() || 'Hoje',
    semanal: document.getElementById('tabLabelSemanal')?.textContent?.trim() || 'Últimos 7 dias',
    mensal: document.getElementById('tabLabelMensal')?.textContent?.trim() || 'Mês atual'
  };
  const prefixos = {
    diario: 'Resumo diário',
    semanal: 'Resumo semanal',
    mensal: 'Resumo mensal'
  };
  return `${prefixos[resumoPeriodoAtual] || 'Resumo'} • ${labels[resumoPeriodoAtual] || ''}`;
}

function resumirKPIs(dados) {
  const previstas = dados.length;
  const realizadas = dados.filter((item) => item.status === 'realizada').length;
  const pendentes = dados.filter((item) => item.status === 'pendente').length;
  const execucao = percentual(realizadas, previstas);
  return { previstas, realizadas, pendentes, execucao };
}

function obterTopLojas(dados, limite = 6) {
  return Object.values(dados.reduce((acc, item) => {
    if (!acc[item.loja]) acc[item.loja] = { loja: item.loja, rede: item.rede, formador: item.formador, realizadas: 0, total: 0 };
    acc[item.loja].total += 1;
    if (item.status === 'realizada') acc[item.loja].realizadas += 1;
    return acc;
  }, {})).sort((a, b) => percentual(b.realizadas, b.total) - percentual(a.realizadas, a.total) || b.realizadas - a.realizadas || a.loja.localeCompare(b.loja, 'pt-BR')).slice(0, limite);
}

function obterRotinasCriticas(dados, limite = 5) {
  return Object.values(dados.reduce((acc, item) => {
    if (!acc[item.rotina]) acc[item.rotina] = { rotina: item.rotina, realizadas: 0, total: 0 };
    acc[item.rotina].total += 1;
    if (item.status === 'realizada') acc[item.rotina].realizadas += 1;
    return acc;
  }, {})).sort((a, b) => percentual(a.realizadas, a.total) - percentual(b.realizadas, b.total) || b.total - a.total || a.rotina.localeCompare(b.rotina, 'pt-BR')).slice(0, limite);
}

function obterMelhoresLojasPorFormador(dados) {
  const porFormador = agregarLojasPorFormador(dados);
  return FORMADORES_ATIVOS
    .filter((formador) => Array.isArray(porFormador[formador]) && porFormador[formador].length)
    .map((formador) => {
      const melhorLoja = [...porFormador[formador]].sort((a, b) => percentual(b.realizadas, b.total) - percentual(a.realizadas, a.total) || b.realizadas - a.realizadas || a.loja.localeCompare(b.loja, 'pt-BR'))[0];
      return { ...melhorLoja, formador, execucao: percentual(melhorLoja.realizadas, melhorLoja.total) };
    });
}

function obterRankingFormadoresApresentacao(dados, limite = 3) {
  const agrupado = agregarPorFormador(dados);
  const posicoes = new Map(FORMADORES_ATIVOS.map((nome, indice) => [slug(nome), indice]));
  return agrupado
    .filter((item) => ehFormadorAtivo(item.nome))
    .sort((a, b) => {
      const diferencaExecucao = percentual(b.realizadas, b.total) - percentual(a.realizadas, a.total);
      if (diferencaExecucao) return diferencaExecucao;
      const diferencaRealizadas = b.realizadas - a.realizadas;
      if (diferencaRealizadas) return diferencaRealizadas;
      return (posicoes.get(slug(a.nome)) ?? 999) - (posicoes.get(slug(b.nome)) ?? 999);
    })
    .slice(0, limite);
}

function aplicarAjusteFitApresentacao() {
  if (!apresentacaoState.aberta) return;
  const content = document.getElementById('presentationContent');
  const frame = content?.querySelector('.presentation-frame');
  const scaleBox = content?.querySelector('.presentation-scale-box');
  if (!content || !frame || !scaleBox) return;

  frame.classList.remove('is-conecta-compact', 'is-conecta-tight');

  const baseWidth = Number(frame.dataset.baseWidth || 1920);
  const baseHeight = Number(frame.dataset.baseHeight || 1080);
  const viewportWidth = Math.max(content.clientWidth - 20, 320);
  const viewportHeight = Math.max(content.clientHeight - 20, 240);
  const scale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight) * 0.985;

  scaleBox.style.width = `${baseWidth}px`;
  scaleBox.style.height = `${baseHeight}px`;
  scaleBox.style.transform = `scale(${scale})`;

  const relacao = viewportWidth / Math.max(viewportHeight, 1);
  const compact = viewportHeight < 1020 || viewportWidth < 1760 || relacao < 1.72;
  const tight = viewportHeight < 930 || viewportWidth < 1600 || relacao < 1.62;

  if (compact) frame.classList.add('is-conecta-compact');
  if (tight) frame.classList.add('is-conecta-tight');
}

function montarFiltrosApresentacao() {
  return montarResumoFiltrosAtivos().map((item) => `<div class="presentation-filter-chip"><strong>${escaparHtml(item.rotulo)}:</strong><span>${escaparHtml(item.valor)}</span></div>`).join('');
}

function criarListaApresentacao(itens, renderItem) {
  if (!itens.length) {
    return '<div class="presentation-empty">Sem dados no recorte atual.</div>';
  }
  return `<div class="presentation-list">${itens.map((item, index) => renderItem(item, index)).join('')}</div>`;
}

function obterMetaApresentacao() {
  return 80;
}

function formatarHoraApresentacao(data = new Date()) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDataApresentacao(data = new Date()) {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function formatarDataTituloApresentacao(data = new Date()) {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase();
}

function classeExecucaoApresentacao(execucao) {
  if (execucao >= 90) return 'is-high';
  if (execucao >= 80) return 'is-medium';
  return 'is-low';
}

function montarRodapeSlideApresentacao(indice, total) {
  return `
    <div class="presentation-slide-progress">
      <div class="presentation-slide-progress-track">
        <div class="presentation-slide-progress-fill" style="width:${((indice + 1) / Math.max(total, 1)) * 100}%"></div>
      </div>
      <div class="presentation-slide-progress-dots">
        ${Array.from({ length: total }, (_, dotIndex) => `<span class="presentation-slide-progress-dot ${dotIndex === indice ? 'active' : ''}"></span>`).join('')}
      </div>
    </div>`;
}

function mensagemMetaApresentacao(execucao, meta = obterMetaApresentacao()) {
  if (execucao >= meta + 5) return 'ACIMA DA META';
  if (execucao >= meta) return 'META ATINGIDA';
  return 'ABAIXO DA META';
}

function montarHeroSlideApresentacao(titulo, periodo) {
  const agora = new Date();
  return `
    <div class="presentation-hero-header">
      <div class="presentation-brand-block">
        <img src="logo-sofolhas.png" alt="Só Folhas Hortifruti" class="presentation-brand-logo" />
      </div>
      <div class="presentation-clock-block">
        <div class="presentation-clock-time">${escaparHtml(formatarHoraApresentacao(agora))}</div>
        <div class="presentation-clock-date">${escaparHtml(formatarDataApresentacao(agora))}</div>
      </div>
      <div class="presentation-title-block">
        <h3 class="presentation-screen-title">${escaparHtml(titulo)}</h3>
        <div class="presentation-title-meta-row">
          <span class="presentation-period-pill">PERÍODO</span>
          <span class="presentation-period-value">${escaparHtml(periodo)}</span>
        </div>
        <div class="presentation-stamp-row">
          <span class="presentation-stamp-dot"></span>
          <span>${escaparHtml(formatarDataTituloApresentacao(agora))} • ${escaparHtml(formatarHoraApresentacao(agora))}</span>
        </div>
      </div>
    </div>`;
}

function gerarSlidesApresentacao() {
  const dados = [...dadosFiltrados];
  const kpis = resumirKPIs(dados);
  const formadores = obterRankingFormadoresApresentacao(dados, 3);
  const destaques = obterMelhoresLojasPorFormador(dados).slice(0, 3);
  const periodo = obterPeriodoResumoLabel();
  const filtrosHtml = montarFiltrosApresentacao();
  const meta = obterMetaApresentacao();
  const diferencaMeta = kpis.execucao - meta;
  const statusMeta = mensagemMetaApresentacao(kpis.execucao, meta);
  const progressoExecucao = Math.max(0, Math.min(kpis.execucao, 100));
  const top3Formadores = formadores.slice(0, 3);
  const totalSlidesApresentacao = 4;

  if (!dados.length) {
    return [{
      titulo: 'Modo apresentação',
      subtitulo: 'O painel está sem dados no momento.',
      periodo,
      filtrosHtml,
      html: '<div class="presentation-empty"><div><h3>Nenhuma planilha ativa</h3><p>Entre na área ADM, importe a base e volte para este modo para exibir a apresentação automaticamente.</p></div></div>'
    }];
  }

  const slideExecutivo = {
    titulo: 'Slide 1',
    subtitulo: 'Abertura executiva do painel.',
    periodo,
    filtrosHtml,
    html: `
      <div class="presentation-slide presentation-slide-visual presentation-slide-intro presentation-conecta-slide">
        ${montarHeroSlideApresentacao('PAINEL DE ROTINAS OPERACIONAIS', periodo)}
        <div class="presentation-summary-grid">
          <article class="presentation-summary-card">
            <div class="presentation-summary-head">PREVISTAS</div>
            <div class="presentation-summary-icon">☑</div>
            <div class="presentation-summary-value">${formatarNumero.format(kpis.previstas)}</div>
            <div class="presentation-summary-label">Rotinas previstas</div>
          </article>
          <article class="presentation-summary-card">
            <div class="presentation-summary-head">REALIZADAS</div>
            <div class="presentation-summary-icon">✅</div>
            <div class="presentation-summary-value">${formatarNumero.format(kpis.realizadas)}</div>
            <div class="presentation-summary-label">Rotinas realizadas</div>
          </article>
          <article class="presentation-summary-card is-warning">
            <div class="presentation-summary-head">PENDÊNCIAS</div>
            <div class="presentation-summary-icon">⚠</div>
            <div class="presentation-summary-value">${formatarNumero.format(kpis.pendentes)}</div>
            <div class="presentation-summary-label">Rotinas não finalizadas</div>
          </article>
          <article class="presentation-summary-card presentation-summary-ring-card">
            <div class="presentation-summary-head">EXECUÇÃO GERAL</div>
            <div class="presentation-summary-ring" style="--progress:${progressoExecucao}">
              <div class="presentation-summary-ring-inner">
                <div class="presentation-summary-ring-value">${kpis.execucao}%</div>
                <div class="presentation-summary-ring-label">Eficiência média</div>
              </div>
            </div>
          </article>
        </div>
        <div class="presentation-slide-caption">Resumo geral do período selecionado</div>
        ${montarRodapeSlideApresentacao(0, totalSlidesApresentacao)}
      </div>`
  };

  const slideMeta = {
    titulo: 'Slide 2',
    subtitulo: 'Execução geral versus meta.',
    periodo,
    filtrosHtml,
    html: `
      <div class="presentation-slide presentation-slide-visual presentation-slide-target presentation-conecta-slide">
        ${montarHeroSlideApresentacao('EXECUÇÃO GERAL VS META', periodo)}
        <div class="presentation-vs-grid">
          <div class="presentation-vs-ring-shell">
            <div class="presentation-vs-ring" style="--progress:${progressoExecucao}">
              <div class="presentation-vs-ring-inner">
                <div class="presentation-vs-ring-value">${kpis.execucao}%</div>
                <div class="presentation-vs-ring-label">Execução no período</div>
              </div>
            </div>
          </div>
          <div class="presentation-vs-panel ${diferencaMeta >= 0 ? 'is-positive' : 'is-negative'}">
            <div class="presentation-vs-panel-grid">
              <div>
                <div class="presentation-vs-status">${escaparHtml(statusMeta)}</div>
                <div class="presentation-vs-copy">${kpis.execucao >= meta ? 'Eficiência geral dentro ou acima da meta estabelecida.' : 'Eficiência geral abaixo da meta estabelecida.'}</div>
              </div>
              <div class="presentation-vs-meta-box">
                <div class="presentation-vs-meta-title">META</div>
                <div class="presentation-vs-meta-value">${meta}%</div>
              </div>
            </div>
            <div class="presentation-vs-bar-track">
              <div class="presentation-vs-bar-fill" style="width:${progressoExecucao}%"></div>
              <div class="presentation-vs-bar-marker" style="left:${meta}%"></div>
            </div>
            <div class="presentation-vs-bottom-row">
              <span>Diferença para a meta</span>
              <strong>${diferencaMeta > 0 ? '+' : ''}${diferencaMeta.toFixed(1).replace('.', ',')}%</strong>
            </div>
          </div>
        </div>
        <div class="presentation-slide-caption">${kpis.execucao >= meta ? 'Meta de execução atingida neste período' : 'Meta de execução não atingida neste período'}</div>
        ${montarRodapeSlideApresentacao(1, totalSlidesApresentacao)}
      </div>`
  };

  const slideFormadores = {
    titulo: 'Slide 3',
    subtitulo: 'Ranking visual dos formadores.',
    periodo,
    filtrosHtml,
    html: `
      <div class="presentation-slide presentation-slide-visual presentation-slide-podium presentation-conecta-slide">
        ${montarHeroSlideApresentacao('RANKING DE FORMADORES', periodo)}
        <div class="presentation-podium-grid ${top3Formadores.length < 3 ? 'is-compact' : ''}">
          ${top3Formadores.map((item, index) => {
            const execucao = percentual(item.realizadas, item.total);
            const posicoes = ['gold', 'silver', 'bronze'];
            const coroas = ['♛', '♕', '♕'];
            const ordens = [1, 0, 2];
            const variante = posicoes[index] || 'bronze';
            const coroa = coroas[index] || '♕';
            const ordem = ordens[index] || index;
            return `
              <article class="presentation-podium-card ${variante}" style="order:${ordem}">
                <div class="presentation-podium-crown">${coroa}</div>
                <div class="presentation-podium-name">${escaparHtml(item.nome)}</div>
                <div class="presentation-podium-value">${execucao}%</div>
                <div class="presentation-podium-meta">${item.realizadas} de ${item.total}</div>
                <div class="presentation-podium-footer">
                  <span>${index + 1}º no período</span>
                  <strong>${classeExecucaoApresentacao(execucao) === 'is-high' ? 'Alto desempenho' : classeExecucaoApresentacao(execucao) === 'is-medium' ? 'Bom desempenho' : 'Atenção'}</strong>
                </div>
              </article>`;
          }).join('')}
        </div>
        <div class="presentation-slide-caption">${top3Formadores[0] ? `${escaparHtml(top3Formadores[0].nome)} lidera o ranking atual` : 'Ranking atualizado automaticamente'}</div>
        ${montarRodapeSlideApresentacao(2, totalSlidesApresentacao)}
      </div>`
  };

  const slideLojas = {
    titulo: 'Slide 4',
    subtitulo: 'Melhores lojas por formador.',
    periodo,
    filtrosHtml,
    html: `
      <div class="presentation-slide presentation-slide-visual presentation-slide-showcase presentation-conecta-slide">
        ${montarHeroSlideApresentacao('MELHOR LOJA POR FORMADOR', periodo)}
        <div class="presentation-showcase-grid">
          ${destaques.map((item) => `
            <article class="presentation-showcase-card ${classeExecucaoApresentacao(item.execucao)}">
              <div class="presentation-showcase-formador">${escaparHtml(item.formador)}</div>
              <div class="presentation-showcase-loja">${escaparHtml(item.loja)}</div>
              <div class="presentation-showcase-value">${item.execucao}%</div>
              <div class="presentation-showcase-meta">${item.realizadas} de ${item.total}</div>
              <div class="presentation-showcase-badge">✩ EM DESTAQUE</div>
            </article>`).join('')}
        </div>
        <div class="presentation-slide-caption">Melhores lojas por desempenho dos formadores ativos</div>
        ${montarRodapeSlideApresentacao(3, totalSlidesApresentacao)}
      </div>`
  };

  return [slideExecutivo, slideMeta, slideFormadores, slideLojas];
}

function limparTimerApresentacao() {
  if (apresentacaoState.timer) {
    clearInterval(apresentacaoState.timer);
    apresentacaoState.timer = null;
  }
}

function iniciarAutoplayApresentacao() {
  limparTimerApresentacao();
  if (!apresentacaoState.aberta || !apresentacaoState.autoplay) return;
  apresentacaoState.timer = setInterval(() => {
    const slides = gerarSlidesApresentacao();
    if (!slides.length) return;
    apresentacaoState.slideAtual = (apresentacaoState.slideAtual + 1) % slides.length;
    renderizarApresentacaoSeAberta();
  }, APRESENTACAO_CONFIG.intervaloMs);
}

function irParaSlideApresentacao(indice) {
  const slides = gerarSlidesApresentacao();
  if (!slides.length) return;
  const total = slides.length;
  apresentacaoState.slideAtual = ((indice % total) + total) % total;
  renderizarApresentacaoSeAberta();
  iniciarAutoplayApresentacao();
}

function renderizarApresentacaoSeAberta() {
  if (!apresentacaoState.aberta) return;
  const modal = document.getElementById('presentationModal');
  const title = document.getElementById('presentationTitle');
  const subtitle = document.getElementById('presentationSubtitle');
  const counter = document.getElementById('presentationCounter');
  const period = document.getElementById('presentationPeriod');
  const content = document.getElementById('presentationContent');
  const dots = document.getElementById('presentationDots');
  const filtersEl = document.getElementById('presentationFilters');
  const playPause = document.getElementById('presentationPlayPause');
  if (!modal || !content) return;

  const slides = gerarSlidesApresentacao();
  if (!slides.length) return;
  if (apresentacaoState.slideAtual >= slides.length) apresentacaoState.slideAtual = 0;
  const slide = slides[apresentacaoState.slideAtual];

  if (title) title.textContent = slide.titulo;
  if (subtitle) subtitle.textContent = slide.subtitulo;
  if (counter) counter.textContent = `Slide ${apresentacaoState.slideAtual + 1} de ${slides.length}`;
  if (period) period.textContent = slide.periodo;
  if (content) {
    content.innerHTML = `
      <div class="presentation-viewport">
        <div class="presentation-scale-box">
          <div class="presentation-frame" data-base-width="1920" data-base-height="1080">${slide.html}</div>
        </div>
      </div>`;
  }
  if (filtersEl) filtersEl.innerHTML = slide.filtrosHtml;
  if (playPause) playPause.textContent = apresentacaoState.autoplay ? 'Pausar' : 'Retomar';
  if (dots) {
    dots.innerHTML = slides.map((item, index) => `<button class="presentation-dot ${index === apresentacaoState.slideAtual ? 'active' : ''}" type="button" aria-label="Ir para slide ${index + 1}" data-slide-index="${index}"></button>`).join('');
  }
  requestAnimationFrame(aplicarAjusteFitApresentacao);
}

function abrirApresentacao({ auto = false } = {}) {
  const modal = document.getElementById('presentationModal');
  if (!modal) return;
  apresentacaoState.aberta = true;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('presentation-open');
  renderizarApresentacaoSeAberta();
  iniciarAutoplayApresentacao();
}

function fecharApresentacao() {
  const modal = document.getElementById('presentationModal');
  if (!modal) return;
  apresentacaoState.aberta = false;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('presentation-open');
  limparTimerApresentacao();
}

function alternarAutoplayApresentacao() {
  apresentacaoState.autoplay = !apresentacaoState.autoplay;
  renderizarApresentacaoSeAberta();
  iniciarAutoplayApresentacao();
}

function alternarFullscreenApresentacao() {
  const stage = document.querySelector('#presentationModal .presentation-stage');
  if (!stage) return;
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch?.(() => {});
    return;
  }
  stage.requestFullscreen?.().catch?.(() => {});
}

function configurarApresentacao() {
  const openBtn = document.getElementById('presentationToggle');
  const closeBtn = document.getElementById('presentationClose');
  const prevBtn = document.getElementById('presentationPrev');
  const nextBtn = document.getElementById('presentationNext');
  const playPauseBtn = document.getElementById('presentationPlayPause');
  const fullscreenBtn = document.getElementById('presentationFullscreen');
  const dots = document.getElementById('presentationDots');
  if (openBtn) openBtn.addEventListener('click', () => abrirApresentacao());
  if (closeBtn) closeBtn.addEventListener('click', fecharApresentacao);
  if (prevBtn) prevBtn.addEventListener('click', () => irParaSlideApresentacao(apresentacaoState.slideAtual - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => irParaSlideApresentacao(apresentacaoState.slideAtual + 1));
  if (playPauseBtn) playPauseBtn.addEventListener('click', alternarAutoplayApresentacao);
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', alternarFullscreenApresentacao);
  if (dots) {
    dots.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-slide-index]');
      if (!button) return;
      irParaSlideApresentacao(Number(button.dataset.slideIndex));
    });
  }
  window.addEventListener('resize', () => {
    if (apresentacaoState.aberta) requestAnimationFrame(aplicarAjusteFitApresentacao);
  });
  document.addEventListener('fullscreenchange', () => {
    if (apresentacaoState.aberta) requestAnimationFrame(aplicarAjusteFitApresentacao);
  });
  document.addEventListener('keydown', (event) => {
    if (!apresentacaoState.aberta) return;
    if (event.key === 'Escape') fecharApresentacao();
    if (event.key === 'ArrowRight') irParaSlideApresentacao(apresentacaoState.slideAtual + 1);
    if (event.key === 'ArrowLeft') irParaSlideApresentacao(apresentacaoState.slideAtual - 1);
    if (event.key === ' ') {
      event.preventDefault();
      alternarAutoplayApresentacao();
    }
  });
}

function autoAbrirApresentacaoSeSolicitado() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('apresentacao') === '1' || params.get('tv') === '1' || params.get('conecta') === '1') {
    abrirApresentacao({ auto: true });
  }
}

function inicializarAplicacao() {
  if (window.__sfPainelInicializado) return;
  window.__sfPainelInicializado = true;
  configurarSidebar();
  configurarEventos();
  configurarAdmin();
  configurarAbasRegionaisDashboard();
  configurarAbasResumo();
  configurarCurvaExecucao();
  configurarApresentacao();
  salvarStore(STORAGE_KEYS.routineConfig, configRotinas);
  salvarStore(STORAGE_KEYS.knownStores, LOJAS_ATIVAS.map((loja) => loja.nome));
  inicializarBaseAtiva();
  agendarLimpezaDadosBrutos();
  autoAbrirApresentacaoSeSolicitado();
  inicializarFirebaseOpcional();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarAplicacao);
} else {
  inicializarAplicacao();
}
