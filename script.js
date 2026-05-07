
(function(){
  'use strict';

  const STORAGE_KEY = 'sofolhas_comercial_v1';
  const IDB_NAME = 'sofolhas_comercial_db';
  const IDB_STORE = 'payloads';
  const SALES_CHUNK_PREFIX = `${STORAGE_KEY}_sales_chunk_`;
  const SALES_META_KEY = `${STORAGE_KEY}_sales_meta`;
  const SALES_CHUNK_SIZE = 4000;
  const IDB_OPERATION_TIMEOUT_MS = 30000;
  const CLOUD_COLLECTION = 'sistemas';
  const CLOUD_DOC_ID = 'pedido_comercial';
  const CLOUD_CHUNK_COLLECTION = 'payload_chunks';
  const CLOUD_SALES_CHUNK_COLLECTION = 'sales_chunks';
  const CLOUD_SALES_CHUNK_SIZE = 500;
  const CLOUD_CHUNK_SIZE = 700000;
  const ADMIN_USER = { usuario: 'gerenciacomercial', senha: 'sofolhas2026', nome: 'Administrador Comercial', role: 'admin' };
  const ADMIN_PAGES = [
    {id:'dashboard', icon:'▥', label:'Dashboard'},
    {id:'fechamento-dia', icon:'✓', label:'Fechamento do Dia'},
    {id:'inventario-saida', icon:'▨', label:'Inventário de Saída'},
    {id:'estoque-loja', icon:'▦', label:'Estoque em Loja'},
    {id:'analises', icon:'▥', label:'Análises Comerciais'},
    {id:'analise-pedidos', icon:'▤', label:'Pedidos'},
    {id:'importar-pdf', icon:'▣', label:'Importar XML/PDF'},
    {id:'conferencia-importacao', icon:'☑', label:'Conferência de Importação'},
    {id:'duplicidades', icon:'⧉', label:'Duplicidades'},
    {id:'ofertas', icon:'🏷', label:'Ofertas'},
    {id:'precos', icon:'💲', label:'Acompanhamento de Preços'},
    {id:'chamados', icon:'✉', label:'Chamados'},
    {id:'bases', icon:'▤', label:'Bases de Venda'},
    {id:'conciliacao', icon:'◈', label:'Conciliação'},
    {id:'faltas', icon:'◇', label:'Faltas e Qualidade'},
    {id:'pendencias', icon:'▧', label:'Pendências de Bandejas'},
    {id:'itens-obrigatorios', icon:'🚨', label:'Itens Obrigatórios'},
    {id:'rupturas', icon:'⚠', label:'Rupturas'},
    {id:'mix', icon:'◌', label:'Mix por Loja'},
    {id:'usuarios', icon:'♙', label:'Usuários', adminOnly:true},
    {id:'historico', icon:'↺', label:'Histórico'}
  ];
  const NAV_GROUPS = [
    {title:'Painel', pages:['dashboard','fechamento-dia']},
    {title:'Importações', pages:['importar-pdf','conferencia-importacao','duplicidades','bases','conciliacao']},
    {title:'Comercial', pages:['analises','analise-pedidos','ofertas','precos']},
    {title:'Operação', pages:['inventario-saida','estoque-loja','rupturas','itens-obrigatorios','faltas','pendencias','mix']},
    {title:'Atendimento', pages:['chamados']},
    {title:'Administração', pages:['usuarios','historico']}
  ];
  const STORE_NAV_GROUPS = [
    {title:'Início', items:[['inicio-loja','⌂','Visão Geral']]},
    {title:'Operação da loja', items:[['pedido','▣','Pedidos'], ['quebras','⚠','Quebras'], ['inventario-saida','▨','Inventário'], ['estoque-loja','▦','Estoque em Loja'], ['precos-loja','💲','Preços em Loja']]},
    {title:'Atendimento', items:[['chamados','✉','Chamados']]},
    {title:'Histórico', items:[['meus-pedidos','▤','Meus Pedidos'], ['historico-loja','↺','Histórico'], ['correcao-loja','⚠','Solicitações']]}
  ];
  const DEFAULT_COMMERCIAL_PERMISSIONS = ['dashboard','fechamento-dia','inventario-saida','estoque-loja','analises','analise-pedidos','ofertas','precos','chamados','bases','conciliacao','duplicidades','faltas','pendencias','rupturas','historico'];
  const DEFAULT_COMMERCIAL_USERS = [
    { usuario:'anderson.wagner', senha:'sofolhas2026', nome:'Anderson Wagner', role:'commercial', active:true, permissions:[...DEFAULT_COMMERCIAL_PERMISSIONS] },
    { usuario:'matheus.victor', senha:'sofolhas2026', nome:'Matheus Victor', role:'commercial', active:true, permissions:[...DEFAULT_COMMERCIAL_PERMISSIONS] },
    { usuario:'joao.victor', senha:'sofolhas2026', nome:'João Victor', role:'commercial', active:true, permissions:[...DEFAULT_COMMERCIAL_PERMISSIONS] }
  ];
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const fmt = new Intl.NumberFormat('pt-BR');
  const money = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});

  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  const slug = (value) => normalize(value).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  const onlyDigits = (value) => String(value || '').replace(/\D+/g,'');
  const normalizeLogin = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'')
    .trim();

  // Catálogo mínimo de produtos ativo dentro do script.
  // Ele evita falha de reconhecimento no XML quando o arquivo data/default-data.js
  // não carrega no GitHub/cache ou quando o Firebase traz uma base antiga sem produtos.
  const FALLBACK_ACTIVE_PRODUCTS = [
    {
      "id": "abobora_italia_bdj",
      "codigoMix": "BDJ AB. ITÁLIA",
      "nomeSistema": "ABÓBORA ITÁLIA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "ABOBORA ITALIA",
        "ABOBORA ITALIA SO FOLHAS BDJ 300G",
        "ABÓBORA ITÁLIA",
        "ABÓBORA ITÁLIA BDJ",
        "BDJ AB ITALIA",
        "BDJ AB. ITÁLIA"
      ]
    },
    {
      "id": "abobora_menina_bdj",
      "codigoMix": "BDJ AB. MENINA",
      "nomeSistema": "ABÓBORA MENINA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "ABOBORA MENINA",
        "ABOBORA MENINA SO FOLHAS BDJ 300G",
        "ABÓBORA MENINA",
        "ABÓBORA MENINA BDJ",
        "BDJ AB MENINA",
        "BDJ AB. MENINA"
      ]
    },
    {
      "id": "alface_americana_bdj",
      "codigoMix": "BDJ AMER. BDJ",
      "nomeSistema": "ALFACE AMERICANA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "ALFACE AMERICANA",
        "ALFACE AMERICANA BDJ",
        "ALFACE AMERICANA SO FOLHAS BDJ",
        "BDJ AMER BDJ",
        "BDJ AMER. BDJ"
      ]
    },
    {
      "id": "berinjela_bdj",
      "codigoMix": "BDJ BERINJELA",
      "nomeSistema": "BERINJELA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ BERINJELA",
        "BERINJELA",
        "BERINJELA BDJ",
        "BERINJELA SO FOLHAS BDJ 300G",
        "BERINGELA SO FOLHAS UN",
        "BERINGELA"
      ]
    },
    {
      "id": "couve_flor_bdj",
      "codigoMix": "BDJ COUVE-FLOR",
      "nomeSistema": "COUVE-FLOR BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ COUVE FLOR",
        "BDJ COUVE-FLOR",
        "COUVE FLOR",
        "COUVE FLOR SO FOLHAS UN",
        "COUVE FLOR UND",
        "COUVE-FLOR",
        "COUVE-FLOR BDJ",
        "COUVE-FLOR UND"
      ]
    },
    {
      "id": "jilo_bdj",
      "codigoMix": "BDJ JILÓ",
      "nomeSistema": "JILÓ BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ JILO",
        "BDJ JILÓ",
        "JILO",
        "JILO SO FOLHAS BDJ 300G",
        "JILÓ",
        "JILÓ BDJ",
        "JILO BDJ"
      ]
    },
    {
      "id": "mandioca_700g",
      "codigoMix": "BDJ MANDIOCA 700G",
      "nomeSistema": "MANDIOCA 700G",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ MANDIOCA 700G",
        "MANDIOCA 700G"
      ]
    },
    {
      "id": "maxixe_bdj",
      "codigoMix": "BDJ MAXIXE",
      "nomeSistema": "MAXIXE BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ MAXIXE",
        "MAXIXE",
        "MAXIXE BDJ",
        "MAXIXE SO FOLHAS BDJ 300G"
      ]
    },
    {
      "id": "milho_verde_bdj",
      "codigoMix": "BDJ MILHO VERDE BDJ",
      "nomeSistema": "MILHO VERDE BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ MILHO VERDE BDJ",
        "MILHO VERDE",
        "MILHO VERDE BDJ",
        "MILHO VERDE SO FOLHAS BDJ"
      ]
    },
    {
      "id": "pepino_japones_bdj",
      "codigoMix": "BDJ PEP. JAPON.",
      "nomeSistema": "PEPINO JAPONÊS BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ PEP JAPON",
        "BDJ PEP. JAPON.",
        "PEPINO JAPONES",
        "PEPINO JAPONES SO FOLHAS BDJ 300G",
        "PEPINO JAPONÊS",
        "PEPINO JAPONÊS BDJ"
      ]
    },
    {
      "id": "pimenta_biquinho_bdj",
      "codigoMix": "BDJ PIM. BIQUIN.",
      "nomeSistema": "PIMENTA BIQUINHO BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ PIM BIQUIN",
        "BDJ PIM. BIQUIN.",
        "PIMENTA BIQUINHO",
        "PIMENTA BIQUINHO BDJ",
        "PIMENTA BIQUINHO SO FOLHAS BDJ"
      ]
    },
    {
      "id": "pimenta_de_cheiro_bdj",
      "codigoMix": "BDJ PIM. CHEIRO",
      "nomeSistema": "PIMENTA DE CHEIRO BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ PIM CHEIRO",
        "BDJ PIM. CHEIRO",
        "PIMENTA DE CHEIRO",
        "PIMENTA DE CHEIRO BDJ",
        "PIMENTA DE CHEIRO SO FOLHAS BDJ"
      ]
    },
    {
      "id": "pimentao_colorido_bdj",
      "codigoMix": "BDJ PIM. COLOR.",
      "nomeSistema": "PIMENTÃO COLORIDO BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ PIM COLOR",
        "BDJ PIM. COLOR.",
        "PIMENTAO COLORIDO",
        "PIMENTAO SO FOLHAS BDJ COLORIDO",
        "PIMENTÃO COLORIDO",
        "PIMENTÃO COLORIDO BDJ"
      ]
    },
    {
      "id": "pimenta_dedo_de_moca_bdj",
      "codigoMix": "BDJ PIM. DEDO",
      "nomeSistema": "PIMENTA DEDO DE MOÇA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ PIM DEDO",
        "BDJ PIM. DEDO",
        "PIMENTA DEDO DE MOCA",
        "PIMENTA DEDO DE MOCA SO FOLHAS BDJ",
        "PIMENTA DEDO DE MOÇA",
        "PIMENTA DEDO DE MOÇA BDJ"
      ]
    },
    {
      "id": "pimenta_malagueta_bdj",
      "codigoMix": "BDJ PIM. MALAG.",
      "nomeSistema": "PIMENTA MALAGUETA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ PIM MALAG",
        "BDJ PIM. MALAG.",
        "PIMENTA MALAGUETA",
        "PIMENTA MALAGUETA BDJ",
        "PIMENTA MALAGUETA SO FOLHAS BDJ"
      ]
    },
    {
      "id": "quiabo_bdj",
      "codigoMix": "BDJ QUIABO",
      "nomeSistema": "QUIABO BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ QUIABO",
        "QUIABO",
        "QUIABO BDJ",
        "QUIABO SO FOLHAS",
        "QUIABO SO FOLHAS 300G",
        "QUIABO SO FOLHAS PC 300G"
      ]
    },
    {
      "id": "tomate_cereja_180g",
      "codigoMix": "BDJ TOMATE CEREJA 180G",
      "nomeSistema": "TOMATE CEREJA 180G",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ TOMATE CEREJA 180G",
        "TOMATE CEREJA",
        "TOMATE CEREJA 180G",
        "TOMATE CEREJA SO FOLHAS",
        "TOMATE CEREJA SO FOLHAS PC 180G"
      ]
    },
    {
      "id": "vagem_rasteira_bdj",
      "codigoMix": "BDJ V. RASTEIRA",
      "nomeSistema": "VAGEM RASTEIRA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ V RASTEIRA",
        "BDJ V. RASTEIRA",
        "VAGEM RASTEIRA",
        "VAGEM RASTEIRA BDJ",
        "VAGEM RASTEIRA SO FOLHAS 250G"
      ]
    },
    {
      "id": "vagem_branca_bdj",
      "codigoMix": "BDJ VAGEM BCA",
      "nomeSistema": "VAGEM BRANCA BDJ",
      "tipo": "BANDEJA",
      "situacao": "ATIVO",
      "aliases": [
        "BDJ VAGEM BCA",
        "VAGEM BCA",
        "VAGEM BRANCA",
        "VAGEM BRANCA BDJ",
        "VAGEM SO FOLHAS 250G BCA"
      ]
    },
    {
      "id": "acelga_und",
      "codigoMix": "FLG ACELGA",
      "nomeSistema": "ACELGA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ACELGA",
        "ACELGA SO FOLHAS",
        "ACELGA SO FOLHAS UN",
        "ACELGA UND",
        "FLG ACELGA"
      ]
    },
    {
      "id": "agriao_und",
      "codigoMix": "FLG AGRIAO",
      "nomeSistema": "AGRIAO UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "AGRIAO",
        "AGRIAO SO FOLHAS",
        "AGRIAO SO FOLHAS UN",
        "AGRIAO UND",
        "AGRIÃO",
        "FLG AGRIAO"
      ]
    },
    {
      "id": "alecrin_und",
      "codigoMix": "FLG ALECRIN",
      "nomeSistema": "ALECRIN UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALECRIM",
        "ALECRIM SO FOLHAS",
        "ALECRIN",
        "ALECRIN SO FOLHAS UN",
        "ALECRIN UND",
        "FLG ALECRIN"
      ]
    },
    {
      "id": "alho_poro_und",
      "codigoMix": "FLG ALHO PORO",
      "nomeSistema": "ALHO PORO UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALHO PORO",
        "ALHO PORO SO FOLHAS",
        "ALHO PORO SO FOLHAS UN",
        "ALHO PORO UND",
        "FLG ALHO PORO"
      ]
    },
    {
      "id": "almeirao_und",
      "codigoMix": "FLG ALMEIRAO",
      "nomeSistema": "ALMEIRAO UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALMEIRAO",
        "ALMEIRAO SO FOLHAS",
        "ALMEIRAO UND",
        "ALMEIRÃO",
        "FLG ALMEIRAO"
      ]
    },
    {
      "id": "alface_americana",
      "codigoMix": "FLG AMERICANA",
      "nomeSistema": "ALFACE AMERICANA",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALFACE AMER SO FOLHAS",
        "ALFACE AMERICANA",
        "ALFACE AMERICANA SO FOLHAS",
        "ALFACE AMERICANA SO FOLHAS UN",
        "FLG AMERICANA"
      ]
    },
    {
      "id": "brocolis_americano",
      "codigoMix": "FLG BROC AMER.",
      "nomeSistema": "BRÓCOLIS AMERICANO",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "BROCOLIS AMERICANO",
        "BROCOLIS AMERICANO FLG",
        "BROCOLIS AMERICANO SO FOLHAS",
        "BROCOLIS AMERICANO SO FOLHAS UN",
        "BROCOLIS AMERICANO SO FOLHAS BDJ 400G",
        "BROCOLIS AMERICANO BDJ 400G",
        "BRÓCOLIS AMERICANO",
        "FLG BROC AMER."
      ]
    },
    {
      "id": "brocolis_comum",
      "codigoMix": "FLG BROC COM",
      "nomeSistema": "BRÓCOLIS COMUM",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "BROCOLIS COMUM",
        "BROCOLIS COMUM FLG",
        "BROCOLIS COMUM SO FOLHAS",
        "BROCOLIS COMUM SO FOLHAS UN",
        "BRÓCOLIS COMUM",
        "FLG BROC COM"
      ]
    },
    {
      "id": "cebolinha",
      "codigoMix": "FLG CEBOLA",
      "nomeSistema": "CEBOLINHA",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "CEBOLINHA",
        "CEBOLINHA SO FOLHAS",
        "CEBOLINHA SO FOLHAS UN",
        "FLG CEBOLA"
      ]
    },
    {
      "id": "cheiro_verde",
      "codigoMix": "FLG CH.VERDE",
      "nomeSistema": "CHEIRO VERDE",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "CH VERDE",
        "CHEIRO VERDE",
        "CHEIRO VERDE SO FOLHAS",
        "CHEIRO VERDE SO FOLHAS UN FILETADO",
        "FLG CH VERDE",
        "FLG CH.VERDE"
      ]
    },
    {
      "id": "chicoria_und",
      "codigoMix": "FLG CHICORIA",
      "nomeSistema": "CHICORIA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "CHICORIA",
        "CHICORIA UND",
        "FLG CHICORIA"
      ]
    },
    {
      "id": "coentro_und",
      "codigoMix": "FLG COENTRO",
      "nomeSistema": "COENTRO UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "COENTRO",
        "COENTRO SO FOLHAS",
        "COENTRO SO FOLHAS UN",
        "COENTRO UND",
        "FLG COENTRO"
      ]
    },
    {
      "id": "couve_und",
      "codigoMix": "FLG COUVE",
      "nomeSistema": "COUVE UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "COUVE",
        "COUVE SO FOLHAS",
        "COUVE SO FOLHAS UN",
        "COUVE UND",
        "FLG COUVE"
      ]
    },
    {
      "id": "couve_picada_200g",
      "codigoMix": "FLG COUVE PIC",
      "nomeSistema": "COUVE PICADA 200G",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "COUVE PICADA",
        "COUVE PICADA 200G",
        "COUVE PICADA SO FOLHAS",
        "COUVE PICADO",
        "COUVE PICADO UND",
        "COUVE SO FOLHAS PICADA",
        "FLG COUVE PIC"
      ]
    },
    {
      "id": "alface_crespa_und",
      "codigoMix": "FLG CRESPA",
      "nomeSistema": "ALFACE CRESPA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALFACE CRESPA",
        "ALFACE CRESPA SO FOLHAS",
        "ALFACE CRESPA SO FOLHAS UN",
        "ALFACE CRESPA UND",
        "FLG CRESPA"
      ]
    },
    {
      "id": "espinafre_und",
      "codigoMix": "FLG ESPINAFRE",
      "nomeSistema": "ESPINAFRE UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ESPINAFRE",
        "ESPINAFRE SO FOLHAS",
        "ESPINAFRE SO FOLHAS UN",
        "ESPINAFRE UND",
        "FLG ESPINAFRE"
      ]
    },
    {
      "id": "hortela_und",
      "codigoMix": "FLG HORTELA",
      "nomeSistema": "HORTELÃ UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "FLG HORTELA",
        "HORTELA",
        "HORTELA SO FOLHAS",
        "HORTELA SO FOLHAS UN",
        "HORTELÃ",
        "HORTELÃ UND"
      ]
    },
    {
      "id": "alface_lisa_und",
      "codigoMix": "FLG LISA",
      "nomeSistema": "ALFACE LISA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALFACE LISA",
        "ALFACE LISA UND",
        "FLG LISA"
      ]
    },
    {
      "id": "manjericao_und",
      "codigoMix": "FLG MANJERICAO",
      "nomeSistema": "MANJERICÃO UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "FLG MANJERICAO",
        "MANJERICAO",
        "MANJERICAO SO FOLHAS",
        "MANJERICÃO",
        "MANJERICÃO UND"
      ]
    },
    {
      "id": "alface_mimosa_und",
      "codigoMix": "FLG MIMOSA",
      "nomeSistema": "ALFACE MIMOSA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALFACE MIMOSA",
        "ALFACE MIMOSA UND",
        "FLG MIMOSA"
      ]
    },
    {
      "id": "rabanete_und",
      "codigoMix": "FLG RABANETE",
      "nomeSistema": "RABANETE UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "FLG RABANETE",
        "RABANETE",
        "RABANETE UND"
      ]
    },
    {
      "id": "alface_roxa_und",
      "codigoMix": "FLG ROXA",
      "nomeSistema": "ALFACE ROXA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "ALFACE ROXA",
        "ALFACE ROXA SO FOLHAS",
        "ALFACE ROXA SO FOLHAS UN",
        "ALFACE ROXA UND",
        "FLG ROXA"
      ]
    },
    {
      "id": "rucula_und",
      "codigoMix": "FLG RUCULA",
      "nomeSistema": "RÚCULA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "FLG RUCULA",
        "RUCULA",
        "RUCULA SO FOLHAS",
        "RUCULA SO FOLHAS UN",
        "RÚCULA",
        "RÚCULA UND"
      ]
    },
    {
      "id": "salsa_und",
      "codigoMix": "FLG SALSA",
      "nomeSistema": "SALSA UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "FLG SALSA",
        "SALSA",
        "SALSA SO FOLHAS",
        "SALSA SO FOLHAS UN",
        "SALSA UND"
      ]
    },
    {
      "id": "salsao_und",
      "codigoMix": "FLG SALSÃO",
      "nomeSistema": "SALSÃO UND",
      "tipo": "FOLHAGEM",
      "situacao": "ATIVO",
      "aliases": [
        "FLG SALSÃO",
        "SALSÃO",
        "SALSÃO UND"
      ]
    }
  ];

  const XML_PRODUCT_DIRECT_ID = {
    "ALFACE CRESPA": "alface_crespa_und",
    "CHEIRO VERDE": "cheiro_verde",
    "HORTELA": "hortela_und",
    "COUVE": "couve_und",
    "ALFACE AMERICANA": "alface_americana",
    "CEBOLINHA": "cebolinha",
    "COENTRO": "coentro_und",
    "RUCULA": "rucula_und",
    "MANJERICAO": "manjericao_und",
    "AGRIAO": "agriao_und",
    "ALFACE ROXA": "alface_roxa_und",
    "ACELGA": "acelga_und",
    "ESPINAFRE": "espinafre_und",
    "ALECRIM": "alecrin_und",
    "SALSA": "salsa_und",
    "BROCOLIS AMERICANO": "brocolis_americano",
    "COUVE PICADO UND": "couve_picada_200g",
    "COUVE PICADA UND": "couve_picada_200g",
    "ALHO PORO": "alho_poro_und",
    "PIMENTA DE CHEIRO": "pimenta_de_cheiro_bdj",
    "ALFACE LISA": "alface_lisa_und",
    "QUIABO": "quiabo_bdj",
    "ALFACE MIMOSA": "alface_mimosa_und",
    "PIMENTAO COLORIDO": "pimentao_colorido_bdj",
    "COUVE FLOR UND": "couve_flor_bdj",
    "COUVE FLOR": "couve_flor_bdj",
    "JILO": "jilo_bdj",
    "RABANETE": "rabanete_und",
    "ALFACE AMERICANA BDJ": "alface_americana_bdj",
    "PEPINO JAPONES": "pepino_japones_bdj",
    "BERINJELA": "berinjela_bdj",
    "BERINGELA": "berinjela_bdj",
    "PIMENTA MALAGUETA": "pimenta_malagueta_bdj",
    "VAGEM RASTEIRA": "vagem_rasteira_bdj",
    "PIMENTA DEDO DE MOCA": "pimenta_dedo_de_moca_bdj",
    "PIMENTA DEDO DE MOÇA": "pimenta_dedo_de_moca_bdj",
    "MANDIOCA 700G": "mandioca_700g",
    "ABOBORA ITALIA": "abobora_italia_bdj",
    "ABÓBORA ITÁLIA": "abobora_italia_bdj",
    "VAGEM BRANCA": "vagem_branca_bdj",
    "PIMENTA BIQUINHO": "pimenta_biquinho_bdj",
    "MAXIXE": "maxixe_bdj",
    "BROCOLIS COMUM": "brocolis_comum",
    "ABOBORA MENINA": "abobora_menina_bdj",
    "ABÓBORA MENINA": "abobora_menina_bdj",
    "SALSAO": "salsao_und",
    "SALSÃO": "salsao_und"
  };

  const toNumber = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (v == null || v === '') return 0;
    let s = String(v).trim().replace(/\s/g,'').replace(/[^\d,.-]/g,'');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',','.');
    else if (s.includes(',')) s = s.replace(',','.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const parseDate = (v) => {
    if (!v) return '';
    if (v instanceof Date) return v.toISOString().slice(0,10);
    if (typeof v === 'number' && window.XLSX) {
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
  };
  const todayISO = () => new Date().toISOString().slice(0,10);
  const addDays = (date, days) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate()+days);
    return d.toISOString().slice(0,10);
  };
  function promoterDeliveryReference(fillDate=todayISO()){
    const base = parseDate(fillDate) || todayISO();
    const d = new Date(base + 'T12:00:00');
    const dow = d.getDay(); // 0 domingo, 1 segunda, 2 terça...
    if (dow === 1) {
      const saturday = addDays(base, -2);
      const sunday = addDays(base, -1);
      return {fillDate:base, primaryDate:sunday, dates:[saturday, sunday], isWeekend:true};
    }
    const previous = addDays(base, -1);
    return {fillDate:base, primaryDate:previous, dates:[previous], isWeekend:false};
  }

  function promoterDeliveryReferenceLabel(ref){
    const dates = unique((ref?.dates || []).filter(Boolean));
    if (!dates.length) return formatDate(ref?.primaryDate || todayISO());
    if (dates.length === 1) return formatDate(dates[0]);
    return `${dates.map(formatDate).join(' e ')}`;
  }

  function promoterDeliveryReferenceNotice(ref){
    const label = promoterDeliveryReferenceLabel(ref);
    const fill = formatDate(ref?.fillDate || todayISO());
    return `Preenchimento de ${fill} vinculado automaticamente à entrega de ${label}.`;
  }

  const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));
  const sum = (arr) => arr.reduce((a,b)=>a+toNumber(b),0);
  const uid = (prefix='id') => prefix + '_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);


  function openLocalDb(){
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(key){
    const db = await openLocalDb();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(key, value){
    const db = await openLocalDb();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDelete(key){
    const db = await openLocalDb();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  function withTimeout(promise, ms, label){
    let timer;
    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label || 'Operação demorou mais que o esperado.')), ms);
      })
    ]);
  }

  async function idbSetSafe(key, value, label='Salvamento IndexedDB'){
    return withTimeout(idbSet(key, value), IDB_OPERATION_TIMEOUT_MS, label);
  }

  async function loadSalesChunks(){
    const meta = await idbGet(SALES_META_KEY);
    if (!meta || meta.storage !== 'indexeddb-chunks' || !toNumber(meta.chunkCount)) return null;
    const sales = [];
    for (let i = 0; i < toNumber(meta.chunkCount); i++) {
      const chunk = await idbGet(`${SALES_CHUNK_PREFIX}${i}`);
      if (Array.isArray(chunk) && chunk.length) sales.push(...chunk);
      await yieldToBrowser();
    }
    return sales;
  }

  async function persistSalesChunks(sales, updatedAt, onProgress){
    const rows = Array.isArray(sales) ? sales : [];
    const oldMeta = await idbGet(SALES_META_KEY).catch(() => null);
    const chunkCount = Math.ceil(rows.length / SALES_CHUNK_SIZE);
    const oldChunkCount = toNumber(oldMeta?.chunkCount || 0);
    for (let i = 0; i < chunkCount; i++) {
      const start = i * SALES_CHUNK_SIZE;
      const chunk = rows.slice(start, start + SALES_CHUNK_SIZE);
      onProgress?.(i + 1, Math.max(chunkCount, 1), `Salvando base no navegador em lotes (${i + 1}/${chunkCount})...`);
      await idbSetSafe(`${SALES_CHUNK_PREFIX}${i}`, chunk, `Salvamento da base de vendas em lotes (${i + 1}/${chunkCount})`);
      await yieldToBrowser();
    }
    for (let i = chunkCount; i < oldChunkCount; i++) {
      await idbDelete(`${SALES_CHUNK_PREFIX}${i}`).catch(() => {});
    }
    await idbSetSafe(SALES_META_KEY, {storage:'indexeddb-chunks', chunkCount, chunkSize:SALES_CHUNK_SIZE, records:rows.length, updatedAt}, 'Salvamento do índice da base de vendas');
  }

  async function clearSalesChunks(){
    const oldMeta = await idbGet(SALES_META_KEY).catch(() => null);
    for (let i = 0; i < toNumber(oldMeta?.chunkCount || 0); i++) {
      await idbDelete(`${SALES_CHUNK_PREFIX}${i}`).catch(() => {});
    }
    await idbDelete(SALES_META_KEY).catch(() => {});
  }

  async function yieldToBrowser(){
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  function operationalScore(data){
    if (!data || typeof data !== 'object') return 0;
    return [data.sales, data.deliveries, data.orders, data.offers, data.tickets, data.inventoryOut, data.importIssues, data.cancelledNfes, data.importDuplicates]
      .reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
  }

  function dataUpdatedAt(data){
    return String(data?._updatedAt || data?.updatedAt || '');
  }

  function chooseStartupData(localData, cloudData){
    const cloudPayload = cloudData?.payload || null;
    if (!localData && !cloudPayload) return null;
    if (!localData) return cloudPayload;
    if (!cloudPayload) return localData;
    const localUpdated = dataUpdatedAt(localData);
    const cloudUpdated = String(cloudData.updatedAt || dataUpdatedAt(cloudPayload));
    if (cloudUpdated && localUpdated && cloudUpdated !== localUpdated) return cloudUpdated > localUpdated ? cloudPayload : localData;
    const cloudScore = operationalScore(cloudPayload);
    const localScore = operationalScore(localData);
    return cloudScore >= localScore ? cloudPayload : localData;
  }

  async function persistLocalSnapshot(data){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(_) {}
    try { await idbSet(STORAGE_KEY, data); } catch(e) { console.warn('Falha ao gravar cópia local.', e); }
  }

  function updatePdfProgress(current, total, message){
    const el = $('#pdfImportLog');
    if (!el) return;
    const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    el.className = 'pdf-progress-box';
    el.innerHTML = `
      <div class="pdf-progress-head">
        <strong>Importação mensal em andamento</strong>
        <span>${pct}%</span>
      </div>
      <div class="pdf-progress-bar"><span style="width:${pct}%"></span></div>
      <div class="pdf-progress-text">${escapeHtml(message || 'Processando arquivos...')}</div>
      <div class="muted small">Pode demorar em arquivos grandes. Não feche esta aba até concluir.</div>
    `;
  }

  const Store = {
    cloudDoc(){
      return this.cloud.collection(CLOUD_COLLECTION).doc(CLOUD_DOC_ID);
    },
    async loadCloudPayload(snapshot=null){
      if (!this.usingCloud || !this.cloud) return null;
      const docRef = this.cloudDoc();
      const snap = snapshot || await docRef.get();
      if (!snap.exists) return null;
      const meta = snap.data() || {};
      let payload = meta.payload || null;
      if (meta.storage === 'chunked' && toNumber(meta.chunkCount) > 0) {
        const qs = await docRef.collection(CLOUD_CHUNK_COLLECTION).orderBy('idx').get();
        const chunks = [];
        qs.forEach(doc => {
          const item = doc.data() || {};
          if (typeof item.chunk === 'string') chunks[toNumber(item.idx)] = item.chunk;
        });
        const text = chunks.slice(0, toNumber(meta.chunkCount)).join('');
        if (text) payload = JSON.parse(text);
      }
      if (payload && meta.salesStorage === 'chunked-arrays' && toNumber(meta.salesChunkCount) > 0) {
        try {
          const qs = await docRef.collection(CLOUD_SALES_CHUNK_COLLECTION).orderBy('idx').get();
          const salesChunks = [];
          qs.forEach(doc => {
            const item = doc.data() || {};
            if (Array.isArray(item.rows)) salesChunks[toNumber(item.idx)] = item.rows;
          });
          payload.sales = [];
          salesChunks.slice(0, toNumber(meta.salesChunkCount)).forEach(rows => {
            if (Array.isArray(rows)) payload.sales.push(...rows);
          });
        } catch(e) {
          console.warn('Falha ao carregar base de vendas em lotes do Firestore.', e);
          payload.sales = payload.sales || [];
        }
      }
      return payload ? {payload, updatedAt: meta.updatedAt || dataUpdatedAt(payload)} : null;
    },
    async saveCloudPayload(updatedAt){
      if (!this.usingCloud || !this.cloud) return;
      this._savingCloud = true;
      try {
        const docRef = this.cloudDoc();
        const sourceData = this.data || {};
        const sales = Array.isArray(sourceData.sales) ? sourceData.sales : [];
        let payloadData = sourceData;
        let salesStorage = '';
        let salesChunkCount = 0;

        // Base de vendas grande não entra mais dentro de um único JSON gigante da nuvem.
        // Ela é gravada em lotes menores para reduzir congelamento do navegador.
        if (sales.length > 25000) {
          salesStorage = 'chunked-arrays';
          salesChunkCount = Math.ceil(sales.length / CLOUD_SALES_CHUNK_SIZE);
          payloadData = {
            ...sourceData,
            sales: [],
            _salesCloudStorage: salesStorage,
            _salesCloudRecords: sales.length,
            _salesCloudUpdatedAt: updatedAt
          };
          for (let i=0; i<salesChunkCount; i++) {
            const rows = sales.slice(i * CLOUD_SALES_CHUNK_SIZE, (i + 1) * CLOUD_SALES_CHUNK_SIZE);
            await docRef.collection(CLOUD_SALES_CHUNK_COLLECTION).doc(String(i).padStart(4,'0')).set({idx:i, rows, updatedAt});
            if (i % 4 === 0) await yieldToBrowser();
          }
        }

        const payloadText = JSON.stringify(payloadData || {});
        const metaBase = {updatedAt, salesStorage, salesChunkCount};
        if (payloadText.length < 850000) {
          await docRef.set({...metaBase, storage:'document', chunkCount:0, payload:payloadData});
          return;
        }
        const chunks = [];
        for (let i=0; i<payloadText.length; i+=CLOUD_CHUNK_SIZE) chunks.push(payloadText.slice(i, i+CLOUD_CHUNK_SIZE));
        for (let i=0; i<chunks.length; i++) {
          await docRef.collection(CLOUD_CHUNK_COLLECTION).doc(String(i).padStart(4,'0')).set({idx:i, chunk:chunks[i], updatedAt});
          if (i % 3 === 0) await yieldToBrowser();
        }
        await docRef.set({...metaBase, storage:'chunked', chunkCount:chunks.length, payload:null});
      } finally {
        setTimeout(() => { this._savingCloud = false; }, 800);
      }
    },
    startCloudListener(){
      if (!this.usingCloud || !this.cloud || this._cloudUnsubscribe) return;
      try {
        this._cloudUnsubscribe = this.cloudDoc().onSnapshot(async snap => {
          if (!snap.exists || this._savingCloud) return;
          const meta = snap.data() || {};
          const cloudUpdated = String(meta.updatedAt || '');
          if (!cloudUpdated || cloudUpdated <= dataUpdatedAt(this.data)) return;
          try {
            const cloudPayload = await this.loadCloudPayload(snap);
            if (!cloudPayload?.payload) return;
            this.data = migrate(cloudPayload.payload);
            await persistLocalSnapshot(this.data);
            $('#syncPill') && ($('#syncPill').textContent = 'Firestore sincronizado');
            if (state.session) {
              toast('Dados atualizados pelo Firebase.', 'ok');
              render();
            }
          } catch(e) { console.warn('Falha ao aplicar atualização do Firebase.', e); }
        });
      } catch(e) { console.warn('Listener do Firestore não iniciado.', e); }
    },
    async init() {
      this.cloud = null;
      this.usingCloud = false;
      this._savingCloud = false;
      this._pendingCloudUpdatedAt = '';
      this._cloudSaveTimer = null;
      this._localSaveTimer = null;
      this._queuedSaveOptions = null;
      this._queuedSaveResolvers = [];
      this._initializing = true;
      this._cloudReadComplete = false;
      this._cloudReadOk = false;
      try {
        if (window.firebase && window.firebaseConfig && window.firebaseConfig.apiKey) {
          if (!firebase.apps?.length) firebase.initializeApp(window.firebaseConfig);
          this.cloud = firebase.firestore();
          this.usingCloud = true;
          $('#syncPill') && ($('#syncPill').textContent = 'Firestore ativo');
        }
      } catch(e) { console.warn('Firebase não iniciado, usando localStorage.', e); }
      let localData = null;
      try { localData = await idbGet(STORAGE_KEY); } catch(e) { console.warn('IndexedDB indisponível. Tentando localStorage.', e); }
      if (!localData) {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            localData = parsed && parsed.storage === 'indexeddb' ? null : parsed;
          } catch(e) {
            console.warn('Base local corrompida. Recriando dados iniciais.', e);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
      let cloudData = null;
      if (this.usingCloud) {
        try {
          cloudData = await withTimeout(this.loadCloudPayload(), 6000, 'Leitura do Firestore demorou.');
          this._cloudReadOk = true;
        } catch(e) {
          console.warn('Falha ao ler dados do Firestore. Usando base local.', e);
          this._cloudReadOk = false;
        } finally {
          this._cloudReadComplete = true;
        }
      }
      const hasCloudPayload = !!cloudData?.payload;
      const hasLocalPayload = !!localData;
      let data = chooseStartupData(localData, cloudData);
      const usingSeedFallback = !data;
      if (!data) data = this.seed();
      data = migrate(data);
      let loadedSalesFromChunks = false;
      try {
        const chunkedSales = await loadSalesChunks();
        if (Array.isArray(chunkedSales) && chunkedSales.length && (!Array.isArray(data.sales) || chunkedSales.length > data.sales.length || data._salesStorage === 'indexeddb-chunks')) {
          data.sales = chunkedSales;
          loadedSalesFromChunks = true;
        }
      } catch(e) {
        console.warn('Falha ao carregar base de vendas em lotes. Usando payload principal.', e);
      }
      this.data = data;
      // Não sobrescreve o Firestore automaticamente com default-data/local antigo na abertura.
      // Regra operacional: se o Firebase tem payload, ele é a fonte; se estiver vazio ou falhar,
      // o sistema libera o uso local, mas só grava na nuvem após uma ação real do usuário/importação.
      const skipStartupCloudSave = loadedSalesFromChunks || usingSeedFallback || !hasCloudPayload || (this.usingCloud && !this._cloudReadOk && hasLocalPayload);
      await this.save({skipCloud:skipStartupCloudSave, skipSalesChunks:loadedSalesFromChunks});
      this._initializing = false;
      this.startCloudListener();
      return data;
    },
    seed(){
      const products = (window.DEFAULT_PRODUCTS || []).map(p => ({...p}));
      const stores = (window.DEFAULT_STORES || []).map(s => ({...s}));
      const users = [
        {...ADMIN_USER},
        ...DEFAULT_COMMERCIAL_USERS.map(u => ({...u, permissions:[...(u.permissions || [])]})),
        ...stores.map(s => ({ usuario:s.usuario, senha:s.senha, nome:s.nome, role:'store', storeId:s.id }))
      ];
      const storeMix = {};
      stores.forEach(s => products.forEach(p => {
        storeMix[`${s.id}|${p.id}`] = p.situacao === 'ATIVO';
      }));
      return {
        version: 1,
        products, stores, users, storeMix,
        sales: [],
        salesImports: [],
        deliveries: [],
        orders: [],
        offers: [],
        priceChecks: [],
        tickets: [],
        corrections: [],
        closedPendencies: [],
        criticalRuptureJustifications: [],
        inventoryOut: [],
        deletedCommercialUsers: [],
        nameReconciliations: { products: {}, stores: {} },
        conciliation: {
          FOLHAGEM: { baseDates: [], pendingDates: [], orderDate: todayISO(), increasePct: 0 },
          BANDEJA: { baseDates: [], pendingDates: [], orderDate: todayISO(), increasePct: 0 }
        },
        appConfig: {
          pedidoDeadline:'09:30',
          quebraDeadline:'10:00',
          bandejaDeadlineBufferDays: 3,
          criticalRuptureProductIds: ['alface_crespa_und','cheiro_verde','couve_und','brocolis_americano'],
          criticalRuptureProductsByRede: {},
          inventoryOutLimits: {},
          priceCheckWeekdays: [1,3,5],
          pricePermissionBootstrapDone: false
        }
      };
    },
    scheduleCloudSave(updatedAt, delay=1400){
      if (!this.usingCloud || !this.cloud) return;
      this._pendingCloudUpdatedAt = updatedAt || this._pendingCloudUpdatedAt || new Date().toISOString();
      if (this._cloudSaveTimer) clearTimeout(this._cloudSaveTimer);
      $('#syncPill') && ($('#syncPill').textContent = 'Firestore aguardando sincronização');
      this._cloudSaveTimer = setTimeout(() => this.flushCloudSave(), delay);
    },
    async flushCloudSave(){
      if (!this.usingCloud || !this.cloud) return;
      if (this._savingCloud) {
        this.scheduleCloudSave(this._pendingCloudUpdatedAt || new Date().toISOString(), 1600);
        return;
      }
      const updatedAt = this._pendingCloudUpdatedAt || new Date().toISOString();
      this._pendingCloudUpdatedAt = '';
      this._cloudSaveTimer = null;
      try {
        $('#syncPill') && ($('#syncPill').textContent = 'Firestore sincronizando em segundo plano');
        await this.saveCloudPayload(updatedAt);
        $('#syncPill') && ($('#syncPill').textContent = 'Firestore sincronizado');
      } catch(e) {
        this.lastSaveWarning = 'Dados salvos apenas neste navegador. Firebase não salvou.';
        $('#syncPill') && ($('#syncPill').textContent = 'Firebase não salvou');
        console.warn('Falha ao sincronizar Firestore', e);
      } finally {
        if (this._pendingCloudUpdatedAt) this.scheduleCloudSave(this._pendingCloudUpdatedAt, 1600);
      }
    },
    queueSave(options={}, delay=850){
      this._queuedSaveOptions = {...(this._queuedSaveOptions || {}), ...(options || {})};
      if (this._localSaveTimer) clearTimeout(this._localSaveTimer);
      return new Promise(resolve => {
        this._queuedSaveResolvers = this._queuedSaveResolvers || [];
        this._queuedSaveResolvers.push(resolve);
        this._localSaveTimer = setTimeout(async () => {
          const opts = this._queuedSaveOptions || {};
          const resolvers = this._queuedSaveResolvers || [];
          this._queuedSaveOptions = null;
          this._queuedSaveResolvers = [];
          this._localSaveTimer = null;
          try { await this.save(opts); }
          finally { resolvers.forEach(fn => { try { fn(true); } catch(_) {} }); }
        }, delay);
      });
    },
    async save({skipCloud=false, onProgress=null, skipSalesChunks=false}={}){
      const updatedAt = new Date().toISOString();
      this.lastSaveWarning = '';
      if (this.data && typeof this.data === 'object') this.data._updatedAt = updatedAt;
      const salesCount = Array.isArray(this.data?.sales) ? this.data.sales.length : 0;
      const deliveriesCount = Array.isArray(this.data?.deliveries) ? this.data.deliveries.length : 0;
      const importIssuesCount = Array.isArray(this.data?.importIssues) ? this.data.importIssues.length : 0;
      const shouldChunkSales = salesCount > 25000;
      const shouldAvoidLocalStringify = shouldChunkSales || deliveriesCount > 25000 || importIssuesCount > 5000;
      let dataForLocalSave = this.data;

      if (shouldChunkSales) {
        if (skipSalesChunks && this.data._salesStorage === 'indexeddb-chunks') {
          dataForLocalSave = {...this.data, sales:[], _salesStorage:'indexeddb-chunks', _salesRecords:salesCount, _salesUpdatedAt:updatedAt};
        } else {
          try {
            await persistSalesChunks(this.data.sales, updatedAt, onProgress);
            dataForLocalSave = {...this.data, sales:[], _salesStorage:'indexeddb-chunks', _salesRecords:salesCount, _salesUpdatedAt:updatedAt};
          } catch(e) {
            this.lastSaveWarning = 'A base ficou carregada nesta sessão, mas o navegador demorou para gravar todos os lotes. Tente importar novamente com menos abas abertas se ela não aparecer após atualizar.';
            console.warn('Falha ao salvar base de vendas em lotes.', e);
            dataForLocalSave = {...this.data, sales:[], _salesStorage:'memory-only', _salesRecords:salesCount, _salesUpdatedAt:updatedAt};
          }
        }
      } else if (salesCount <= 25000) {
        try { await clearSalesChunks(); } catch(_) {}
      }

      if (shouldAvoidLocalStringify) {
        try { localStorage.removeItem(STORAGE_KEY); localStorage.setItem(STORAGE_KEY, JSON.stringify({storage:'indexeddb', updatedAt, large:true, salesStorage:dataForLocalSave._salesStorage || ''})); } catch(_) {}
      } else {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dataForLocalSave)); }
        catch(e) {
          try { localStorage.removeItem(STORAGE_KEY); localStorage.setItem(STORAGE_KEY, JSON.stringify({storage:'indexeddb', updatedAt, large:true})); } catch(_) {}
          console.warn('Base grande armazenada no IndexedDB.', e);
        }
      }
      try { await idbSetSafe(STORAGE_KEY, dataForLocalSave, 'Salvamento do cadastro principal'); } catch(e) { console.warn('Falha ao gravar IndexedDB.', e); }
      if (this.usingCloud && !skipCloud) {
        // Evita travamento: o Firebase passa a sincronizar em fila/debounce.
        // O navegador grava localmente primeiro e manda a nuvem só depois de uma pausa curta,
        // sem disparar vários JSON.stringify grandes em sequência.
        this.scheduleCloudSave(updatedAt, shouldAvoidLocalStringify ? 1800 : 1200);
      }
    },
    async reset(){
      this.data = this.seed();
      try { await idbDelete(STORAGE_KEY); } catch(_) {}
      try { await clearSalesChunks(); } catch(_) {}
      return this.save();
    }
  };

  function mergeCadastroById(existing, defaults){
    const current = Array.isArray(existing) ? existing : [];
    const byId = new Map(current.map(item => [item.id, item]));
    return (defaults || []).map(def => {
      const old = byId.get(def.id) || {};
      const merged = {...old, ...def};
      const aliases = new Set([...(old.aliases || []), ...(def.aliases || [])]);
      merged.aliases = Array.from(aliases);
      return merged;
    });
  }



  function ensureProductCatalogFallback(data){
    data ||= {};
    const defaults = Array.isArray(window.DEFAULT_PRODUCTS) && window.DEFAULT_PRODUCTS.length ? window.DEFAULT_PRODUCTS : FALLBACK_ACTIVE_PRODUCTS;
    data.products = mergeCadastroById(data.products || [], defaults || []);
    data.products = sanitizeProductMatchingRules(data.products);
    return data.products;
  }

  function validAdminPageIds({includeAdminOnly=false}={}){
    return ADMIN_PAGES.filter(p => includeAdminOnly || !p.adminOnly).map(p => p.id);
  }

  function sanitizePermissions(permissions, {includeAdminOnly=false}={}){
    const allowed = new Set(validAdminPageIds({includeAdminOnly}));
    return unique(Array.isArray(permissions) ? permissions : []).filter(id => allowed.has(id));
  }

  function normalizeSystemUser(user){
    const role = user.role || (user.storeId ? 'store' : 'commercial');
    const normalized = {...user, role};
    if (role === 'admin') {
      normalized.permissions = validAdminPageIds({includeAdminOnly:true});
      normalized.active = true;
    } else if (role === 'commercial') {
      normalized.permissions = sanitizePermissions(normalized.permissions?.length ? normalized.permissions : DEFAULT_COMMERCIAL_PERMISSIONS);
      normalized.active = normalized.active !== false;
    } else {
      normalized.permissions = [];
      normalized.active = normalized.active !== false;
    }
    return normalized;
  }

  function syncUsersWithStores(existingUsers, stores, deletedCommercialUsers=[]){
    const users = Array.isArray(existingUsers) ? existingUsers : [];
    const deletedCommercialLogins = new Set((deletedCommercialUsers || []).map(normalizeLogin));
    const byUser = new Map(users.map(u => [normalizeLogin(u.usuario), u]));
    const byStore = new Map(users.filter(u => u.storeId).map(u => [u.storeId, u]));

    const adminExisting = byUser.get(normalizeLogin(ADMIN_USER.usuario)) || users.find(u => u.role === 'admin') || {};
    const result = [normalizeSystemUser({
      ...ADMIN_USER,
      ...adminExisting,
      usuario: ADMIN_USER.usuario,
      senha: ADMIN_USER.senha,
      role: 'admin',
      nome: adminExisting.nome || ADMIN_USER.nome
    })];

    DEFAULT_COMMERCIAL_USERS.forEach(def => {
      if (deletedCommercialLogins.has(normalizeLogin(def.usuario))) return;
      const existing = byUser.get(normalizeLogin(def.usuario)) || users.find(u => u.role === 'commercial' && normalize(u.nome) === normalize(def.nome));
      if (!existing) result.push(normalizeSystemUser({...def, permissions:[...(def.permissions || [])]}));
    });

    (stores || []).forEach(store => {
      const existing = byStore.get(store.id) || byUser.get(normalizeLogin(store.usuario)) || {};
      result.push(normalizeSystemUser({
        ...existing,
        usuario: store.usuario,
        senha: existing.senha || store.senha,
        nome: store.nome,
        role: 'store',
        storeId: store.id
      }));
    });

    // Mantém usuários extras criados manualmente no ADM, sem duplicar lojas/ADM.
    users.forEach(u => {
      const isAdmin = normalizeLogin(u.usuario) === normalizeLogin(ADMIN_USER.usuario) || u.role === 'admin';
      const isStoreUser = u.storeId && (stores || []).some(s => s.id === u.storeId);
      const already = result.some(r => normalizeLogin(r.usuario) === normalizeLogin(u.usuario));
      if (!isAdmin && !isStoreUser && !already) result.push(normalizeSystemUser(u));
    });

    return result;
  }

  const PRODUCT_QUALIFIER_TOKENS = ['FILETADO','PICADO','PICADA','FATIADO','FATIADA','RALADO','RALADA','DESCASCADO','DESCASCADA','MIX'];

  function tokenSet(value){
    return new Set(normalize(value).split(' ').filter(Boolean));
  }

  function hasQualifierMismatch(rawText, product){
    const rawTokens = tokenSet(rawText);
    const officialTokens = tokenSet(`${product?.nomeSistema || ''} ${product?.codigoMix || ''}`);
    return PRODUCT_QUALIFIER_TOKENS.some(t => officialTokens.has(t) && !rawTokens.has(t));
  }

  function sanitizeProductMatchingRules(products){
    const list = Array.isArray(products) ? products.map(p => ({...p, aliases:[...(p.aliases || [])]})) : [];
    const normalBrocolis = list.find(p => p.id === 'brocolis_americano');
    const filetado = list.find(p => p.id === 'brocolis_americano_filetado_400g');
    if (filetado) {
      // Esse alias não possui a palavra FILETADO e fazia o PDF de brócolis americano cair no produto filetado inativo.
      filetado.aliases = (filetado.aliases || []).filter(a => {
        const n = normalize(a);
        return !(n.includes('BROCOLIS AMERICANO') && !n.includes('FILETADO'));
      });
    }
    if (normalBrocolis) {
      const extraAliases = [
        'BROCOLIS AMERICANO SO FOLHAS BDJ 400G',
        'BROCOLIS AMERICANO BDJ 400G'
      ];
      const aliases = new Set([...(normalBrocolis.aliases || []), ...extraAliases]);
      normalBrocolis.aliases = Array.from(aliases);
    }
    return list;
  }

  function fixKnownProductConfusions(data){
    if (!data || !Array.isArray(data.deliveries)) return;
    data.deliveries = data.deliveries.map(d => {
      const raw = normalize(d.productRaw || '');
      if (d.productId === 'brocolis_americano_filetado_400g' && raw.includes('BROCOLIS') && raw.includes('AMERICANO') && !raw.includes('FILETADO')) {
        return {...d, productId:'brocolis_americano'};
      }
      return d;
    });
  }

  function matchStoreInData(rawName, redeHint='', stores=[]){
    const raw = normalize(rawName);
    if (!raw) return null;
    const manualStore = resolveManualStoreAlias(rawName, redeHint, stores || []);
    if (manualStore) return manualStore;
    const known = storeOverrideByKnownSalesName(rawName, redeHint, stores || []);
    if (known) return known;

    let candidates = stores || [];
    const direct = scoreStoreCandidates(raw, candidates);
    if (direct.bestScore >= 84) return direct.best;

    if (redeHint) {
      const nRede = normalize(redeHint);
      candidates = candidates.filter(s => normalize(s.rede).includes(nRede) || nRede.includes(normalize(s.rede).split(' ')[0]));
    }
    const hinted = scoreStoreCandidates(raw, candidates);
    return hinted.bestScore >= 42 ? hinted.best : null;
  }

  function reconcileSalesReferences(data){
    if (!data || !Array.isArray(data.sales) || !data.sales.length) return;
    const stores = data.stores || [];
    const products = ensureProductCatalogFallback(data) || [];
    const merged = new Map();

    data.sales.forEach(row => {
      const rede = row.rede || detectSalesRedeFromSheet(row.sheet || '');
      const rawStore = row.storeRaw || row.storeName || '';
      const rawProduct = row.productRaw || row.productName || '';

      const store = rawStore ? matchStoreInData(rawStore, rede, stores) : null;
      const product = rawProduct ? matchProductFromList(rawProduct, products) : null;

      const next = {
        ...row,
        rede,
        storeId: store?.id || row.storeId || '',
        storeName: store?.nome || row.storeName || rawStore,
        productId: product?.id || row.productId || '',
        productName: product?.nomeSistema || row.productName || cleanSalesProductName(rawProduct)
      };

      const storePart = next.storeId || `raw_${slug(next.storeRaw || next.storeName)}`;
      const productPart = next.productId || `raw_${slug(cleanSalesProductName(next.productRaw || next.productName))}`;
      const key = `${next.importId || next.fileId || ''}|${next.date}|${next.rede}|${storePart}|${productPart}`;

      if (!merged.has(key)) {
        merged.set(key, {...next});
      } else {
        const prev = merged.get(key);
        prev.qty = toNumber(prev.qty) + toNumber(next.qty);
        prev.sourceRecords = toNumber(prev.sourceRecords || 1) + toNumber(next.sourceRecords || 1);
        prev.storeRaw = prev.storeRaw || next.storeRaw;
        prev.productRaw = prev.productRaw || next.productRaw;
      }
    });

    data.sales = Array.from(merged.values());
    recalcSalesImportSummaries(data);
  }

  function recalcSalesImportSummaries(data){
    if (!data || !Array.isArray(data.salesImports)) return;
    data.salesImports = data.salesImports.map(imp => {
      const rows = (data.sales || []).filter(r => r.importId === imp.id || r.fileId === imp.id);
      if (!rows.length) return imp;
      const range = salesImportDateRange(rows);
      const matchedProducts = rows.filter(r => r.productId).length;
      const matchedStores = rows.filter(r => r.storeId).length;
      return {
        ...imp,
        dateFrom: range.from,
        dateTo: range.to,
        dates: range.dates,
        records: rows.length,
        qtyTotal: rows.reduce((a,r)=>a+toNumber(r.qty),0),
        matchedProducts,
        unmatchedProducts: rows.length - matchedProducts,
        matchedStores,
        unmatchedStores: rows.length - matchedStores
      };
    });
  }



  const STORE_CNPJ_MAP = {
    // Rede Dia a Dia — reconhecimento XML por CNPJ do destinatário
    dd_aguas_claras: ['17457404001779'],
    dd_aguas_lindas: ['17457404001000'],
    dd_aparecida_goiania: ['17457404003046'],
    dd_br_070: ['17457404000101'],
    dd_brazlandia: ['17457404002317'],
    dd_caldas_novas: ['17457404001183'],
    dd_cd: ['17457404000969'],
    dd_ceilandia_centro: ['17457404001850'],
    dd_ceilandia_norte: ['17457404004018'],
    dd_ceilandia_sul: ['17457404001264'],
    dd_cesar_lattes: ['17457404001698'],
    dd_eptg: ['17457404003550'],
    dd_formosa: ['17457404003801'],
    dd_furnas: ['17457404003631'],
    dd_gama: ['17457404000535', '17457404003535'],
    dd_goianesia: ['17457404002660'],
    dd_guara: ['17457404002074'],
    dd_gurupi: ['17457404002740'],
    dd_horacio_costa: ['17457404000616'],
    dd_itumbiara: ['17457404003984'],
    dd_jd_botanico: ['17457404002821'],
    dd_lem: ['17457404001930'],
    dd_luziania: ['17457404000705'],
    dd_mestre_d_armas: ['17457404003127'],
    dd_novo_gama: ['17457404001507'],
    dd_park_jk: ['17457404003712'],
    dd_planaltina_df: ['17457404002236'],
    dd_planaltina_go: ['17457404001426'],
    dd_recanto: ['17457404003470'],
    dd_riacho: ['17457404003208'],
    dd_rio_verde: ['17457404003399'],
    dd_samambaia: ['17457404002155'],
    dd_santo_antonio: ['17457404000888'],
    dd_sia: ['17457404000373'],
    dd_sobradinho: ['17457404000292'],
    dd_taguatinga_sul: ['17457404000454'],
    dd_vicente_pires: ['17457404002406'],
    dd_vicente_pires_2: ['17457404002589'],

    // Rede Comper/Fort — reconhecimento XML por CNPJ do destinatário
    comper_aguas_claras: ['09477652000358'],
    comper_asa_sul: ['09477652005155'],
    comper_gama: ['09477652005317'],
    comper_sobradinho: ['09477652004930'],
    fort_ceilandia: ['09477652004039', '09477652000439'],
    fort_planaltina: ['09477652002482'],
    fort_recanto_das_emas: ['09477652012364'],
    fort_sol_nascente: ['09477652007522'],
    fort_taguatinga: ['09477652005074'],
    fort_valparaiso: ['09477652000277'],

    // Rede Costa — reconhecimento XML por CNPJ do destinatário
    costa_taquari: ['27289076001611'],
    costa_unieuro: ['27289076001026'],
    costa_goiania: ['27289076000569'],
    costa_laranjeiras: ['27289076001964'],
    costa_taguatinga: ['27289076001450'],
    costa_ade: ['27289076001379'],
    costa_valparaiso: ['27289076000216'],
    costa_luziania: ['27289076001298'],
    costa_santa_maria: ['27289076001530'],
    costa_t_63: ['27289076000135'],
    costa_go_070: ['27289076000640'],
    costa_avenida_goias: ['27289076000801'],
    costa_jardim_goias: ['27289076000305'],
    costa_rio_verde: ['27289076000720'],
    costa_senador_canedo: ['27289076000992']
  };

  const STORE_CNPJ_INFO = {
    // Rede Dia a Dia
    '17457404001779': {id:'dd_aguas_claras', nome:'DD ÁGUAS CLARAS', rede:'DIA A DIA'},
    '17457404001000': {id:'dd_aguas_lindas', nome:'DD ÁGUAS LINDAS', rede:'DIA A DIA'},
    '17457404003046': {id:'dd_aparecida_goiania', nome:'DD APARECIDA DE GOIÂNIA', rede:'DIA A DIA'},
    '17457404002317': {id:'dd_brazlandia', nome:'DD BRAZLÂNDIA', rede:'DIA A DIA'},
    '17457404001183': {id:'dd_caldas_novas', nome:'DD CALDAS NOVAS', rede:'DIA A DIA'},
    '17457404000969': {id:'dd_cd', nome:'DIA A DIA CD', rede:'DIA A DIA'},
    '17457404000101': {id:'dd_br_070', nome:'DD BR 070', rede:'DIA A DIA'},
    '17457404001850': {id:'dd_ceilandia_centro', nome:'DD CEILÂNDIA CENTRO', rede:'DIA A DIA'},
    '17457404001264': {id:'dd_ceilandia_sul', nome:'DD P SUL', rede:'DIA A DIA'},
    '17457404001698': {id:'dd_cesar_lattes', nome:'DD CÉSAR LATTES', rede:'DIA A DIA'},
    '17457404000535': {id:'dd_gama', nome:'DD GAMA', rede:'DIA A DIA'},
    '17457404003535': {id:'dd_gama', nome:'DD GAMA', rede:'DIA A DIA'},
    '17457404002660': {id:'dd_goianesia', nome:'DD GOIANÉSIA', rede:'DIA A DIA'},
    '17457404002074': {id:'dd_guara', nome:'DD GUARÁ', rede:'DIA A DIA'},
    '17457404002740': {id:'dd_gurupi', nome:'DD GURUPI', rede:'DIA A DIA'},
    '17457404000616': {id:'dd_horacio_costa', nome:'DD HORÁCIO COSTA', rede:'DIA A DIA'},
    '17457404002821': {id:'dd_jd_botanico', nome:'DD JARDIM BOTÂNICO', rede:'DIA A DIA'},
    '17457404001930': {id:'dd_lem', nome:'DD LEM-BA', rede:'DIA A DIA'},
    '17457404000705': {id:'dd_luziania', nome:'DD LUZIÂNIA', rede:'DIA A DIA'},
    '17457404001507': {id:'dd_novo_gama', nome:'DD NOVO GAMA', rede:'DIA A DIA'},
    '17457404002236': {id:'dd_planaltina_df', nome:'DD PLANALTINA-DF', rede:'DIA A DIA'},
    '17457404001426': {id:'dd_planaltina_go', nome:'DD PLANALTINA-GO', rede:'DIA A DIA'},
    '17457404003399': {id:'dd_rio_verde', nome:'DD RIO VERDE', rede:'DIA A DIA'},
    '17457404000888': {id:'dd_santo_antonio', nome:'DD SANTO ANTÔNIO', rede:'DIA A DIA'},
    '17457404000373': {id:'dd_sia', nome:'DD SIA', rede:'DIA A DIA'},
    '17457404000292': {id:'dd_sobradinho', nome:'DD SOBRADINHO', rede:'DIA A DIA'},
    '17457404000454': {id:'dd_taguatinga_sul', nome:'DD TAGUATINGA SUL', rede:'DIA A DIA'},
    '17457404002406': {id:'dd_vicente_pires', nome:'DD VICENTE PIRES', rede:'DIA A DIA'},
    '17457404002589': {id:'dd_vicente_pires_2', nome:'DD VICENTE PIRES 2', rede:'DIA A DIA'},
    '17457404003127': {id:'dd_mestre_d_armas', nome:'DD MESTRE DARMAS', rede:'DIA A DIA'},
    '17457404002155': {id:'dd_samambaia', nome:'DD SAMAMBAIA', rede:'DIA A DIA'},
    '17457404003550': {id:'dd_eptg', nome:'DD EPTG', rede:'DIA A DIA'},
    '17457404003470': {id:'dd_recanto', nome:'DD RECANTO DAS EMAS', rede:'DIA A DIA'},
    '17457404003801': {id:'dd_formosa', nome:'DD FORMOSA', rede:'DIA A DIA'},
    '17457404003208': {id:'dd_riacho', nome:'DD RIACHO FUNDO', rede:'DIA A DIA'},
    '17457404003631': {id:'dd_furnas', nome:'DD FURNAS', rede:'DIA A DIA'},
    '17457404003712': {id:'dd_park_jk', nome:'DD PARK JK LUZIÂNIA', rede:'DIA A DIA'},
    '17457404003984': {id:'dd_itumbiara', nome:'DD ITUMBIARA', rede:'DIA A DIA'},
    '17457404004018': {id:'dd_ceilandia_norte', nome:'DD CEILÂNDIA NORTE', rede:'DIA A DIA'},

    // Rede Comper/Fort
    '09477652000358': {id:'comper_aguas_claras', nome:'COMPER ÁGUAS CLARAS', rede:'COMPER/FORT'},
    '09477652005155': {id:'comper_asa_sul', nome:'COMPER ASA SUL', rede:'COMPER/FORT'},
    '09477652004039': {id:'fort_ceilandia', nome:'FORT CEILÂNDIA', rede:'COMPER/FORT'},
    '09477652000439': {id:'fort_ceilandia', nome:'FORT CEILÂNDIA', rede:'COMPER/FORT'},
    '09477652005317': {id:'comper_gama', nome:'COMPER GAMA', rede:'COMPER/FORT'},
    '09477652002482': {id:'fort_planaltina', nome:'FORT PLANALTINA', rede:'COMPER/FORT'},
    '09477652012364': {id:'fort_recanto_das_emas', nome:'FORT RECANTO DAS EMAS', rede:'COMPER/FORT'},
    '09477652004930': {id:'comper_sobradinho', nome:'COMPER SOBRADINHO', rede:'COMPER/FORT'},
    '09477652007522': {id:'fort_sol_nascente', nome:'FORT SOL NASCENTE', rede:'COMPER/FORT'},
    '09477652005074': {id:'fort_taguatinga', nome:'FORT TAGUATINGA', rede:'COMPER/FORT'},
    '09477652000277': {id:'fort_valparaiso', nome:'FORT VALPARAÍSO', rede:'COMPER/FORT'},

    // Rede Costa
    '27289076001611': {id:'costa_taquari', nome:'COSTA TAQUARI', rede:'COSTA'},
    '27289076001026': {id:'costa_unieuro', nome:'COSTA UNIEURO', rede:'COSTA'},
    '27289076000569': {id:'costa_goiania', nome:'COSTA GOIÂNIA', rede:'COSTA'},
    '27289076001964': {id:'costa_laranjeiras', nome:'COSTA LARANJEIRAS', rede:'COSTA'},
    '27289076001450': {id:'costa_taguatinga', nome:'COSTA TAGUATINGA', rede:'COSTA'},
    '27289076001379': {id:'costa_ade', nome:'COSTA ADE', rede:'COSTA'},
    '27289076000216': {id:'costa_valparaiso', nome:'COSTA VALPARAÍSO', rede:'COSTA'},
    '27289076001298': {id:'costa_luziania', nome:'COSTA LUZIÂNIA', rede:'COSTA'},
    '27289076001530': {id:'costa_santa_maria', nome:'COSTA SANTA MARIA', rede:'COSTA'},
    '27289076000135': {id:'costa_t_63', nome:'COSTA T-63', rede:'COSTA'},
    '27289076000640': {id:'costa_go_070', nome:'COSTA GO-070', rede:'COSTA'},
    '27289076000801': {id:'costa_avenida_goias', nome:'COSTA AVENIDA GOIÁS', rede:'COSTA'},
    '27289076000305': {id:'costa_jardim_goias', nome:'COSTA JARDIM GOIÁS', rede:'COSTA'},
    '27289076000720': {id:'costa_rio_verde', nome:'COSTA RIO VERDE', rede:'COSTA'},
    '27289076000992': {id:'costa_senador_canedo', nome:'COSTA SENADOR CANEDO', rede:'COSTA'}
  };

  function officialStoreInfoByCnpj(cnpj){
    const digits = onlyDigits(cnpj);
    return digits ? STORE_CNPJ_INFO[digits] || null : null;
  }

  function buildSyntheticStoreFromInfo(info, cnpj){
    if (!info) return null;
    return {
      id: info.id,
      nome: info.nome,
      rede: info.rede,
      cnpj: onlyDigits(cnpj),
      cnpjs: [onlyDigits(cnpj)],
      aliases: [info.nome],
      usuario: info.id,
      senha: '',
      active: true,
      synthetic: true
    };
  }

  function enrichCustomCnpjLinks(data){
    data ||= Store.data || {};
    data.customCnpjStoreMap ||= {};
    return data.customCnpjStoreMap;
  }

  function enrichStoreCnpjs(stores){
    return (stores || []).map(store => {
      const existing = Array.isArray(store.cnpjs) ? store.cnpjs : (store.cnpj ? [store.cnpj] : []);
      const mapped = STORE_CNPJ_MAP[store.id] || [];
      const cnpjs = unique([...existing, ...mapped].map(onlyDigits).filter(Boolean));
      return cnpjs.length ? {...store, cnpjs} : store;
    });
  }

  function migrate(data){
    data = data || {};
    // Atualiza cadastro e equivalências mesmo quando já existem dados salvos no navegador.
    // Mantém dados operacionais, mas traz nomes, status, aliases e acessos mais recentes do arquivo do sistema.
    ensureProductCatalogFallback(data);
    data.stores = enrichStoreCnpjs(mergeCadastroById(data.stores, window.DEFAULT_STORES || []));
    data.deletedCommercialUsers ||= [];
    data.users = syncUsersWithStores(data.users, data.stores, data.deletedCommercialUsers);
    data.storeMix ||= {};
    data.sales ||= [];
    data.salesImports ||= [];
    data.deliveries ||= [];
    data.orders ||= [];
    data.offers ||= [];
    data.priceChecks ||= [];
    data.tickets ||= [];
    data.corrections ||= [];
    data.closedPendencies ||= [];
    data.criticalRuptureJustifications ||= [];
    data.inventoryOut ||= [];
    data.storeStock ||= [];
    data.importIssues ||= [];
    data.cancelledNfes ||= [];
    data.importDuplicates ||= [];
    data.deletedImports ||= [];
    data.nameReconciliations ||= {};
    data.nameReconciliations.products ||= {};
    data.nameReconciliations.stores ||= {};
    fixKnownProductConfusions(data);
    reconcileSalesReferences(data);
    data.conciliation ||= {
      FOLHAGEM: { baseDates: [], pendingDates: [], orderDate: todayISO(), increasePct: 0 },
      BANDEJA: { baseDates: [], pendingDates: [], orderDate: todayISO(), increasePct: 0 }
    };
    ['FOLHAGEM','BANDEJA'].forEach(type => {
      data.conciliation[type] ||= {baseDates:[], pendingDates:[], orderDate:todayISO(), increasePct:0};
      data.conciliation[type].baseDates ||= [];
      data.conciliation[type].pendingDates ||= [];
      data.conciliation[type].orderDate ||= todayISO();
      data.conciliation[type].increasePct = toNumber(data.conciliation[type].increasePct || 0);
    });
    data.appConfig = {
      pedidoDeadline:'09:30',
      quebraDeadline:'10:00',
      bandejaDeadlineBufferDays: 3,
      criticalRuptureProductIds: ['alface_crespa_und','cheiro_verde','couve_und','brocolis_americano'],
      criticalRuptureProductsByRede: {},
      inventoryOutLimits: {},
      stockViewType: 'BANDEJA',
      stockPermissionBootstrapDone: false,
      ticketsPermissionBootstrapDone: false,
      priceCheckWeekdays: [1,3,5],
      pricePermissionBootstrapDone: false,
      duplicatePermissionBootstrapDone: false,
      ...(data.appConfig || {})
    };
    data.appConfig.criticalRuptureProductIds = unique(data.appConfig.criticalRuptureProductIds || ['alface_crespa_und','cheiro_verde','couve_und','brocolis_americano']);
    if (!data.appConfig.inventoryOutLimits || typeof data.appConfig.inventoryOutLimits !== 'object' || Array.isArray(data.appConfig.inventoryOutLimits)) {
      data.appConfig.inventoryOutLimits = {};
    }
    if (!data.appConfig.ticketsPermissionBootstrapDone) {
      (data.users || []).forEach(u => {
        if (u.role === 'commercial') u.permissions = sanitizePermissions(unique([...(u.permissions || []), 'chamados']));
      });
      data.appConfig.ticketsPermissionBootstrapDone = true;
    }
    if (!data.appConfig.stockPermissionBootstrapDone) {
      (data.users || []).forEach(u => {
        if (u.role === 'commercial') u.permissions = sanitizePermissions(unique([...(u.permissions || []), 'estoque-loja']));
      });
      data.appConfig.stockPermissionBootstrapDone = true;
    }

    if (!Array.isArray(data.appConfig.priceCheckWeekdays) || !data.appConfig.priceCheckWeekdays.length) {
      data.appConfig.priceCheckWeekdays = [1,3,5];
    }
    if (!data.appConfig.pricePermissionBootstrapDone) {
      (data.users || []).forEach(u => {
        if (u.role === 'commercial') u.permissions = sanitizePermissions(unique([...(u.permissions || []), 'precos']));
      });
      data.appConfig.pricePermissionBootstrapDone = true;
    }
    if (!data.appConfig.duplicatePermissionBootstrapDone) {
      (data.users || []).forEach(u => {
        if (u.role === 'commercial') u.permissions = sanitizePermissions(unique([...(u.permissions || []), 'duplicidades']));
      });
      data.appConfig.duplicatePermissionBootstrapDone = true;
    }
    if (!data.appConfig.criticalRuptureProductsByRede || typeof data.appConfig.criticalRuptureProductsByRede !== 'object' || Array.isArray(data.appConfig.criticalRuptureProductsByRede)) {
      data.appConfig.criticalRuptureProductsByRede = {};
    }
    const redesForCriticalConfig = unique((data.stores || []).map(s => s.rede).filter(Boolean));
    const hasAnyRedeConfig = Object.keys(data.appConfig.criticalRuptureProductsByRede).length > 0;
    if (!hasAnyRedeConfig) {
      const legacyCriticalIds = data.appConfig.criticalRuptureProductIds || [];
      redesForCriticalConfig.forEach(rede => {
        data.appConfig.criticalRuptureProductsByRede[rede] = unique(legacyCriticalIds).filter(id => (data.products || []).some(p => p.id === id));
      });
    } else {
      for (const rede of Object.keys(data.appConfig.criticalRuptureProductsByRede)) {
        data.appConfig.criticalRuptureProductsByRede[rede] = unique(data.appConfig.criticalRuptureProductsByRede[rede] || []).filter(id => (data.products || []).some(p => p.id === id));
      }
    }
    return data;
  }

  const state = {
    session: null,
    page: 'pedido',
    orderType: 'FOLHAGEM',
    adminType: 'BANDEJA',
    filters: {
      rede: '',
      loja: '',
      dateFrom: '',
      dateTo: '',
      tipo: 'BANDEJA'
    },
    filterPanelsOpen: {},
    mobileMode: false,
    expandedPdfImports: {},
    pdfCalendarMonth: '',
    pdfCalendarSelectedDate: '',
    offersFilterMonth: '',
    reconciliationCache: null,
    audit: {
      dateFrom: '',
      dateTo: '',
      rede: '',
      source: '',
      expectedValue: '',
      compareText: ''
    },
    baseSales: {
      rede: '',
      month: '',
      simulatorDates: []
    },
    dayClosing: {
      date: '',
      rede: ''
    },
    inventoryOut: {
      date: '',
      rede: '',
      loja: '',
      product: '',
      status: '',
      type: 'FOLHAGEM'
    },
    storeStock: {
      date: '',
      rede: '',
      loja: '',
      product: '',
      status: '',
      type: 'BANDEJA'
    },
    tickets: {
      status: '',
      type: '',
      priority: '',
      search: ''
    }
  };

  function toast(message, type='ok'){
    const host = $('#toastHost');
    const el = document.createElement('div');
    el.className = 'toast ' + (type==='error'?'error':type==='warn'?'warn':'');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(()=>el.remove(), 4200);
  }

  function productById(id){ return Store.data.products.find(p=>p.id===id); }
  function storeById(id){
    if (!id) return null;
    return (Store.data?.stores || []).find(s=>s.id===id)
      || (window.DEFAULT_STORES || []).find(s=>s.id===id)
      || (typeof allKnownStoresForSelection === 'function' ? allKnownStoresForSelection().find(s=>s.id===id) : null)
      || null;
  }
  function activeProducts(type=null){
    return Store.data.products.filter(p => p.situacao === 'ATIVO' && (!type || p.tipo === type));
  }
  function isProductActiveForStore(storeId, productId){
    const p = productById(productId);
    if (!p || p.situacao !== 'ATIVO') return false;
    const key = `${storeId}|${productId}`;
    return Store.data.storeMix[key] !== false;
  }
  function getStoreProducts(storeId, type){
    return activeProducts(type).filter(p => isProductActiveForStore(storeId, p.id));
  }

  function nameReconciliationStore(){
    Store.data ||= Store.seed();
    Store.data.nameReconciliations ||= {};
    Store.data.nameReconciliations.products ||= {};
    Store.data.nameReconciliations.stores ||= {};
    return Store.data.nameReconciliations;
  }

  function productAliasKeyFromRaw(value){
    return normalize(String(value || '').split('|')[0].trim());
  }

  function storeAliasKeyFromRaw(value, rede=''){
    const raw = normalize(value);
    if (!raw) return '';
    return `${normalize(rede || '')}|${raw}`;
  }

  function resolveManualProductAlias(rawName, productList=[]){
    const key = productAliasKeyFromRaw(rawName);
    if (!key) return null;
    const aliases = Store.data?.nameReconciliations?.products || {};
    const rec = aliases[key];
    const targetId = typeof rec === 'string' ? rec : rec?.targetId;
    if (!targetId) return null;
    return (productList || []).find(p => p.id === targetId) || (Store.data?.products || []).find(p => p.id === targetId) || null;
  }

  function resolveManualStoreAlias(rawName, redeHint='', stores=[]){
    const raw = normalize(rawName);
    if (!raw) return null;
    const aliases = Store.data?.nameReconciliations?.stores || {};
    const possibleKeys = unique([
      storeAliasKeyFromRaw(rawName, redeHint),
      storeAliasKeyFromRaw(rawName, ''),
      storeAliasKeyFromRaw(rawName, inferRedeFromText(rawName || redeHint || ''))
    ]).filter(Boolean);
    let rec = null;
    for (const key of possibleKeys) {
      if (aliases[key]) { rec = aliases[key]; break; }
    }
    const targetId = typeof rec === 'string' ? rec : rec?.targetId;
    if (!targetId) return null;
    return (stores || []).find(s => s.id === targetId) || (Store.data?.stores || []).find(s => s.id === targetId) || null;
  }

  function matchProduct(rawName){
    try { ensureProductCatalogFallback(Store.data || (Store.data = Store.seed())); } catch(_) {}
    const catalog = (Store.data?.products && Store.data.products.length ? Store.data.products : (window.DEFAULT_PRODUCTS || FALLBACK_ACTIVE_PRODUCTS));
    return matchProductFromList(rawName, catalog || []);
  }

  function matchProductFromList(rawName, productList=[]){
    const original = String(rawName || '').split('|')[0].trim();
    const rawOriginal = normalize(original);
    let raw = rawOriginal;
    if (!raw) return null;

    const manualProduct = resolveManualProductAlias(original, productList || []);
    if (manualProduct) return manualProduct;

    const directId = XML_PRODUCT_DIRECT_ID[rawOriginal] || XML_PRODUCT_DIRECT_ID[rawOriginal.replace(/\bUND\b/g,'').replace(/\s+/g,' ').trim()];
    if (directId) {
      const directProduct = (productList || []).find(p => p.id === directId) || FALLBACK_ACTIVE_PRODUCTS.find(p => p.id === directId);
      if (directProduct) return directProduct;
    }

    // Correção de grafia comum na base de vendas: BERINGELA = BERINJELA.
    if (rawOriginal.includes('BERINGELA')) {
      const berinjela = (productList || []).find(p => p.id === 'berinjela_bdj');
      if (berinjela) return berinjela;
    }

    // Regra específica: brócolis americano só deve virar FILETADO quando o PDF/XML/base trouxer FILETADO.
    if (rawOriginal.includes('BROCOLIS') && rawOriginal.includes('AMERICANO') && !rawOriginal.includes('FILETADO')) {
      const normalBrocolis = (productList || []).find(p => p.id === 'brocolis_americano');
      if (normalBrocolis) return normalBrocolis;
    }
    raw = raw
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

    const rawLooksGranel = /\bA GRANEL\b|\bGRANEL\b/i.test(original);
    let best = null, bestScore = 0;

    for (const p of (productList || [])) {
      const candidates = [p.nomeSistema, p.codigoMix, ...(p.aliases||[])].map(c => {
        let n = normalize(c);
        n = n
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
        return n;
      });
      const productLooksGranel = /\bA GRANEL\b|\bGRANEL\b/i.test(`${p.nomeSistema} ${p.codigoMix}`);
      if (!rawLooksGranel && productLooksGranel) continue;
      if (hasQualifierMismatch(original, p)) continue;

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

  const SALES_STORE_OVERRIDES = [
    // DIA A DIA — base de vendas por filial
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

    // COSTA — base de vendas por código reduzido de filial
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

  function storeOverrideByKnownSalesName(rawName, redeHint='', stores=[]){
    const raw = normalize(rawName);
    if (!raw) return null;
    const nRede = normalize(redeHint);
    const candidates = SALES_STORE_OVERRIDES.filter(rule => {
      const rr = normalize(rule.rede);
      return !nRede || rr.includes(nRede) || nRede.includes(rr.split(' ')[0]);
    });
    for (const rule of candidates) {
      if ((rule.patterns || []).some(p => raw.includes(normalize(p)))) {
        return (stores || []).find(s => s.id === rule.id) || null;
      }
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

  function storeIdByMappedCnpj(cnpj){
    const digits = onlyDigits(cnpj);
    if (!digits) return '';

    // 0) Vínculos manuais feitos pelo ADM na tela de erros.
    const custom = Store.data?.customCnpjStoreMap || {};
    if (custom[digits]) return custom[digits];

    // 1) Mapa oficial por CNPJ.
    const official = officialStoreInfoByCnpj(digits);
    if (official?.id) return official.id;

    // 2) Compatibilidade com mapa por storeId.
    for (const [storeId, cnpjs] of Object.entries(STORE_CNPJ_MAP || {})) {
      if ((cnpjs || []).map(onlyDigits).includes(digits)) return storeId;
    }
    return '';
  }

  function matchStoreByCnpj(cnpj, redeHint=''){
    const digits = onlyDigits(cnpj);
    if (!digits) return null;

    // 1) Procura primeiro pelo mapa oficial de CNPJ -> loja.
    // Isso evita falhas quando a base salva no navegador/Firebase ainda está antiga
    // ou quando o XML vem com CNPJ sem pontuação, como 17457404003399.
    const mappedStoreId = storeIdByMappedCnpj(digits);
    if (mappedStoreId) {
      const stores = Store.data?.stores || [];
      const direct = stores.find(s => s.id === mappedStoreId);
      if (direct) return direct;

      const def = (window.DEFAULT_STORES || []).find(s => s.id === mappedStoreId);
      if (def) {
        try {
          Store.data ||= Store.seed();
          Store.data.stores = enrichStoreCnpjs(mergeCadastroById(Store.data.stores || [], window.DEFAULT_STORES || []));
          const refreshed = (Store.data.stores || []).find(s => s.id === mappedStoreId);
          if (refreshed) return refreshed;
        } catch(_) {}
        return {...def, cnpjs: (STORE_CNPJ_MAP[mappedStoreId] || []).map(onlyDigits)};
      }

      // Se o default-data.js não carregou no GitHub/cache, ainda assim reconhece o XML
      // pelo mapa oficial informado pelo ADM. Isso evita "Loja não reconhecida"
      // para CNPJs já cadastrados, mesmo com cadastro local antigo ou incompleto.
      const official = officialStoreInfoByCnpj(digits);
      if (official) return buildSyntheticStoreFromInfo(official, digits);
    }

    // 2) Fallback: procura em todas as lojas cadastradas, sempre normalizando pontuação.
    // Não filtra por rede antes do CNPJ, pois a razão social do XML pode trazer texto genérico
    // como ATACADAO DIA A DIA S.A ou SDB COMERCIO DE ALIMENTOS LTDA.
    const allStores = Store.data?.stores || [];
    const foundAny = allStores.find(s => (s.cnpjs || []).map(onlyDigits).includes(digits) || onlyDigits(s.cnpj) === digits);
    if (foundAny) return foundAny;

    // 3) Último fallback com rede, mantido apenas para cadastros manuais futuros.
    let candidates = allStores;
    if (redeHint) {
      const nRede = normalize(redeHint);
      candidates = candidates.filter(s => normalize(s.rede).includes(nRede) || nRede.includes(normalize(s.rede).split(' ')[0]));
    }
    return candidates.find(s => (s.cnpjs || []).map(onlyDigits).includes(digits) || onlyDigits(s.cnpj) === digits) || null;
  }

  function matchStore(rawName, redeHint=''){
    const cnpjMatch = String(rawName || '').match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    if (cnpjMatch) {
      const byCnpj = matchStoreByCnpj(cnpjMatch[0], redeHint);
      if (byCnpj) return byCnpj;
    }
    const raw = normalize(rawName);
    if (!raw) return null;

    const manualStore = resolveManualStoreAlias(rawName, redeHint, Store.data.stores || []);
    if (manualStore) return manualStore;

    // Correções determinísticas para nomes curtos/ambíguos da base de vendas.
    // Isso evita, por exemplo, NOVO GAMA cair em DD GAMA e EPTG cair em VICENTE PIRES.
    const known = storeOverrideByKnownSalesName(rawName, redeHint, Store.data.stores || []);
    if (known) return known;

    // Primeiro procura em todas as lojas. Isso evita erro quando o nome da loja contém uma palavra
    // que também parece nome de rede, como "DIA A DIA HORACIO COSTA".
    const direct = scoreStoreCandidates(raw, Store.data.stores);
    if (direct.bestScore >= 84) return direct.best;

    let candidates = Store.data.stores;
    if (redeHint) {
      const nRede = normalize(redeHint);
      candidates = candidates.filter(s => normalize(s.rede).includes(nRede) || nRede.includes(normalize(s.rede).split(' ')[0]));
    }
    const hinted = scoreStoreCandidates(raw, candidates);
    return hinted.bestScore >= 42 ? hinted.best : null;
  }

  function inferRedeFromText(text){
    const n = normalize(text);
    // DIA A DIA precisa vir antes de COSTA, porque existe a loja "DD HORACIO COSTA".
    if (n.includes('DIA A DIA') || n.includes('ATACADAO DIA A DIA') || /\bDD\b/.test(n)) return 'DIA A DIA';
    if (n.includes('SDB') || n.includes('COMPER') || n.includes('FORT')) return 'COMPER/FORT';
    if (n.includes('COSTA ATACADAO') || n.includes('REDE COSTA')) return 'COSTA ATACADÃO';
    return '';
  }

  function latestCost(storeId, productId, beforeDate='9999-12-31'){
    const rows = Store.data.deliveries
      .filter(d => d.storeId===storeId && d.productId===productId && d.date <= beforeDate && toNumber(d.unitCost)>0)
      .sort((a,b)=> b.date.localeCompare(a.date));
    return rows[0]?.unitCost || 0;
  }

  function validQty(d){ return Math.max(0, toNumber(d.qtyPdf) - toNumber(d.faltaQty) - toNumber(d.qualidadeQty)); }
  function validValue(d){ return validQty(d) * toNumber(d.unitCost); }
  function deliverySourceLabel(d){ return (d?.sourceType || 'PDF').toUpperCase() === 'XML' ? 'XML' : 'PDF'; }

  function deliveryDuplicateKeyFromParts(sourceType, xmlKey, date, rede, storeId, orderNumber){
    const src = String(sourceType || 'PDF').toUpperCase();
    const key = normalizeXmlKey(xmlKey || '');
    if (src === 'XML' && key) return `XML|${key}`;
    return `${src}|${date || ''}|${normalize(rede || '')}|${storeId || ''}|${normalize(orderNumber || '')}`;
  }

  function deliveryDuplicateKeyFromRow(row){
    return deliveryDuplicateKeyFromParts(row?.sourceType || 'PDF', row?.xmlKey || row?.importKey || '', row?.date || row?.deliveryDate || '', row?.rede || '', row?.storeId || '', row?.orderNumber || '');
  }

  function findDeliveryRowsByDuplicateKey(duplicateKey){
    if (!duplicateKey) return [];
    return (Store.data.deliveries || []).filter(row => deliveryDuplicateKeyFromRow(row) === duplicateKey);
  }

  function duplicateRowsSummary(rows, kind='delivery'){
    const list = rows || [];
    if (kind === 'sales') {
      return {
        records:list.length,
        qty:list.reduce((a,r)=>a+toNumber(r.qty),0),
        value:0,
        dates:unique(list.map(r=>r.date).filter(Boolean)).sort(),
        stores:unique(list.map(r=>r.storeId || r.storeName || r.storeRaw).filter(Boolean)).length,
        products:unique(list.map(r=>r.productId || r.productName || r.productRaw).filter(Boolean)).length
      };
    }
    return {
      records:list.length,
      qty:list.reduce((a,r)=>a+toNumber(r.qtyPdf),0),
      value:list.reduce((a,r)=>a+toNumber(r.valuePdf),0),
      dates:unique(list.map(r=>r.date || r.deliveryDate).filter(Boolean)).sort(),
      stores:unique(list.map(r=>r.storeId).filter(Boolean)).length,
      products:unique(list.map(r=>r.productId).filter(Boolean)).length
    };
  }

  function sanitizeRowsForDuplicate(rows){
    return (rows || []).map(row => ({...row}));
  }

  function upsertImportDuplicate(dup){
    if (!dup) return null;
    Store.data.importDuplicates ||= [];
    const key = String(dup.duplicateKey || dup.id || '');
    const same = Store.data.importDuplicates.find(d => d.status === 'PENDENTE' && String(d.duplicateKey || '') === key && String(d.fileName || '') === String(dup.fileName || '') && String(d.scope || '') === String(dup.scope || ''));
    const payload = {
      ...dup,
      status: dup.status || 'PENDENTE',
      createdAt: dup.createdAt || new Date().toISOString(),
      createdBy: dup.createdBy || state.session?.usuario || 'sistema'
    };
    if (same) {
      Object.assign(same, payload, {id:same.id, updatedAt:new Date().toISOString()});
      return same;
    }
    payload.id ||= uid('dup');
    Store.data.importDuplicates.push(payload);
    return payload;
  }

  function buildDeliveryDuplicate({sourceType, fileName, batchId, importGroupKey, duplicateKey, store, date, orderNumber, xmlKey, newRows, existingRows}){
    const incoming = duplicateRowsSummary(newRows, 'delivery');
    const current = duplicateRowsSummary(existingRows, 'delivery');
    return {
      id:uid('dup'),
      scope:'DELIVERY',
      type:String(sourceType || 'PDF').toUpperCase(),
      duplicateKey,
      status:'PENDENTE',
      date: date || incoming.dates?.[0] || current.dates?.[0] || todayISO(),
      rede: store?.rede || newRows?.[0]?.rede || existingRows?.[0]?.rede || '',
      storeId: store?.id || newRows?.[0]?.storeId || existingRows?.[0]?.storeId || '',
      storeName: store?.nome || storeById(newRows?.[0]?.storeId)?.nome || storeById(existingRows?.[0]?.storeId)?.nome || '',
      noteNumber: orderNumber || newRows?.[0]?.orderNumber || existingRows?.[0]?.orderNumber || '',
      xmlKey: normalizeXmlKey(xmlKey || newRows?.[0]?.xmlKey || existingRows?.[0]?.xmlKey || ''),
      fileName,
      importBatchId:batchId,
      importGroupKey,
      current,
      incoming,
      currentFileNames:unique((existingRows || []).map(r=>r.fileName || r.sourceFileName).filter(Boolean)),
      pendingRows:sanitizeRowsForDuplicate(newRows),
      message:'Nota/NF já importada. A nova entrada foi recusada até decisão do operador.'
    };
  }

  function registerParsedDuplicate(parsed, fileName, batchId, type){
    if (!parsed?.duplicate) return null;
    const dup = upsertImportDuplicate({...parsed.duplicate, fileName:fileName || parsed.duplicate.fileName, importBatchId:batchId || parsed.duplicate.importBatchId, type:type || parsed.duplicate.type});
    return dup;
  }

  function salesConflictKey(row){
    return `${row?.date || ''}|${row?.rede || ''}`;
  }

  function buildSalesDuplicate(importId, fileName, rows, importSummary={}, issues=[], options={}){
    const existingRows = Store.data.sales || [];
    const existingKeys = new Set(existingRows.map(salesConflictKey));
    const incomingKeys = new Set((rows || []).map(salesConflictKey).filter(k => !k.startsWith('|')));
    const conflictKeys = Array.from(incomingKeys).filter(k => existingKeys.has(k)).sort();
    const sameFile = (Store.data.salesImports || []).filter(i => i.fileName === fileName).map(i=>i.id);
    if (!conflictKeys.length && !sameFile.length) return null;
    const conflictSet = new Set(conflictKeys);
    const currentRows = existingRows.filter(r => conflictSet.has(salesConflictKey(r)) || sameFile.includes(r.importId || r.fileId));
    const conflictDates = unique(conflictKeys.map(k => k.split('|')[0]).filter(Boolean)).sort();
    const conflictRedes = unique(conflictKeys.map(k => k.split('|')[1]).filter(Boolean)).sort();
    const range = salesImportDateRange(rows || []);
    return {
      id:uid('dup'),
      scope:'SALES',
      type:'BASE_VENDA',
      duplicateKey:`SALES|${fileName}|${range.from}|${range.to}|${conflictKeys.join(';') || sameFile.join(';')}`,
      status:'PENDENTE',
      date: range.from || todayISO(),
      dateFrom: range.from,
      dateTo: range.to,
      rede: conflictRedes.join(', ') || unique((rows || []).map(r=>r.rede).filter(Boolean)).join(', '),
      fileName,
      importBatchId:importId,
      newImportId:importId,
      current: duplicateRowsSummary(currentRows, 'sales'),
      incoming: duplicateRowsSummary(rows, 'sales'),
      conflictKeys,
      conflictDates,
      conflictRedes,
      sameFileImportIds:sameFile,
      pendingRows:sanitizeRowsForDuplicate(rows),
      pendingIssues:sanitizeRowsForDuplicate(issues || []),
      importSummary:{...(importSummary || {}), id:importId, fileName, importedAt: options.importedAt || new Date().toISOString(), dateFrom:range.from, dateTo:range.to, dates:range.dates},
      message: sameFile.length ? 'Arquivo/base já importado ou período conflitante. A nova base foi recusada até decisão do operador.' : 'Período de venda já importado. A nova base foi recusada até decisão do operador.'
    };
  }

  function duplicateStatusText(status){
    return ({PENDENTE:'Pendente', MANTIDA_ATUAL:'Mantida atual', SUBSTITUIDA_PELA_NOVA:'Substituída pela nova', IMPORTADAS_DATAS_NOVAS:'Importadas datas novas', IGNORADA:'Ignorada'})[status] || status || 'Pendente';
  }

  function duplicateStatusClass(status){
    return status === 'PENDENTE' ? 'amber' : (status === 'SUBSTITUIDA_PELA_NOVA' || status === 'IMPORTADAS_DATAS_NOVAS' ? 'green' : 'gray');
  }
  function dateInRange(date, from, to){
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }
  function sumSales(storeId, productId, dates=[]){
    return Store.data.sales
      .filter(r => r.storeId===storeId && r.productId===productId && (!dates.length || dates.includes(r.date)))
      .reduce((a,r)=>a+toNumber(r.qty),0);
  }
  function sumDeliveryQty(storeId, productId, dates=[]){
    return Store.data.deliveries
      .filter(r => r.storeId===storeId && r.productId===productId && (!dates.length || dates.includes(r.date)))
      .reduce((a,r)=>a+validQty(r),0);
  }
  function sumDeliveryValue(storeId, productId, dates=[]){
    return Store.data.deliveries
      .filter(r => r.storeId===storeId && r.productId===productId && (!dates.length || dates.includes(r.date)))
      .reduce((a,r)=>a+validValue(r),0);
  }

  function salesAverageCalc(storeId, productId, dates=[], increasePct=0){
    const selectedDates = unique(dates || []).sort();
    const rows = Store.data.sales || [];
    const byDate = {};
    selectedDates.forEach(d => { byDate[d] = 0; });
    rows.forEach(r => {
      if (r.storeId !== storeId || r.productId !== productId) return;
      if (!selectedDates.length || selectedDates.includes(r.date)) {
        byDate[r.date] = (byDate[r.date] || 0) + toNumber(r.qty);
      }
    });
    const detail = selectedDates.map(date => ({date, qty: toNumber(byDate[date])}));
    const withSales = detail.filter(d => d.qty > 0);
    const total = withSales.reduce((a,d)=>a+d.qty,0);
    const average = withSales.length ? total / withSales.length : 0;
    const pct = toNumber(increasePct);
    const suggestion = average > 0 ? Math.ceil(average * (1 + pct / 100)) : 0;
    return {
      selectedDates, detail, total, average, suggestion, increasePct:pct,
      daysWithSales: withSales.length, selectedCount: selectedDates.length,
      missingDates: detail.filter(d => d.qty <= 0).map(d => d.date)
    };
  }

  function sumSalesForPending(storeId, productId, dates=[]){
    return Store.data.sales
      .filter(r => r.storeId===storeId && r.productId===productId && (!dates.length || dates.includes(r.date)))
      .reduce((a,r)=>a+toNumber(r.qty),0);
  }
  function getCommercialSuggestion(storeId, productId, date){
    return sumDeliveryQty(storeId, productId, [date]);
  }

  function offerStart(offer){ return offer?.startDate || offer?.date || ''; }
  function offerEnd(offer){ return offer?.endDate || offer?.date || offerStart(offer); }
  function offerIsActiveOn(offer, date){
    if (!offer || !date) return false;
    const start = offerStart(offer);
    const end = offerEnd(offer);
    return (!start || date >= start) && (!end || date <= end);
  }
  function offerStoreIds(offer){ return Array.isArray(offer?.storeIds) ? offer.storeIds.filter(Boolean) : []; }
  function offerAllStores(offer){ return !offerStoreIds(offer).length; }

  function offerMatchesStore(offer, store){
    if (!offer || !store) return false;
    if (offer.rede && offer.rede !== store.rede) return false;
    const storeIds = offerStoreIds(offer);
    if (storeIds.length && !storeIds.includes(store.id)) return false;
    return true;
  }

  function offerScopeLabel(offer){
    const ids = offerStoreIds(offer);
    if (!ids.length) return 'Todas as lojas da rede';
    if (ids.length === 1) return storeById(ids[0])?.nome || '1 loja selecionada';
    return `${ids.length} lojas selecionadas`;
  }

  function offerPeriodLabel(offer){
    const start = offerStart(offer);
    const end = offerEnd(offer);
    if (!start && !end) return '—';
    if (start === end) return formatDate(start);
    return `${formatDate(start)} a ${formatDate(end)}`;
  }

  function monthRange(month){
    const base = month || todayISO().slice(0,7);
    const start = `${base}-01`;
    const d = new Date(`${start}T12:00:00`);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return {start, end: d.toISOString().slice(0,10)};
  }

  function offerOverlapsMonth(offer, month){
    if (!month) return true;
    const m = monthRange(month);
    return offerStart(offer) <= m.end && offerEnd(offer) >= m.start;
  }

  function getActiveOfferForStore(storeId, productId, date){
    const store = storeById(storeId);
    if (!store || !productId || !date) return null;
    return (Store.data.offers || [])
      .filter(o => offerIsActiveOn(o, date) && o.productId === productId && offerMatchesStore(o, store))
      .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0] || null;
  }

  function getOffersForStoreDate(storeId, date, type=null){
    const store = storeById(storeId);
    if (!store || !date) return [];
    return (Store.data.offers || []).filter(o => {
      const p = productById(o.productId);
      return offerIsActiveOn(o, date) && offerMatchesStore(o, store) && (!type || p?.tipo === type);
    });
  }

  function getOffersForRedeDate(rede, date, type=null){
    if (!date) return [];
    return (Store.data.offers || []).filter(o => {
      const p = productById(o.productId);
      return offerIsActiveOn(o, date) && (!rede || o.rede === rede) && (!type || p?.tipo === type);
    });
  }

  function renderOfferNotice(offer){
    if (!offer) return '';
    const p = productById(offer.productId);
    const period = offerPeriodLabel(offer);
    const periodInfo = period && period !== '—' ? ` • período: ${period}` : '';
    return `<div class="offer-notice"><strong>🏷 Item em oferta nesta data</strong><span>${escapeHtml(p?.nomeSistema || 'Produto')} por ${money.format(toNumber(offer.price))}${periodInfo}${offer.notes ? ' • '+escapeHtml(offer.notes) : ''}</span></div>`;
  }

  function renderStoreOfferSummary(storeId, date, type){
    const offers = getOffersForStoreDate(storeId, date, type);
    if (!offers.length) return '';
    return `<div class="card offer-summary-card">
      <h3>🏷 Produtos em oferta nesta data</h3>
      <div class="offer-chip-row">
        ${offers.map(o => {
          const p = productById(o.productId);
          return `<span class="offer-chip">${escapeHtml(p?.nomeSistema || 'Produto')} • ${money.format(toNumber(o.price))}</span>`;
        }).join('')}
      </div>
      <p class="muted small">Essas ofertas aparecem como ressalva nos itens do pedido para o promotor e para o comercial.</p>
    </div>`;
  }

  function getCurrentOrder(storeId, type, date=todayISO()){
    let order = Store.data.orders.find(o => o.storeId===storeId && o.type===type && o.date===date);
    if (!order) {
      order = { id: uid('order'), storeId, type, date, status:'RASCUNHO', submittedAt:null, lines:{} };
      for (const p of getStoreProducts(storeId, type)) {
        order.lines[p.id] = { productId:p.id, inventoryGross:0, quebraQty:0, suggestion:0, justification:'', updatedAt:null };
      }
      Store.data.orders.push(order);
    } else {
      for (const p of getStoreProducts(storeId, type)) {
        order.lines[p.id] ||= { productId:p.id, inventoryGross:0, quebraQty:0, suggestion:0, justification:'', updatedAt:null };
      }
    }
    return order;
  }

  function lineStats(storeId, productId, type, orderDate=todayISO()){
    const conf = Store.data.conciliation[type] || {baseDates:[], pendingDates:[], increasePct:0};
    const salesCalc = salesAverageCalc(storeId, productId, conf.baseDates, conf.increasePct);
    const saleBase = salesCalc.suggestion;
    const deliveryBase = sumDeliveryQty(storeId, productId, conf.baseDates);
    const aproveitamento = deliveryBase > 0 ? (salesCalc.average / deliveryBase) * 100 : (salesCalc.average > 0 ? 100 : 0);
    const vendaPendente = type === 'BANDEJA' ? sumSalesForPending(storeId, productId, conf.pendingDates) : 0;
    const sugestaoComercial = getCommercialSuggestion(storeId, productId, orderDate);
    return { saleBase, deliveryBase, aproveitamento, vendaPendente, sugestaoComercial, salesCalc };
  }

  function getLineInventoryGood(line){
    return Math.max(0, toNumber(line.inventoryGross) - toNumber(line.quebraQty));
  }

  function orderLineStatus(line, stats, type){
    const inventoryGood = getLineInventoryGood(line);
    const suggestion = toNumber(line.suggestion);
    const reasons = [];
    let level = 'ok', label = 'OK';
    if (suggestion === 0 && stats.saleBase > inventoryGood) {
      level = 'red'; label = 'Justificativa obrigatória';
      reasons.push(`Venda base (${stats.saleBase}) maior que inventário bom (${inventoryGood}) e sugestão zerada.`);
    }
    if (stats.deliveryBase > 0 && stats.saleBase >= stats.deliveryBase) {
      if (level !== 'red') { level = 'amber'; label = 'Venda reprimida'; }
      reasons.push('Venda igual ou superior à entrega base. Pode ter vendido tudo que recebeu.');
    } else if (stats.deliveryBase > 0 && (stats.saleBase / stats.deliveryBase) >= .9) {
      if (level === 'ok') { level = 'amber'; label = 'Alta saída'; }
      reasons.push('Venda acima de 90% da entrega base.');
    }
    if (type === 'BANDEJA') {
      if (suggestion < stats.saleBase) { level = 'red'; label = 'Alerta de falta'; reasons.push('Sugestão da loja abaixo da venda do período.'); }
      else if (suggestion === stats.saleBase && stats.saleBase > 0) { if (level !== 'red') { level='amber'; label='Atenção'; } reasons.push('Sugestão igual à venda prevista, sem margem de segurança.'); }
      if (inventoryGood - stats.vendaPendente < 0) { if (level !== 'red') { level='amber'; label='Risco até entrega'; } reasons.push('Inventário insuficiente até a nova entrega.'); }
    }
    return {level,label,reasons};
  }

  function canEditOrder(date){
    const now = new Date();
    const [h,m] = Store.data.appConfig.pedidoDeadline.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(h,m,0,0);
    const isToday = date === todayISO();
    return !isToday || now <= deadline;
  }
  function canEditQuebra(date){
    const now = new Date();
    const [h,m] = Store.data.appConfig.quebraDeadline.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(h,m,0,0);
    const isToday = date === todayISO();
    return !isToday || now <= deadline;
  }

  function adminPageBadge(id){
    if (id === 'pendencias') return computePendencies().filter(p=>p.status!=='ENCERRADA').length;
    if (id === 'rupturas') return computeRuptures().length + computeCriticalRuptureAlerts({onlyPending:true}).length;
    if (id === 'chamados') return (Store.data.tickets || []).filter(t => t.status === 'ABERTO').length;
    if (id === 'duplicidades') return (Store.data.importDuplicates || []).filter(d => d.status === 'PENDENTE').length;
    return 0;
  }

  function ticketVisibleToSession(t, user=state.session){
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'commercial') return true;
    if (user.role === 'store') {
      return String(t.storeId || '') === String(user.storeId || '') || normalizeLogin(t.createdBy) === normalizeLogin(user.usuario || '');
    }
    return false;
  }

  function storeTicketBadge(){
    if (!state.session || state.session.role !== 'store') return 0;
    return (Store.data.tickets || []).filter(t => ticketVisibleToSession(t) && ['ABERTO','EM_ATENDIMENTO'].includes(t.status)).length;
  }

  function isBackofficeUser(user=state.session){
    return user && (user.role === 'admin' || user.role === 'commercial');
  }

  function userCanAccessPage(page, user=state.session){
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'commercial') {
      const p = ADMIN_PAGES.find(x => x.id === page);
      if (!p || p.adminOnly) return false;
      return sanitizePermissions(user.permissions || []).includes(page);
    }
    return ['inicio-loja','pedido','quebras','inventario-saida','estoque-loja','precos-loja','meus-pedidos','historico-loja','correcao-loja','chamados'].includes(page);
  }

  function firstAccessibleAdminPage(user=state.session){
    if (!user) return 'dashboard';
    if (user.role === 'admin') return 'dashboard';
    const perms = sanitizePermissions(user.permissions || []);
    return (ADMIN_PAGES.find(p => !p.adminOnly && perms.includes(p.id))?.id) || 'dashboard';
  }

  function renderNav(){
    const isBackoffice = isBackofficeUser();
    const pageById = new Map(ADMIN_PAGES.map(p => [p.id, p]));
    const navButton = ([id, ico, label, badge]) => `
      <button class="nav-item ${state.page===id?'active':''}" data-page="${id}">
        <span class="nav-icon">${ico}</span><span>${label}</span>${badge?`<span class="nav-badge">${badge}</span>`:''}
      </button>`;

    let html = '';
    if (isBackoffice) {
      html = NAV_GROUPS.map(group => {
        const items = group.pages
          .map(id => pageById.get(id))
          .filter(Boolean)
          .filter(p => state.session.role === 'admin' || (!p.adminOnly && userCanAccessPage(p.id)))
          .map(p => [p.id, p.icon, p.label, adminPageBadge(p.id)]);
        if (!items.length) return '';
        const isOpen = group.pages.includes(state.page) || group.title === 'Painel';
        return `<details class="nav-group" ${isOpen ? 'open' : ''}><summary class="nav-group-title">${escapeHtml(group.title)}</summary>${items.map(navButton).join('')}</details>`;
      }).join('');
    } else {
      html = STORE_NAV_GROUPS.map(group => {
        const items = group.items.map(item => item[0] === 'chamados' ? [...item, storeTicketBadge()] : item);
        const isOpen = items.some(item => item[0] === state.page) || group.title === 'Início';
        return `<details class="nav-group" ${isOpen ? 'open' : ''}><summary class="nav-group-title">${escapeHtml(group.title)}</summary>${items.map(navButton).join('')}</details>`;
      }).join('');
    }

    $('#navMenu').innerHTML = html;
    $$('#navMenu .nav-item').forEach(btn=>btn.addEventListener('click',()=>{
      state.page = btn.dataset.page;
      document.body.classList.remove('sidebar-open');
      render();
    }));
  }

  function render(){
    if (!state.session) return renderLogin();
    $('#loginView').classList.add('hidden');
    $('#appShell').classList.remove('hidden');
    renderNav();
    const isBackoffice = isBackofficeUser();
    document.body.classList.toggle('store-user', !isBackoffice);
    document.body.classList.toggle('admin-user', isBackoffice);
    document.body.classList.toggle('store-mobile', !isBackoffice && state.mobileMode);
    const mobileBtn = $('#mobileModeBtn');
    if (mobileBtn) {
      mobileBtn.classList.toggle('hidden', isBackoffice);
      mobileBtn.textContent = state.mobileMode ? '🖥️ Fechar modo mobile' : '📱 Abrir modo mobile';
    }
    $('#profileName').textContent = state.session.role === 'admin' ? 'Administrador Comercial' : (state.session.role === 'commercial' ? state.session.nome : (storeById(state.session.storeId)?.nome || state.session.nome));
    $('#contextBadge').textContent = state.session.role === 'admin' ? 'ADM Comercial' : (state.session.role === 'commercial' ? 'Comercial' : `Loja: ${storeById(state.session.storeId)?.nome || ''}`);
    if (isBackoffice) renderAdmin();
    else renderStore();
  }

  function renderLogin(){
    $('#loginView').classList.remove('hidden');
    $('#appShell').classList.add('hidden');
  }

  function setTitle(title, subtitle){
    $('#pageTitle').textContent = title;
    $('#pageSubtitle').textContent = subtitle || '';
  }

  function renderStoreHome(){
    const storeId = state.session.storeId;
    const store = storeById(storeId);
    const today = todayISO();
    const ref = promoterDeliveryReference(today);
    const priceRequired = isPriceCheckRequiredDate(today);
    const priceProducts = getStorePriceProducts(storeId);
    const pricesSaved = priceProducts.filter(p => toNumber(getPriceCheckRecord(today, storeId, p.id)?.storePrice) > 0).length;
    const orderCards = ['FOLHAGEM','BANDEJA'].map(type => {
      const conf = Store.data.conciliation[type] || {};
      const date = conf.orderDate || today;
      const order = getCurrentOrder(storeId, type, date);
      const products = getStoreProducts(storeId, type);
      const filled = products.filter(p => {
        const line = order.lines?.[p.id] || {};
        return toNumber(line.suggestion) > 0 || String(line.justification || '').trim();
      }).length;
      return {type, date, status:order.status, products:products.length, filled};
    });
    const activeTickets = (Store.data.tickets || []).filter(t => ticketVisibleToSession(t) && ['ABERTO','EM_ATENDIMENTO'].includes(t.status)).length;
    const invRowsToday = (Store.data.inventoryOut || []).filter(r => r.storeId === storeId && (ref.dates || []).includes(r.date));
    const stockRows = computeStoreStockRows({storeId}).filter(r => toNumber(r.currentGood) > 0 || toNumber(r.lastDeliveryQty) > 0).slice(0, 6);
    setTitle('Visão Geral da Loja', 'Pendências e atalhos principais para o promotor.');
    $('#viewRoot').innerHTML = `
      <section class="clear-hero store-home-hero">
        <div>
          <span class="eyebrow">Painel do promotor</span>
          <h1>${escapeHtml(store?.nome || 'Loja')}</h1>
          <p>Veja o que precisa ser preenchido hoje, sem procurar nas abas. Use os cartões abaixo para acessar cada rotina.</p>
          <div class="hero-status-row">
            <span class="status-chip">Entrega vinculada: ${escapeHtml(promoterDeliveryReferenceLabel(ref))}</span>
            <span class="status-chip ${priceRequired ? 'amber' : 'green'}">Preços: ${priceRequired ? 'obrigatório hoje' : 'opcional hoje'}</span>
          </div>
        </div>
      </section>
      <div class="clear-task-grid">
        ${clearTaskCard('Pedidos de folhagens', `${orderCards[0].filled}/${orderCards[0].products}`, `Data de entrega ${formatDate(orderCards[0].date)} • ${orderCards[0].status}`, 'pedido', orderCards[0].status === 'ENVIADO' ? 'green' : 'amber')}
        ${clearTaskCard('Pedidos de bandejas', `${orderCards[1].filled}/${orderCards[1].products}`, `Data de entrega ${formatDate(orderCards[1].date)} • ${orderCards[1].status}`, 'pedido', orderCards[1].status === 'ENVIADO' ? 'green' : 'amber')}
        ${clearTaskCard('Quebras', fmt.format(sum(orderCards.map(x=>0))), `Referente à entrega ${promoterDeliveryReferenceLabel(ref)}`, 'quebras', 'amber')}
        ${clearTaskCard('Inventário', fmt.format(invRowsToday.length), 'registros preenchidos para a entrega vinculada', 'inventario-saida', invRowsToday.length ? 'green' : 'amber')}
        ${clearTaskCard('Preços em loja', `${pricesSaved}/${priceProducts.length}`, priceRequired ? 'preenchimento obrigatório hoje' : 'preenchimento opcional', 'precos-loja', priceRequired && pricesSaved < priceProducts.length ? 'red' : 'green')}
        ${clearTaskCard('Chamados', fmt.format(activeTickets), 'abertos ou em atendimento', 'chamados', activeTickets ? 'amber' : 'green')}
      </div>
      <div class="clear-section-grid">
        <div class="card clear-panel">
          <div class="panel-head"><div><h3>Estoque em loja</h3><p class="muted small">Resumo para apoiar o pedido.</p></div><button class="btn btn-sm btn-soft" onclick="App.go('estoque-loja')">Ver estoque</button></div>
          ${renderStoreStockTable(stockRows, {showStore:false})}
        </div>
        <div class="card clear-panel">
          <div class="panel-head"><div><h3>Atalhos rápidos</h3><p class="muted small">Acesse somente o que precisa preencher.</p></div></div>
          <div class="quick-action-grid">
            <button class="quick-action" onclick="App.go('pedido')"><strong>Pedidos</strong><span>Enviar sugestão</span></button>
            <button class="quick-action" onclick="App.go('quebras')"><strong>Quebras</strong><span>Lançar avarias</span></button>
            <button class="quick-action" onclick="App.go('inventario-saida')"><strong>Inventário</strong><span>Estoque atual</span></button>
            <button class="quick-action" onclick="App.go('precos-loja')"><strong>Preços</strong><span>Preço da gôndola</span></button>
          </div>
        </div>
      </div>`;
  }

  function renderStore(){
    const page = state.page;
    if (page === 'inicio-loja') renderStoreHome();
    else if (page === 'pedido') renderOrderPage();
    else if (page === 'quebras') renderStoreBreaks();
    else if (page === 'inventario-saida') renderStoreInventoryOut();
    else if (page === 'estoque-loja') renderStoreStockPage();
    else if (page === 'precos-loja') renderStorePriceCheckPage();
    else if (page === 'chamados') renderTickets();
    else if (page === 'meus-pedidos') renderStoreOrders();
    else if (page === 'historico-loja') renderStoreHistory();
    else if (page === 'correcao-loja') renderStoreCorrections();
    else renderOrderPage();
  }

  function renderOrderPage(){
    setTitle('Sistema de Pedidos Comerciais', 'Crie e envie o pedido com base na última base de vendas.');
    const storeId = state.session.storeId;
    const store = storeById(storeId);
    const type = state.orderType;
    const conf = Store.data.conciliation[type] || {};
    const orderDate = conf.orderDate || todayISO();
    const order = getCurrentOrder(storeId, type, orderDate);
    const products = getStoreProducts(storeId, type);
    const editLocked = !canEditOrder(order.date) || order.status === 'ENVIADO';
    const quebraLocked = !canEditQuebra(order.date) || order.status === 'ENVIADO';
    const rows = products.map(p => {
      const line = order.lines[p.id];
      const stats = lineStats(storeId, p.id, type, order.date);
      const invGood = getLineInventoryGood(line);
      const status = orderLineStatus(line, stats, type);
      const justReq = status.reasons.some(r=>r.includes('sugestão zerada')) && !String(line.justification||'').trim();
      return {p,line,stats,invGood,status,justReq};
    });
    const req = rows.filter(r=>r.justReq).length;
    const filled = rows.filter(r=>toNumber(r.line.suggestion)>0 || String(r.line.justification||'').trim() || getLineInventoryGood(r.line)>=r.stats.saleBase).length;
    $('#viewRoot').innerHTML = `
      <div class="view-head">
        <div>
          <h1>${store.nome}</h1>
          <p class="muted">Pedido de ${type === 'FOLHAGEM' ? 'Folhagens' : 'Bandejas'} • Data de entrega ${formatDate(order.date)} • Base: ${(conf.baseDates||[]).map(formatDate).join(', ') || 'não conciliada'}</p>
        </div>
        <div class="actions">
          <span class="status-chip ${conf.baseDates?.length?'':'amber'}">${conf.baseDates?.length?'✓ Base conciliada':'Base pendente'}</span>
          <span class="status-chip amber">⏱ Prazo pedido até ${Store.data.appConfig.pedidoDeadline}</span>
          <label class="date-inline-label">Data de entrega <input type="date" id="orderDateInput" value="${order.date}" /></label>
        </div>
      </div>
      <div class="filter-row">
        <div class="segmented">
          <button data-type="FOLHAGEM" class="${type==='FOLHAGEM'?'active':''}">☘ Folhagens</button>
          <button data-type="BANDEJA" class="${type==='BANDEJA'?'active':''}">▦ Bandejas</button>
        </div>
        ${editLocked ? `<span class="status-chip red">Pedido bloqueado após horário ou já enviado</span>` : ''}
      </div>
      ${renderStoreOfferSummary(storeId, order.date, type)}
      ${renderStoreStockSummaryInOrder(storeId, type, order.date)}
      <div class="grid kpis">
        ${kpi('☘','Itens ativos',products.length,'de '+products.length+' itens')}
        ${kpi('!','Itens em atenção',rows.filter(r=>r.status.level!=='ok').length,'validar antes de enviar','amber')}
        ${kpi('✎','Pendências',req,'justificativa obrigatória',req?'red':'')}
        ${kpi('▥','Última base de venda',(conf.baseDates||[]).slice(-1).map(formatDate)[0] || '—','conciliação ADM')}
        ${kpi('↯','Correções',Store.data.corrections.filter(c=>c.storeId===storeId && c.status==='PENDENTE').length,'aguardando ADM','amber')}
        ${kpi('✓','Preenchimento',Math.round((filled/Math.max(1,rows.length))*100)+'%','do pedido')}
      </div>
      <div class="table-wrap order-table-wrap">
        <table class="order-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th class="num">Venda base</th>
              <th class="num">Entrega base</th>
              <th class="num">Inventário bom</th>
              <th class="num">Sugestão da loja</th>
              <th class="num">Sugestão comercial</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r=>renderOrderRow(order, r, editLocked)).join('')}
          </tbody>
        </table>
      </div>
      <div class="grid three" style="margin-top:14px">
        <div class="card">
          <h3>Observações da loja</h3>
          <textarea id="orderNotes" placeholder="Digite observações relevantes para o time comercial...">${order.notes||''}</textarea>
        </div>
        <div class="card">
          <h3>Solicitar correção</h3>
          <p class="muted">Use quando identificar divergência na base, inventário, quebra ou sugestão já bloqueada pelo horário.</p>
          <button class="btn btn-soft" id="requestGeneralCorrection">Solicitar correção da base</button>
        </div>
        <div class="card">
          <h3>Status do pedido</h3>
          <div style="display:flex;gap:14px;align-items:center">
            <div class="progress-ring"><span>${Math.round((filled/Math.max(1,rows.length))*100)}%</span></div>
            <div>
              <strong>${filled} de ${rows.length} itens preenchidos</strong><br>
              <span class="muted">${req} justificativas obrigatórias</span><br>
              <span class="muted">${order.status}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-actions">
        <button class="btn btn-ghost" id="saveDraft">💾 Salvar rascunho</button>
        <button class="btn btn-primary" id="sendOrder">✈ Enviar pedido</button>
      </div>
    `;
    $$('.segmented button').forEach(b=>b.addEventListener('click',()=>{state.orderType=b.dataset.type; render();}));
    $('#orderDateInput').addEventListener('change', e=>{
      Store.data.conciliation[type].orderDate = e.target.value || todayISO();
      Store.save().then(render);
    });
    $$('#viewRoot [data-field]').forEach(inp=>{
      inp.addEventListener('input', e=>{
        const line = order.lines[e.target.dataset.productId];
        const field = e.target.dataset.field;
        if (field === 'inventoryGross' && editLocked) return;
        if (field === 'suggestion' && editLocked) return;
        if (field === 'quebraQty' && quebraLocked) return;
        line[field] = field === 'justification' ? e.target.value : toNumber(e.target.value);
        line.updatedAt = new Date().toISOString();
        Store.save();
        renderOrderTotalsSoft(order);
      });
      inp.addEventListener('change', ()=>Store.save().then(render));
    });
    $('#orderNotes').addEventListener('input', e=>{ order.notes=e.target.value; Store.save(); });
    $('#saveDraft').addEventListener('click', ()=> Store.save().then(()=>toast('Rascunho salvo.')));
    $('#sendOrder').addEventListener('click', async ()=>{
      const missing = rows.filter(r=>r.justReq && !String(r.line.justification||'').trim());
      if (missing.length) return toast('Existem itens com justificativa obrigatória antes do envio.', 'error');
      order.status = 'ENVIADO';
      order.submittedAt = new Date().toISOString();
      await Store.save();
      toast('Pedido enviado para análise comercial.');
      render();
    });
    $('#requestGeneralCorrection').addEventListener('click', ()=>openCorrectionModal(storeId, null, 'Base geral do pedido'));
  }


  function priceCheckWeekdays(){
    const days = Array.isArray(Store.data.appConfig?.priceCheckWeekdays) ? Store.data.appConfig.priceCheckWeekdays : [1,3,5];
    return days.map(toNumber).filter(n => n >= 0 && n <= 6);
  }

  function isPriceCheckRequiredDate(date=todayISO()){
    const d = new Date((parseDate(date) || todayISO()) + 'T12:00:00');
    return priceCheckWeekdays().includes(d.getDay());
  }

  function priceWeekdayLabel(){
    const labels = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    return priceCheckWeekdays().map(d => labels[d]).join(', ');
  }

  function getPriceCheckRecord(date, storeId, productId, create=false){
    Store.data.priceChecks ||= [];
    let row = Store.data.priceChecks.find(r => r.date === date && r.storeId === storeId && r.productId === productId);
    if (!row && create) {
      const store = storeById(storeId);
      const product = productById(productId);
      row = {
        id: uid('price'),
        date,
        rede: store?.rede || '',
        storeId,
        storeName: store?.nome || '',
        productId,
        productName: product?.nomeSistema || '',
        productType: product?.tipo || '',
        storePrice: 0,
        createdBy: state.session?.usuario || 'sistema',
        updatedBy: state.session?.usuario || 'sistema',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      Store.data.priceChecks.push(row);
    }
    return row;
  }

  function latestPriceCheck(storeId, productId, beforeDate=todayISO()){
    return (Store.data.priceChecks || [])
      .filter(r => r.storeId === storeId && r.productId === productId && r.date <= beforeDate && toNumber(r.storePrice) > 0)
      .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
  }

  function getStorePriceProducts(storeId){
    return activeProducts(null)
      .filter(p => isProductActiveForStore(storeId, p.id))
      .sort((a,b) => String(a.tipo || '').localeCompare(String(b.tipo || '')) || a.nomeSistema.localeCompare(b.nomeSistema));
  }

  function computePriceRows({dateFrom='', dateTo='', rede='', storeId='', productId='', tipo='AMBOS', marginMin='', marginMax=''}={}){
    const from = dateFrom || addDays(todayISO(), -30);
    const to = dateTo || todayISO();
    let rows = (Store.data.priceChecks || [])
      .filter(r => toNumber(r.storePrice) > 0)
      .filter(r => dateInRange(r.date, from, to))
      .filter(r => !rede || r.rede === rede)
      .filter(r => !storeId || r.storeId === storeId)
      .filter(r => !productId || r.productId === productId)
      .filter(r => {
        const product = productById(r.productId);
        const rowType = product?.tipo || r.productType || '';
        return !tipo || tipo === 'AMBOS' || rowType === tipo;
      })
      .map(r => {
        const product = productById(r.productId);
        const store = storeById(r.storeId);
        const cost = latestCost(r.storeId, r.productId, r.date);
        const price = toNumber(r.storePrice);
        const diff = cost > 0 ? price - cost : 0;
        const margin = cost > 0 && price > 0 ? (diff / price) * 100 : 0;
        const markup = cost > 0 ? ((price / cost) - 1) * 100 : 0;
        return {...r, product, store, cost, price, diff, margin, markup};
      });
    const min = marginMin === '' ? null : toNumber(marginMin);
    const max = marginMax === '' ? null : toNumber(marginMax);
    if (min !== null) rows = rows.filter(r => r.margin >= min);
    if (max !== null) rows = rows.filter(r => r.margin <= max);
    return rows.sort((a,b) => b.margin - a.margin || String(b.date || '').localeCompare(String(a.date || '')));
  }

  function renderStorePriceCheckPage(){
    const storeId = state.session.storeId;
    const store = storeById(storeId);
    const date = todayISO();
    const required = isPriceCheckRequiredDate(date);
    const products = getStorePriceProducts(storeId);
    const savedToday = products.filter(p => toNumber(getPriceCheckRecord(date, storeId, p.id)?.storePrice) > 0).length;
    setTitle('Preços em Loja', 'Preencha o preço real praticado na loja. O comercial acompanha os preços por loja, rede e produto.');
    $('#viewRoot').innerHTML = `
      <div class="view-head">
        <div>
          <h1>${escapeHtml(store?.nome || '')}</h1>
          <p class="muted">Coleta de preços de ${formatDate(date)}. Dias obrigatórios: ${escapeHtml(priceWeekdayLabel())}.</p>
        </div>
        <div class="actions">
          <span class="status-chip ${required ? 'amber' : 'green'}">${required ? 'Preenchimento obrigatório hoje' : 'Preenchimento opcional hoje'}</span>
          <span class="status-chip ${savedToday === products.length && products.length ? 'green' : 'amber'}">${savedToday}/${products.length} preços salvos</span>
        </div>
      </div>
      <div class="card">
        <h3>Preços reais da loja</h3>
        <p class="muted small">No dia obrigatório, os campos começam vazios para nova coleta. O promotor informa somente o preço de venda em loja; preço de entrega e margem não aparecem nesta tela.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Produto</th><th>Tipo</th><th class="num">Preço de venda em loja</th></tr></thead>
            <tbody>
              ${products.map(p => {
                const rec = getPriceCheckRecord(date, storeId, p.id);
                const value = rec && toNumber(rec.storePrice) > 0 ? toNumber(rec.storePrice).toFixed(2).replace('.', ',') : '';
                return `<tr>
                  <td data-label="Produto"><div class="product-cell"><span class="prod-dot"></span><strong>${escapeHtml(p.nomeSistema)}</strong></div></td>
                  <td data-label="Tipo">${escapeHtml(p.tipo || '')}</td>
                  <td data-label="Preço de venda em loja" class="num"><input class="input-xs price-store-input" data-price-product-id="${p.id}" type="text" inputmode="decimal" ${required ? 'required' : ''} value="${escapeHtml(value)}" placeholder="R$ 0,00"></td>
                </tr>`;
              }).join('') || `<tr><td colspan="3" class="center muted">Nenhum produto ativo para esta loja.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="footer-actions">
        <button class="btn btn-primary" id="saveStorePrices">💾 Salvar preços da loja</button>
      </div>
    `;
    $('#saveStorePrices')?.addEventListener('click', async () => {
      const missing = [];
      $$('#viewRoot [data-price-product-id]').forEach(inp => {
        const productId = inp.dataset.priceProductId;
        const product = productById(productId);
        const value = toNumber(inp.value);
        if (required && value <= 0) missing.push(product?.nomeSistema || productId);
      });
      if (missing.length) return toast(`Preencha todos os preços obrigatórios de hoje. Pendentes: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`, 'error');
      $$('#viewRoot [data-price-product-id]').forEach(inp => {
        const productId = inp.dataset.priceProductId;
        const value = toNumber(inp.value);
        if (value <= 0) return;
        const rec = getPriceCheckRecord(date, storeId, productId, true);
        rec.storePrice = value;
        rec.updatedBy = state.session?.usuario || 'promotor';
        rec.updatedAt = new Date().toISOString();
      });
      await Store.save();
      toast('Preços em loja salvos.');
      renderStorePriceCheckPage();
    });
  }

  function renderPriceMonitoringAdmin(){
    state.priceFilters ||= {dateFrom:addDays(todayISO(), -30), dateTo:todayISO(), rede:'', loja:'', product:'', tipo:'AMBOS', marginMin:'', marginMax:''};
    const f = state.priceFilters;
    if (!f.dateFrom) f.dateFrom = addDays(todayISO(), -30);
    if (!f.dateTo) f.dateTo = todayISO();
    const redes = getRedeOptions().filter(Boolean);
    const storeOptions = Store.data.stores.filter(st => !f.rede || st.rede === f.rede);
    if (!f.tipo) f.tipo = 'AMBOS';
    const priceAllowedTypes = selectedTypes(f.tipo || 'AMBOS');
    const productOptions = activeProducts(null).filter(p => priceAllowedTypes.includes(p.tipo)).sort((a,b)=>String(a.tipo || '').localeCompare(String(b.tipo || '')) || a.nomeSistema.localeCompare(b.nomeSistema));
    if (f.product && !productOptions.some(p => p.id === f.product)) f.product = '';
    const rows = computePriceRows({dateFrom:f.dateFrom, dateTo:f.dateTo, rede:f.rede, storeId:f.loja, productId:f.product, tipo:f.tipo, marginMin:f.marginMin, marginMax:f.marginMax});
    const avgMargin = rows.length ? rows.reduce((a,r)=>a+r.margin,0)/rows.length : 0;
    const avgMarkup = rows.length ? rows.reduce((a,r)=>a+r.markup,0)/rows.length : 0;
    const top = rows.slice(0, 12);
    const byStore = new Map();
    rows.forEach(r => {
      const key = r.storeId;
      const g = byStore.get(key) || {store:r.store, rede:r.rede, count:0, priceSum:0, costSum:0, marginSum:0};
      g.count += 1; g.priceSum += r.price; g.costSum += r.cost; g.marginSum += r.margin;
      byStore.set(key, g);
    });
    const storeRows = Array.from(byStore.values()).sort((a,b)=>(b.marginSum/Math.max(1,b.count))-(a.marginSum/Math.max(1,a.count))).slice(0, 20);
    setTitle('Acompanhamento de Preços', 'Acompanhe o preço praticado nas lojas e as maiores margens aplicadas por rede, loja e produto.');
    $('#viewRoot').innerHTML = `
      <div class="grid kpis">
        ${kpi('💲','Coletas',fmt.format(rows.length),'preços informados')}
        ${kpi('%','Margem média',avgMargin.toFixed(1).replace('.', ',')+'%','sobre preço da loja',avgMargin>=45?'amber':'')}
        ${kpi('↗','Markup médio',avgMarkup.toFixed(1).replace('.', ',')+'%','sobre preço Só Folhas')}
        ${kpi('🏬','Lojas acompanhadas',fmt.format(new Set(rows.map(r=>r.storeId)).size),'no período')}
      </div>
      <div class="card"><h3>Filtros</h3><div class="filter-row">
        <div class="filter">Data inicial <input type="date" id="priceDateFrom" value="${escapeHtml(f.dateFrom)}"></div>
        <div class="filter">Data final <input type="date" id="priceDateTo" value="${escapeHtml(f.dateTo)}"></div>
        <div class="filter">Rede <select id="priceRede"><option value="">Todas</option>${redes.map(r=>`<option value="${escapeHtml(r)}" ${f.rede===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
        <div class="filter">Loja <select id="priceStore"><option value="">Todas</option>${storeOptions.map(st=>`<option value="${st.id}" ${f.loja===st.id?'selected':''}>${escapeHtml(st.nome)}</option>`).join('')}</select></div>
        <div class="filter">Tipo <select id="priceType"><option value="AMBOS" ${(!f.tipo||f.tipo==='AMBOS')?'selected':''}>Folhagem e bandeja</option><option value="FOLHAGEM" ${f.tipo==='FOLHAGEM'?'selected':''}>Somente folhagem</option><option value="BANDEJA" ${f.tipo==='BANDEJA'?'selected':''}>Somente bandeja</option></select></div>
        <div class="filter">Produto <select id="priceProduct"><option value="">Todos</option>${productOptions.map(p=>`<option value="${p.id}" ${f.product===p.id?'selected':''}>${escapeHtml(p.tipo)} • ${escapeHtml(p.nomeSistema)}</option>`).join('')}</select></div>
        <div class="filter">Margem mínima <input type="number" id="priceMarginMin" value="${escapeHtml(f.marginMin)}" placeholder="Ex.: 40"></div>
        <div class="filter">Margem máxima <input type="number" id="priceMarginMax" value="${escapeHtml(f.marginMax)}" placeholder="Ex.: 60"></div>
      </div></div>
      <div class="grid two">
        <div class="card"><h3>Maiores margens por loja/produto</h3>${renderPriceRowsTable(top)}</div>
        <div class="card"><h3>Resumo por loja</h3>${renderPriceStoreSummaryTable(storeRows)}</div>
      </div>
      <div class="card"><h3>Todas as coletas no filtro</h3>${renderPriceRowsTable(rows.slice(0, 100), true)}${rows.length>100?`<p class="muted small">Mostrando 100 de ${fmt.format(rows.length)} registros. Use os filtros para refinar.</p>`:''}</div>
    `;
    $('#priceDateFrom')?.addEventListener('change', e => { f.dateFrom = e.target.value; renderPriceMonitoringAdmin(); });
    $('#priceDateTo')?.addEventListener('change', e => { f.dateTo = e.target.value; renderPriceMonitoringAdmin(); });
    $('#priceRede')?.addEventListener('change', e => { f.rede = e.target.value; f.loja = ''; renderPriceMonitoringAdmin(); });
    $('#priceStore')?.addEventListener('change', e => { f.loja = e.target.value; renderPriceMonitoringAdmin(); });
    $('#priceType')?.addEventListener('change', e => { f.tipo = e.target.value || 'AMBOS'; f.product = ''; renderPriceMonitoringAdmin(); });
    $('#priceProduct')?.addEventListener('change', e => { f.product = e.target.value; renderPriceMonitoringAdmin(); });
    $('#priceMarginMin')?.addEventListener('change', e => { f.marginMin = e.target.value; renderPriceMonitoringAdmin(); });
    $('#priceMarginMax')?.addEventListener('change', e => { f.marginMax = e.target.value; renderPriceMonitoringAdmin(); });
  }

  function priceMarginBadge(margin){
    if (margin >= 55) return 'red';
    if (margin >= 40) return 'amber';
    if (margin > 0) return 'green';
    return 'gray';
  }

  function renderPriceRowsTable(rows, includeUser=false){
    return `<div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Rede</th><th>Loja</th><th>Tipo</th><th>Produto</th><th class="num">Preço Só Folhas</th><th class="num">Preço loja</th><th class="num">Diferença</th><th class="num">Margem</th>${includeUser?'<th>Responsável</th>':''}</tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${formatDate(r.date)}</td>
        <td>${escapeHtml(r.rede || r.store?.rede || '')}</td>
        <td>${escapeHtml(r.store?.nome || r.storeName || '')}</td>
        <td>${escapeHtml(r.product?.tipo || r.productType || '')}</td>
        <td>${escapeHtml(r.product?.nomeSistema || r.productName || '')}</td>
        <td class="num">${r.cost ? money.format(r.cost) : '—'}</td>
        <td class="num">${money.format(r.price)}</td>
        <td class="num">${r.cost ? money.format(r.diff) : '—'}</td>
        <td class="num"><span class="badge ${priceMarginBadge(r.margin)}">${r.cost ? r.margin.toFixed(1).replace('.', ',')+'%' : 'sem custo'}</span></td>
        ${includeUser?`<td>${escapeHtml(r.updatedBy || r.createdBy || '')}</td>`:''}
      </tr>`).join('') || `<tr><td colspan="${includeUser?10:9}" class="center muted">Sem preços informados no filtro.</td></tr>`}</tbody>
    </table></div>`;
  }

  function renderPriceStoreSummaryTable(rows){
    return `<div class="table-wrap"><table>
      <thead><tr><th>Rede</th><th>Loja</th><th class="num">Itens</th><th class="num">Preço médio</th><th class="num">Margem média</th></tr></thead>
      <tbody>${rows.map(r => {
        const avgPrice = r.priceSum / Math.max(1, r.count);
        const avgMargin = r.marginSum / Math.max(1, r.count);
        return `<tr><td>${escapeHtml(r.rede || '')}</td><td>${escapeHtml(r.store?.nome || '')}</td><td class="num">${fmt.format(r.count)}</td><td class="num">${money.format(avgPrice)}</td><td class="num"><span class="badge ${priceMarginBadge(avgMargin)}">${avgMargin.toFixed(1).replace('.', ',')}%</span></td></tr>`;
      }).join('') || `<tr><td colspan="5" class="center muted">Sem resumo no filtro.</td></tr>`}</tbody>
    </table></div>`;
  }


  function renderStoreBreaks(){
    setTitle('Quebras', 'Registre as quebras da loja separadas dos pedidos e do inventário.');
    const storeId = state.session.storeId;
    const store = storeById(storeId);
    const type = state.orderType;
    const ref = promoterDeliveryReference();
    const refLabel = promoterDeliveryReferenceLabel(ref);
    const quebraLocked = !canEditQuebra(ref.fillDate);
    const products = getStoreProducts(storeId, type);
    const rows = products.map(p => {
      const cycle = inventoryCycleForProduct(storeId, p.id, type, ref);
      const order = getCurrentOrder(storeId, type, cycle.date);
      order.breakReferenceDates = cycle.dates;
      order.breakReferenceLabel = cycle.label;
      order.breakFilledAtDate = ref.fillDate;
      order.breakCycleMode = cycle.mode;
      const line = order.lines[p.id] || {productId:p.id, inventoryGross:0, quebraQty:0, suggestion:0, justification:'', updatedAt:null};
      order.lines[p.id] = line;
      const stats = lineStats(storeId, p.id, type, cycle.date);
      const delivered = sumDeliveryQty(storeId, p.id, cycle.dates);
      const stock = computeStoreStockRow(store, p, ref.fillDate);
      return {p,line,stats,cycle,order,delivered,stock};
    });
    const totalQuebra = sum(rows.map(r => toNumber(r.line.quebraQty)));
    const preenchidos = rows.filter(r => toNumber(r.line.quebraQty) > 0).length;
    const cycleHelp = type === 'BANDEJA'
      ? 'Bandejas são vinculadas à última entrega real encontrada para cada produto da loja.'
      : promoterDeliveryReferenceNotice(ref);
    $('#viewRoot').innerHTML = `
      <div class="view-head">
        <div>
          <h1>Quebras da Loja</h1>
          <p class="muted">Informe somente as quebras. ${cycleHelp}</p>
        </div>
        <div class="actions">
          <span class="status-chip amber">⏱ Prazo quebra até ${Store.data.appConfig.quebraDeadline}</span>
          <span class="status-chip green">📅 ${type === 'BANDEJA' ? 'Última entrega por produto' : 'Data de entrega: '+refLabel}</span>
        </div>
      </div>
      <div class="filter-row">
        <div class="segmented">
          <button data-type="FOLHAGEM" class="${type==='FOLHAGEM'?'active':''}">☘ Folhagens</button>
          <button data-type="BANDEJA" class="${type==='BANDEJA'?'active':''}">▦ Bandejas</button>
        </div>
        ${quebraLocked ? `<span class="status-chip red">Quebra bloqueada após horário permitido</span>` : '<span class="status-chip green">Quebra liberada para edição</span>'}
      </div>
      <div class="grid kpis">
        ${kpi('⚠','Total de quebra',fmt.format(totalQuebra),'unidades informadas',totalQuebra?'amber':'')}
        ${kpi('☘','Itens com quebra',preenchidos,'itens preenchidos')}
        ${kpi('▥','Tipo',type === 'FOLHAGEM' ? 'Folhagens' : 'Bandejas','categoria selecionada')}
        ${kpi('📅','Vínculo',type === 'BANDEJA' ? 'Última entrega real' : refLabel,type === 'BANDEJA' ? 'por loja e produto' : (ref.isWeekend ? 'segunda registra sábado e domingo' : 'dia anterior ao preenchimento'))}
      </div>
      <div class="table-wrap order-table-wrap">
        <table class="order-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Entrega vinculada</th>
              <th class="num">Qtd. entregue</th>
              <th class="num">Estoque atual bom</th>
              <th class="num">Quebra</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td data-label="Produto"><div class="product-cell"><span class="prod-dot"></span><strong>${escapeHtml(r.p.nomeSistema)}</strong></div></td>
                <td data-label="Entrega vinculada">${escapeHtml(r.cycle.label)}</td>
                <td data-label="Qtd. entregue" class="num">${fmt.format(r.delivered)}</td>
                <td data-label="Estoque atual bom" class="num">${r.stock?.hasInventory ? fmt.format(r.stock.stockCurrent) : '—'}</td>
                <td data-label="Quebra" class="num"><input class="input-xs" ${quebraLocked?'disabled':''} data-break-field="quebraQty" data-product-id="${r.p.id}" type="number" min="0" value="${toNumber(r.line.quebraQty)}"></td>
                <td data-label="Observação"><input ${quebraLocked?'disabled':''} data-break-field="breakNote" data-product-id="${r.p.id}" value="${escapeHtml(r.line.breakNote || '')}" placeholder="Ex.: avaria, produto ruim, sobra..." /></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="footer-actions">
        <button class="btn btn-ghost" id="saveBreaks">💾 Salvar quebras</button>
      </div>
    `;
    $$('.segmented button').forEach(b=>b.addEventListener('click',()=>{state.orderType=b.dataset.type; renderStoreBreaks();}));
    $$('[data-break-field]').forEach(inp=>{
      inp.addEventListener('input', e=>{
        const row = rows.find(r => r.p.id === e.target.dataset.productId);
        if (!row) return;
        const field = e.target.dataset.breakField;
        row.line[field] = field === 'breakNote' ? e.target.value : toNumber(e.target.value);
        row.line.updatedAt = new Date().toISOString();
        row.order.breakReferenceDates = row.cycle.dates;
        row.order.breakReferenceLabel = row.cycle.label;
        row.order.breakFilledAtDate = ref.fillDate;
        row.order.breakCycleMode = row.cycle.mode;
        Store.save();
      });
      inp.addEventListener('change', ()=>Store.save().then(renderStoreBreaks));
    });
    $('#saveBreaks')?.addEventListener('click', ()=>Store.save().then(()=>toast('Quebras salvas.')));
  }

  function renderOrderRow(order, r, editLocked){
    const {p,line,stats,invGood,status,justReq} = r;
    const offer = getActiveOfferForStore(order.storeId, p.id, order.date);
    const rowClass = status.level === 'red' ? 'warning-row' : '';
    return `
      <tr class="${rowClass}">
        <td data-label="Produto">
          <div class="product-cell"><span class="prod-dot"></span><strong>${p.nomeSistema}</strong></div>
          ${renderOfferNotice(offer)}
          ${justReq ? `<div class="justify-box">
            <strong>⚠ Justificativa obrigatória:</strong>
            <span>${status.reasons.join(' ')}</span>
            <input data-field="justification" data-product-id="${p.id}" value="${escapeHtml(line.justification||'')}" placeholder="Digite a justificativa..." />
            <button class="btn btn-sm btn-danger" onclick="App.openCorrectionModal('${order.storeId}','${p.id}','${p.nomeSistema}')">Solicitar correção</button>
          </div>`:''}
        </td>
        <td data-label="Venda base" class="num">${fmt.format(stats.saleBase)}</td>
        <td data-label="Entrega base" class="num">${fmt.format(stats.deliveryBase)}</td>
        <td data-label="Inventário bom" class="num ${invGood < stats.saleBase ? 'negative' : 'positive'}">${fmt.format(invGood)}</td>
        <td data-label="Sugestão da loja" class="num"><input class="input-sm ${justReq?'input-error':''}" ${editLocked?'disabled':''} data-field="suggestion" data-product-id="${p.id}" type="number" min="0" value="${toNumber(line.suggestion)}"></td>
        <td data-label="Sugestão comercial" class="num"><span class="badge gray">🔒 ${fmt.format(stats.sugestaoComercial)}</span></td>
        <td data-label="Status"><span class="badge ${status.level==='red'?'red':status.level==='amber'?'amber':'green'}">${status.label}</span></td>
      </tr>`;
  }

  function renderOrderTotalsSoft(order){ /* deliberate no full re-render while typing */ }

  function renderStoreOrders(){
    setTitle('Meus Pedidos', 'Histórico de pedidos enviados pela loja.');
    const storeId = state.session.storeId;
    const rows = Store.data.orders.filter(o=>o.storeId===storeId).sort((a,b)=>b.date.localeCompare(a.date));
    $('#viewRoot').innerHTML = `<div class="card"><h3>Pedidos da loja</h3>${renderOrdersTable(rows)}</div>`;
  }
  function renderStoreHistory(){
    setTitle('Histórico da Loja', 'Entregas, quebras, faltas e qualidade da loja.');
    const storeId = state.session.storeId;
    const rows = Store.data.deliveries.filter(d=>d.storeId===storeId).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,200);
    $('#viewRoot').innerHTML = `<div class="card"><h3>Entregas PDF</h3>${renderDeliveryTable(rows)}</div>`;
  }
  function renderStoreCorrections(){
    setTitle('Solicitações da Loja', 'Acompanhe pedidos de correção enviados para o ADM.');
    const storeId = state.session.storeId;
    $('#viewRoot').innerHTML = `<div class="card"><h3>Solicitações de correção</h3>${renderCorrectionsTable(Store.data.corrections.filter(c=>c.storeId===storeId))}</div>`;
  }

  function latestOperationalDate(){
    const dates = unique([
      ...(Store.data.deliveries || []).map(d => d.date),
      ...(Store.data.sales || []).map(d => d.date),
      ...(Store.data.cancelledNfes || []).map(d => d.date),
      ...(Store.data.offers || []).flatMap(o => [offerStart(o), offerEnd(o)])
    ].filter(Boolean)).sort();
    return dates[dates.length - 1] || todayISO();
  }

  function dayClosingIssueDate(i){
    if (i.date) return i.date;
    const detail = String(i.detail || '');
    const brDate = detail.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (brDate) return parseDate(brDate[1]);
    const isoDate = detail.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
    const groupDate = String(i.importGroupKey || '').match(/^(\d{4}-\d{2}-\d{2})/);
    if (groupDate) return groupDate[1];
    return '';
  }

  function computeDayClosing(date, redeFilter=''){
    const expectedRedes = expectedPdfRedes().filter(r => !redeFilter || r === redeFilter);
    const deliveries = (Store.data.deliveries || []).filter(d => d.date === date && (!redeFilter || d.rede === redeFilter));
    const sales = (Store.data.sales || []).filter(r => r.date === date && (!redeFilter || r.rede === redeFilter));
    const cancelled = (Store.data.cancelledNfes || []).filter(c => c.date === date && (!redeFilter || c.rede === redeFilter));
    const offers = (Store.data.offers || []).filter(o => dateInRange(date, offerStart(o), offerEnd(o)) && (!redeFilter || o.rede === redeFilter));
    const criticalPending = computeCriticalRuptureAlerts({dateFrom:date, dateTo:date, rede:redeFilter, onlyPending:true});
    const criticalAll = computeCriticalRuptureAlerts({dateFrom:date, dateTo:date, rede:redeFilter});
    const issues = (Store.data.importIssues || []).filter(i => {
      if (!importIssueStillRelevant(i)) return false;
      const type = String(i.type || i.source || '').toUpperCase();
      const isRelevantType = ['PDF','XML','BASE_VENDA'].includes(type) || /PDF|XML|BASE/i.test(`${i.message||''} ${i.detail||''}`);
      if (!isRelevantType) return false;
      const issueDate = dayClosingIssueDate(i);
      if (issueDate !== date) return false;
      if (redeFilter) {
        const text = normalize(`${i.rede || ''} ${i.detail || ''} ${i.fileName || ''}`);
        if (!text.includes(normalize(redeFilter))) return false;
      }
      return true;
    });

    const deliveryByRede = new Map();
    deliveries.forEach(d => {
      const rede = d.rede || 'Rede não identificada';
      if (!deliveryByRede.has(rede)) deliveryByRede.set(rede, {rede, notes:new Set(), stores:new Set(), files:new Set(), sourceTypes:new Set(), items:0, qty:0, value:0});
      const g = deliveryByRede.get(rede);
      g.notes.add(d.importGroupKey || d.orderNumber || d.id);
      if (d.storeId) g.stores.add(d.storeId);
      if (d.fileName) g.files.add(d.fileName);
      if (d.sourceFileName) g.files.add(d.sourceFileName);
      g.sourceTypes.add(deliverySourceLabel(d));
      g.items += 1;
      g.qty += validQty(d);
      g.value += validValue(d);
    });

    const salesByRede = new Map();
    sales.forEach(r => {
      const rede = r.rede || 'Rede não identificada';
      if (!salesByRede.has(rede)) salesByRede.set(rede, {rede, stores:new Set(), products:new Set(), records:0, qty:0, imports:new Set()});
      const g = salesByRede.get(rede);
      if (r.storeId) g.stores.add(r.storeId);
      if (r.productId) g.products.add(r.productId);
      if (r.importId) g.imports.add(r.importId);
      g.records += 1;
      g.qty += toNumber(r.qty);
    });

    const importedDeliveryRedes = Array.from(deliveryByRede.keys()).filter(r => r !== 'Rede não identificada').sort();
    const salesRedes = Array.from(salesByRede.keys()).filter(r => r !== 'Rede não identificada').sort();
    const missingDeliveryRedes = expectedRedes.filter(r => !importedDeliveryRedes.includes(r));
    const allRedes = unique([...expectedRedes, ...importedDeliveryRedes, ...salesRedes]).sort();
    const redeRows = allRedes.map(rede => {
      const d = deliveryByRede.get(rede) || {rede, notes:new Set(), stores:new Set(), files:new Set(), sourceTypes:new Set(), items:0, qty:0, value:0};
      const s = salesByRede.get(rede) || {rede, stores:new Set(), products:new Set(), records:0, qty:0, imports:new Set()};
      const pend = criticalPending.filter(r => r.store.rede === rede).length;
      const can = cancelled.filter(c => c.rede === rede).length;
      return {rede, delivery:d, sales:s, pendingCritical:pend, cancelled:can};
    });

    const blockers = [];
    if (missingDeliveryRedes.length) blockers.push(`Falta importar NF/XML/PDF de: ${missingDeliveryRedes.join(', ')}`);
    if (!sales.length) blockers.push('Base de vendas sem registro na data selecionada');
    if (criticalPending.length) blockers.push(`${criticalPending.length} ruptura(s) obrigatória(s) sem justificativa`);
    if (issues.length) blockers.push(`${issues.length} divergência(s) de importação para conferir`);

    return {
      date, redeFilter, expectedRedes, deliveries, sales, cancelled, offers, criticalPending, criticalAll, issues,
      deliveryByRede, salesByRede, importedDeliveryRedes, salesRedes, missingDeliveryRedes, redeRows,
      totalDeliveryValue: deliveries.reduce((a,d)=>a+validValue(d),0),
      totalDeliveryQty: deliveries.reduce((a,d)=>a+validQty(d),0),
      totalSalesQty: sales.reduce((a,r)=>a+toNumber(r.qty),0),
      totalNotes: unique(deliveries.map(d => d.importGroupKey || d.orderNumber || d.id)).length,
      blockers,
      status: blockers.length ? 'PENDENTE' : 'OK'
    };
  }

  function renderDayClosingRedeTable(rows){
    return `<div class="table-wrap"><table>
      <thead><tr><th>Rede</th><th>Status NF/XML/PDF</th><th>Status base</th><th class="num">Notas</th><th class="num">Lojas NF</th><th class="num">Qtd. entregue</th><th class="num">Valor entregue</th><th class="num">Qtd. vendida</th><th>Alertas</th></tr></thead>
      <tbody>${rows.map(r => {
        const hasDelivery = r.delivery.items > 0;
        const hasSales = r.sales.records > 0;
        const alerts = [];
        if (r.pendingCritical) alerts.push(`<span class="badge red">${fmt.format(r.pendingCritical)} ruptura(s)</span>`);
        if (r.cancelled) alerts.push(`<span class="badge amber">${fmt.format(r.cancelled)} NF cancelada(s)</span>`);
        return `<tr>
          <td><strong>${escapeHtml(r.rede)}</strong></td>
          <td>${hasDelivery ? `<span class="badge green">OK • ${Array.from(r.delivery.sourceTypes).join('/') || 'NF'}</span>` : '<span class="badge red">Pendente</span>'}</td>
          <td>${hasSales ? '<span class="badge green">OK</span>' : '<span class="badge amber">Sem base</span>'}</td>
          <td class="num">${fmt.format(r.delivery.notes.size || 0)}</td>
          <td class="num">${fmt.format(r.delivery.stores.size || 0)}</td>
          <td class="num">${fmt.format(r.delivery.qty || 0)}</td>
          <td class="num">${money.format(r.delivery.value || 0)}</td>
          <td class="num">${fmt.format(r.sales.qty || 0)}</td>
          <td>${alerts.join(' ') || '<span class="badge green">Sem alerta</span>'}</td>
        </tr>`;
      }).join('') || `<tr><td colspan="9" class="center muted">Nenhum dado encontrado na data.</td></tr>`}</tbody>
    </table></div>`;
  }

  function renderDayClosingPendingList(items){
    if (!items.length) return `<div class="empty">Nenhuma ruptura obrigatória pendente nesta data.</div>`;
    return `<div class="table-wrap"><table>
      <thead><tr><th>Rede</th><th>Loja</th><th>Item obrigatório</th><th>Última entrega</th><th class="num">Dias sem entrega</th><th>Ação</th></tr></thead>
      <tbody>${items.map(r => `<tr class="warning-row">
        <td>${escapeHtml(r.store.rede)}</td>
        <td>${escapeHtml(r.store.nome)}</td>
        <td><strong>${escapeHtml(r.product.nomeSistema)}</strong></td>
        <td>${r.lastDelivery ? formatDate(r.lastDelivery) : 'Sem entrega anterior'}</td>
        <td class="num">${r.days ?? '—'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="App.openCriticalRuptureJustification('${r.date}','${r.store.id}','${r.product.id}')">Justificar</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function renderDayClosingCancelledList(items){
    if (!items.length) return `<div class="empty">Nenhuma NF cancelada rejeitada nesta data.</div>`;
    return `<div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Rede</th><th>Loja</th><th>NF</th><th>Arquivo</th><th>Motivo</th><th class="num">Itens removidos</th></tr></thead>
      <tbody>${items.map(c => `<tr>
        <td>${formatDate(c.date)}</td>
        <td>${escapeHtml(c.rede || '—')}</td>
        <td>${escapeHtml(c.loja || 'Loja não identificada')}</td>
        <td>${escapeHtml(c.nfNumber || c.chave || '—')}</td>
        <td>${escapeHtml(c.fileName || '—')}</td>
        <td>${escapeHtml(c.reason || 'NF-e cancelada')}</td>
        <td class="num">${fmt.format(c.removedItems || 0)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function renderDayClosingIssuesList(items){
    if (!items.length) return `<div class="empty">Nenhuma divergência de importação para esta data.</div>`;
    return `<div class="table-wrap"><table>
      <thead><tr><th>Origem</th><th>Arquivo</th><th>Tipo</th><th>Mensagem</th><th>Detalhe</th></tr></thead>
      <tbody>${items.slice(0,80).map(i => `<tr>
        <td>${escapeHtml(i.type || i.source || '—')}</td>
        <td>${escapeHtml(i.fileName || '—')}</td>
        <td>${escapeHtml(i.kind || 'Divergência')}</td>
        <td>${escapeHtml(i.message || '—')}</td>
        <td>${escapeHtml(issueText(i) || i.detail || '—')}</td>
      </tr>`).join('')}${items.length > 80 ? `<tr><td colspan="5" class="center muted">Exibindo 80 de ${fmt.format(items.length)} divergências.</td></tr>` : ''}</tbody>
    </table></div>`;
  }

  function renderDayClosing(){
    state.dayClosing ||= {date:'', rede:''};
    if (!state.dayClosing.date) state.dayClosing.date = latestOperationalDate();
    setTitle('Fechamento do Dia', 'Confira rapidamente se NF/XML/PDF, base de vendas, ofertas e rupturas estão prontos para análise.');
    const date = state.dayClosing.date;
    const rede = state.dayClosing.rede || '';
    const redes = expectedPdfRedes();
    const closing = computeDayClosing(date, rede);
    const statusCls = closing.status === 'OK' ? 'green' : 'red';
    $('#viewRoot').innerHTML = `
      <div class="card day-closing-head">
        <div class="panel-head">
          <div>
            <h3>Controle de fechamento</h3>
            <p class="muted">Use esta tela antes de analisar pedidos. Ela mostra o que ainda falta importar ou justificar no dia selecionado.</p>
          </div>
          <span class="badge ${statusCls}">${closing.status === 'OK' ? 'Fechamento OK' : 'Fechamento pendente'}</span>
        </div>
        <div class="filter-row">
          <div class="filter">Data <input type="date" id="closingDate" value="${escapeHtml(date)}"></div>
          <div class="filter">Rede <select id="closingRede"><option value="">Todas as redes</option>${redes.map(r => `<option value="${escapeHtml(r)}" ${rede===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
          <button class="btn btn-primary" id="closingRefresh">Atualizar fechamento</button>
          <button class="btn btn-soft" onclick="App.go('importar-pdf')">Importar XML/PDF</button>
          <button class="btn btn-soft" onclick="App.go('bases')">Importar base</button>
        </div>
        ${closing.blockers.length ? `<div class="closing-blockers">${closing.blockers.map(b => `<div>⚠ ${escapeHtml(b)}</div>`).join('')}</div>` : `<div class="closing-ok">✓ Todos os pontos principais estão prontos para esta data.</div>`}
      </div>

      <div class="grid kpis" style="margin-top:14px">
        ${kpi('✓','Status geral',closing.status, closing.status === 'OK' ? 'pronto para análise' : 'existem pendências', statusCls)}
        ${kpi('▣','NF/XML/PDF',`${fmt.format(closing.importedDeliveryRedes.length)}/${fmt.format(closing.expectedRedes.length)}`, closing.missingDeliveryRedes.length ? `faltam: ${closing.missingDeliveryRedes.join(', ')}` : 'redes importadas', closing.missingDeliveryRedes.length ? 'amber' : 'green')}
        ${kpi('▤','Base de vendas',fmt.format(closing.sales.length),'registros na data', closing.sales.length ? 'green' : 'amber')}
        ${kpi('🏷','Ofertas ativas',fmt.format(closing.offers.length),'cadastradas para o dia', closing.offers.length ? 'green' : '')}
        ${kpi('🚨','Rupturas pendentes',fmt.format(closing.criticalPending.length),'itens obrigatórios sem justificativa', closing.criticalPending.length ? 'red' : 'green')}
        ${kpi('!','Divergências',fmt.format(closing.issues.length + closing.cancelled.length),`${fmt.format(closing.cancelled.length)} NF cancelada(s)`, closing.issues.length ? 'amber' : (closing.cancelled.length ? 'amber' : 'green'))}
      </div>

      <div class="card">
        <h3>Resumo por rede</h3>
        ${renderDayClosingRedeTable(closing.redeRows)}
      </div>

      <div class="grid two" style="margin-top:14px">
        <div class="card"><h3>Rupturas obrigatórias pendentes</h3>${renderDayClosingPendingList(closing.criticalPending)}</div>
        <div class="card"><h3>NF cancelada rejeitada</h3>${renderDayClosingCancelledList(closing.cancelled)}</div>
      </div>

      <div class="card" style="margin-top:14px">
        <h3>Divergências de importação do dia</h3>
        ${renderDayClosingIssuesList(closing.issues)}
      </div>
    `;
    $('#closingDate')?.addEventListener('change', e => { state.dayClosing.date = e.target.value || latestOperationalDate(); renderDayClosing(); });
    $('#closingRede')?.addEventListener('change', e => { state.dayClosing.rede = e.target.value; renderDayClosing(); });
    $('#closingRefresh')?.addEventListener('click', () => renderDayClosing());
  }


  function inventoryOutKey(date, storeId, productId){
    return `${date}|${storeId}|${productId}`;
  }

  function inventoryLimitKey(rede, productId){
    return `${rede || 'GERAL'}|${productId}`;
  }

  function getInventoryLimit(rede, productId){
    const limits = Store.data.appConfig.inventoryOutLimits || {};
    const byRede = limits[inventoryLimitKey(rede, productId)];
    const global = limits[inventoryLimitKey('', productId)];
    const base = byRede || global || {};
    const minPct = Math.max(0, toNumber(base.minPct || 30));
    const criticalPct = Math.max(0, toNumber(base.criticalPct || Math.max(5, Math.floor(minPct / 2))));
    return {minPct, criticalPct};
  }

  function productTypeName(type){
    return type === 'BANDEJA' ? 'Bandejas' : type === 'FOLHAGEM' ? 'Folhagens' : 'Todos';
  }

  function deliveryDatesForProduct(storeId, productId, beforeOrOn=todayISO()){
    return unique((Store.data.deliveries || [])
      .filter(d => d.storeId === storeId && d.productId === productId && (!beforeOrOn || d.date <= beforeOrOn))
      .map(d => d.date)).sort();
  }

  function latestDeliveryDateForProduct(storeId, productId, beforeOrOn=todayISO()){
    const dates = deliveryDatesForProduct(storeId, productId, beforeOrOn);
    return dates[dates.length - 1] || '';
  }

  function latestInventoryOutRecord(storeId, productId, beforeOrOn=todayISO(), {beforeOnly=false}={}){
    return (Store.data.inventoryOut || [])
      .filter(r => r.storeId === storeId && r.productId === productId && (!beforeOrOn || (beforeOnly ? r.date < beforeOrOn : r.date <= beforeOrOn)))
      .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0] || null;
  }

  function inventoryCycleForProduct(storeId, productId, type='FOLHAGEM', ref=promoterDeliveryReference()){
    if (type === 'BANDEJA') {
      const latest = latestDeliveryDateForProduct(storeId, productId, ref.fillDate || todayISO());
      if (latest) return {date: latest, dates: [latest], label: formatDate(latest), mode: 'ULTIMA_ENTREGA_REAL'};
      return {date: ref.primaryDate, dates: ref.dates, label: promoterDeliveryReferenceLabel(ref), mode: 'SEM_ENTREGA_RECENTE'};
    }
    return {date: ref.primaryDate, dates: ref.dates, label: promoterDeliveryReferenceLabel(ref), mode: ref.isWeekend ? 'FIM_DE_SEMANA' : 'DIA_ANTERIOR'};
  }

  function getBreakQtyForStock(storeId, productId, dates=[]){
    const dateSet = new Set((dates || []).filter(Boolean));
    return (Store.data.orders || []).reduce((total, order) => {
      if (order.storeId !== storeId) return total;
      if (dateSet.size && !dateSet.has(order.date)) return total;
      const line = order.lines?.[productId];
      return total + toNumber(line?.quebraQty);
    }, 0);
  }

  function computeStoreStockRow(store, product, limitDate=todayISO()){
    if (!store || !product) return null;
    const type = product.tipo || '';
    const latestDeliveryDate = latestDeliveryDateForProduct(store.id, product.id, limitDate);
    const latestInv = latestInventoryOutRecord(store.id, product.id, limitDate);
    if (!latestDeliveryDate && !latestInv) return null;
    const cycleDates = type === 'BANDEJA'
      ? (latestDeliveryDate ? [latestDeliveryDate] : inventoryRecordReferenceDates(latestInv, latestInv?.date || limitDate))
      : inventoryRecordReferenceDates(latestInv, latestInv?.date || limitDate);
    const previousInv = type === 'BANDEJA' && latestDeliveryDate ? latestInventoryOutRecord(store.id, product.id, latestDeliveryDate, {beforeOnly:true}) : null;
    const delivered = sumDeliveryQty(store.id, product.id, cycleDates);
    const stockBefore = type === 'BANDEJA'
      ? toNumber(latestInv?.stockGoodBefore || previousInv?.stockCurrent || 0)
      : toNumber(latestInv?.stockGoodBefore || 0);
    const stockCurrent = toNumber(latestInv?.stockCurrent || 0);
    const breakQty = getBreakQtyForStock(store.id, product.id, cycleDates);
    const available = stockBefore + delivered;
    const soldEstimated = Math.max(0, available - stockCurrent - breakQty);
    const soldPct = available > 0 ? (soldEstimated / available) * 100 : 0;
    const remainingPct = available > 0 ? (stockCurrent / available) * 100 : 0;
    const limit = getInventoryLimit(store.rede, product.id);
    let status = 'OK', statusClass = 'green';
    if (!latestInv) { status = 'Sem inventário'; statusClass = 'amber'; }
    else if (available <= 0 && stockCurrent <= 0) { status = 'Sem entrega/estoque'; statusClass = 'gray'; }
    else if (remainingPct <= limit.criticalPct || stockCurrent <= 0) { status = 'Risco de falta'; statusClass = 'red'; }
    else if (remainingPct <= limit.minPct) { status = 'Estoque baixo'; statusClass = 'amber'; }
    else if (remainingPct >= Math.max(80, limit.minPct * 2.5) && available > 0) { status = 'Estoque alto'; statusClass = 'amber'; }
    const minDesired = available > 0 ? Math.ceil((available * limit.minPct) / 100) : 0;
    const reinforcement = Math.max(0, minDesired - stockCurrent);
    return {
      store, product, type, latestDeliveryDate, cycleDates, referenceLabel: cycleDates.length ? cycleDates.map(formatDate).join(' e ') : '—',
      latestInv, hasInventory: !!latestInv, previousStock: toNumber(previousInv?.stockCurrent || 0), stockBefore, delivered, stockCurrent,
      breakQty, available, soldEstimated, soldPct, remainingPct, limit, status, statusClass, reinforcement,
      updatedAt: latestInv?.updatedAt || latestInv?.createdAt || ''
    };
  }

  function computeStoreStockRows({date='', rede='', storeId='', productId='', status='', type=''}={}){
    const limitDate = date || todayISO();
    const stores = (Store.data.stores || []).filter(st => (!rede || st.rede === rede) && (!storeId || st.id === storeId));
    const rows = [];
    stores.forEach(store => {
      const products = activeProducts(type || null).filter(p => (!productId || p.id === productId) && isProductActiveForStore(store.id, p.id));
      products.forEach(product => {
        const row = computeStoreStockRow(store, product, limitDate);
        if (row) rows.push(row);
      });
    });
    let out = rows;
    if (status) out = out.filter(r => r.status === status);
    return out.sort((a,b) =>
      (a.statusClass === b.statusClass ? 0 : a.statusClass === 'red' ? -1 : b.statusClass === 'red' ? 1 : a.statusClass === 'amber' ? -1 : 1) ||
      a.store.nome.localeCompare(b.store.nome) || a.product.nomeSistema.localeCompare(b.product.nomeSistema)
    );
  }

  function renderStoreStockTable(rows, {showStore=false}={}){
    return `<div class="table-wrap"><table>
      <thead><tr>${showStore ? '<th>Rede</th><th>Loja</th>' : ''}<th>Produto</th><th>Tipo</th><th>Última entrega</th><th class="num">Estoque anterior</th><th class="num">Entrega</th><th class="num">Disponível</th><th class="num">Quebra</th><th class="num">Estoque bom atual</th><th class="num">Saída estimada</th><th>Status</th><th class="num">Reforço</th></tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.statusClass==='red'?'warning-row':''}">${showStore ? `<td>${escapeHtml(r.store.rede || '')}</td><td>${escapeHtml(r.store.nome || '')}</td>` : ''}<td><strong>${escapeHtml(r.product.nomeSistema)}</strong></td><td>${productTypeName(r.type)}</td><td>${escapeHtml(r.referenceLabel)}</td><td class="num">${fmt.format(r.stockBefore)}</td><td class="num">${fmt.format(r.delivered)}</td><td class="num">${fmt.format(r.available)}</td><td class="num">${fmt.format(r.breakQty)}</td><td class="num">${r.hasInventory ? fmt.format(r.stockCurrent) : '—'}</td><td class="num">${fmt.format(r.soldEstimated)}</td><td><span class="badge ${r.statusClass}">${r.status}</span></td><td class="num">${r.reinforcement ? fmt.format(r.reinforcement) : '—'}</td></tr>`).join('') || `<tr><td colspan="${showStore ? 13 : 11}" class="center muted">Nenhum estoque em loja encontrado para o filtro.</td></tr>`}</tbody>
    </table></div>`;
  }

  function renderStoreStockSummaryInOrder(storeId, type, orderDate){
    const store = storeById(storeId);
    if (!store) return '';
    const rows = computeStoreStockRows({storeId, type, date: todayISO()}).slice(0, 12);
    const critical = rows.filter(r => r.statusClass === 'red').length;
    const low = rows.filter(r => r.status === 'Estoque baixo' || r.status === 'Risco de falta').length;
    return `<div class="card stock-order-card">
      <div class="panel-head">
        <div>
          <h3>▦ Estoque em loja para apoiar o pedido</h3>
          <p class="muted small">${type === 'BANDEJA' ? 'Bandejas usam saldo contínuo e última entrega real por produto.' : 'Folhagens usam o inventário vinculado à entrega informada.'}</p>
        </div>
        <div class="actions"><span class="badge ${critical ? 'red' : low ? 'amber' : 'green'}">${critical ? critical+' crítico(s)' : low ? low+' atenção' : 'Sem alerta crítico'}</span><button class="btn btn-sm btn-soft" onclick="App.go('estoque-loja')">Ver estoque completo</button></div>
      </div>
      ${renderStoreStockTable(rows, {showStore:false})}
    </div>`;
  }

  function renderStoreStockPage(){
    state.storeStock ||= {type:'BANDEJA'};
    const storeId = state.session.storeId;
    const store = storeById(storeId);
    const type = state.storeStock.type || 'BANDEJA';
    const rows = computeStoreStockRows({storeId, type, date: todayISO()});
    const low = rows.filter(r => r.status === 'Estoque baixo' || r.status === 'Risco de falta').length;
    const totalCurrent = sum(rows.map(r => r.stockCurrent));
    setTitle('Estoque em Loja', 'Acompanhe o saldo bom atual por produto para apoiar pedidos, quebras e inventário.');
    $('#viewRoot').innerHTML = `
      <div class="view-head">
        <div><h1>${escapeHtml(store?.nome || '')}</h1><p class="muted">Saldo em loja por produto. Para bandejas, o saldo é contínuo e vinculado à última entrega real.</p></div>
      </div>
      <div class="filter-row"><div class="segmented"><button data-stock-type="BANDEJA" class="${type==='BANDEJA'?'active':''}">▦ Bandejas</button><button data-stock-type="FOLHAGEM" class="${type==='FOLHAGEM'?'active':''}">☘ Folhagens</button></div></div>
      <div class="grid kpis">${kpi('▦','Itens com saldo',rows.length,'produtos acompanhados')}${kpi('⚠','Atenção',low,'estoque baixo/risco',low?'amber':'green')}${kpi('✓','Estoque bom atual',fmt.format(totalCurrent),'unidades em loja')}</div>
      <div class="card"><h3>Estoque em loja</h3>${renderStoreStockTable(rows)}</div>
    `;
    $$('[data-stock-type]').forEach(btn => btn.addEventListener('click', () => { state.storeStock.type = btn.dataset.stockType; renderStoreStockPage(); }));
  }

  function renderStoreStockAdmin(){
    state.storeStock ||= {date:'', rede:'', loja:'', product:'', status:'', type:'BANDEJA'};
    const f = state.storeStock;
    if (!f.date) f.date = todayISO();
    const redes = getRedeOptions().filter(Boolean);
    const storeOptions = Store.data.stores.filter(st => !f.rede || st.rede === f.rede);
    const productOptions = activeProducts(f.type && f.type !== 'AMBOS' ? f.type : null).sort((a,b)=>a.nomeSistema.localeCompare(b.nomeSistema));
    const rows = computeStoreStockRows({date:f.date, rede:f.rede, storeId:f.loja, productId:f.product, status:f.status, type:f.type === 'AMBOS' ? '' : f.type});
    const low = rows.filter(r => r.status === 'Estoque baixo' || r.status === 'Risco de falta').length;
    const totalCurrent = sum(rows.map(r => r.stockCurrent));
    const totalReinforcement = sum(rows.map(r => r.reinforcement));
    setTitle('Estoque em Loja', 'Controle de saldo bom atual por loja e produto, com atenção especial para bandejas.');
    $('#viewRoot').innerHTML = `
      <div class="grid kpis">${kpi('▦','Itens analisados',fmt.format(rows.length),'produtos/lojas')}${kpi('⚠','Atenção',fmt.format(low),'estoque baixo/risco',low?'red':'green')}${kpi('✓','Estoque bom atual',fmt.format(totalCurrent),'unidades')}${kpi('+','Reforço sugerido',fmt.format(totalReinforcement),'unidades')}</div>
      <div class="card"><h3>Filtros do estoque</h3><div class="filter-row">
        <div class="filter">Data limite <input type="date" id="stockDate" value="${escapeHtml(f.date)}"></div>
        <div class="filter">Tipo <select id="stockType"><option value="BANDEJA" ${f.type==='BANDEJA'?'selected':''}>Bandejas</option><option value="FOLHAGEM" ${f.type==='FOLHAGEM'?'selected':''}>Folhagens</option><option value="AMBOS" ${f.type==='AMBOS'?'selected':''}>Ambos</option></select></div>
        <div class="filter">Rede <select id="stockRede"><option value="">Todas</option>${redes.map(r=>`<option value="${escapeHtml(r)}" ${f.rede===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
        <div class="filter">Loja <select id="stockStore"><option value="">Todas</option>${storeOptions.map(st=>`<option value="${st.id}" ${f.loja===st.id?'selected':''}>${escapeHtml(st.nome)}</option>`).join('')}</select></div>
        <div class="filter">Produto <select id="stockProduct"><option value="">Todos</option>${productOptions.map(p=>`<option value="${p.id}" ${f.product===p.id?'selected':''}>${escapeHtml(p.nomeSistema)}</option>`).join('')}</select></div>
        <div class="filter">Status <select id="stockStatus"><option value="">Todos</option>${['OK','Atenção','Estoque baixo','Risco de falta','Estoque alto','Sem inventário','Sem entrega/estoque'].map(x=>`<option value="${x}" ${f.status===x?'selected':''}>${x}</option>`).join('')}</select></div>
      </div></div>
      <div class="card"><h3>Saldo por loja e produto</h3><p class="muted small">Bandejas: estoque anterior + última entrega - quebra - saída estimada = estoque bom atual informado pelo promotor.</p>${renderStoreStockTable(rows, {showStore:true})}</div>
    `;
    $('#stockDate')?.addEventListener('change', e => { state.storeStock.date = e.target.value || todayISO(); renderStoreStockAdmin(); });
    $('#stockType')?.addEventListener('change', e => { state.storeStock.type = e.target.value; state.storeStock.product = ''; renderStoreStockAdmin(); });
    $('#stockRede')?.addEventListener('change', e => { state.storeStock.rede = e.target.value; state.storeStock.loja = ''; renderStoreStockAdmin(); });
    $('#stockStore')?.addEventListener('change', e => { state.storeStock.loja = e.target.value; renderStoreStockAdmin(); });
    $('#stockProduct')?.addEventListener('change', e => { state.storeStock.product = e.target.value; renderStoreStockAdmin(); });
    $('#stockStatus')?.addEventListener('change', e => { state.storeStock.status = e.target.value; renderStoreStockAdmin(); });
  }

  function getInventoryOutRecord(date, storeId, productId, create=false){
    Store.data.inventoryOut ||= [];
    let row = Store.data.inventoryOut.find(r => r.date === date && r.storeId === storeId && r.productId === productId);
    if (!row && create) {
      const store = storeById(storeId);
      const product = productById(productId);
      row = {
        id: uid('invout'),
        date,
        rede: store?.rede || '',
        storeId,
        storeName: store?.nome || '',
        productId,
        productName: product?.nomeSistema || '',
        productType: product?.tipo || '',
        stockGoodBefore: 0,
        stockCurrent: 0,
        notes: '',
        createdBy: state.session?.usuario || 'sistema',
        updatedBy: state.session?.usuario || 'sistema',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      Store.data.inventoryOut.push(row);
    }
    return row;
  }

  function findInventoryOutRecordForDate(date, storeId, productId){
    return (Store.data.inventoryOut || []).find(r =>
      r.storeId === storeId &&
      r.productId === productId &&
      (r.date === date || (Array.isArray(r.referenceDates) && r.referenceDates.includes(date)))
    );
  }

  function inventoryRecordReferenceDates(record, fallbackDate){
    const dates = unique(Array.isArray(record?.referenceDates) ? record.referenceDates : []);
    return dates.length ? dates : [fallbackDate];
  }

  function computeInventoryOutRows({date='', rede='', storeId='', productId='', status=''}={}){
    const day = date || todayISO();
    const stores = (Store.data.stores || []).filter(st => (!rede || st.rede === rede) && (!storeId || st.id === storeId));
    const rows = [];
    stores.forEach(store => {
      const productIds = new Set();
      (Store.data.deliveries || []).forEach(d => {
        if (d.date === day && d.storeId === store.id && (!productId || d.productId === productId)) productIds.add(d.productId);
      });
      (Store.data.inventoryOut || []).forEach(r => {
        const recordMatchesDay = r.date === day || (Array.isArray(r.referenceDates) && r.referenceDates.includes(day));
        if (recordMatchesDay && r.storeId === store.id && (!productId || r.productId === productId)) productIds.add(r.productId);
      });
      Array.from(productIds).forEach(pid => {
        const product = productById(pid);
        if (!product) return;
        const inv = findInventoryOutRecordForDate(day, store.id, pid);
        const deliveryDates = inventoryRecordReferenceDates(inv, day);
        const delivered = sumDeliveryQty(store.id, pid, deliveryDates);
        const stockGood = toNumber(inv?.stockGoodBefore);
        const stockCurrent = toNumber(inv?.stockCurrent);
        const available = stockGood + delivered;
        const soldEstimated = Math.max(0, available - stockCurrent);
        const soldPct = available > 0 ? (soldEstimated / available) * 100 : 0;
        const remainingPct = available > 0 ? (stockCurrent / available) * 100 : 0;
        const limit = getInventoryLimit(store.rede, pid);
        let stLabel = 'OK', stClass = 'green';
        if (!inv) { stLabel = 'Sem inventário'; stClass = 'amber'; }
        else if (available <= 0) { stLabel = 'Sem entrega/estoque'; stClass = 'gray'; }
        else if (remainingPct <= limit.criticalPct || stockCurrent <= 0) { stLabel = 'Risco de falta'; stClass = 'red'; }
        else if (remainingPct <= limit.minPct) { stLabel = 'Estoque baixo'; stClass = 'amber'; }
        else if (remainingPct <= limit.minPct * 1.25) { stLabel = 'Atenção'; stClass = 'amber'; }
        const minDesired = available > 0 ? Math.ceil((available * limit.minPct) / 100) : 0;
        const reinforcement = Math.max(0, minDesired - stockCurrent);
        rows.push({date:day, store, product, inv, delivered, stockGood, stockCurrent, available, soldEstimated, soldPct, remainingPct, limit, status:stLabel, statusClass:stClass, reinforcement});
      });
    });
    let out = rows;
    if (status) out = out.filter(r => r.status === status);
    return out.sort((a,b) => (a.statusClass === b.statusClass ? 0 : a.statusClass === 'red' ? -1 : b.statusClass === 'red' ? 1 : a.statusClass === 'amber' ? -1 : 1) || a.store.nome.localeCompare(b.store.nome) || a.product.nomeSistema.localeCompare(b.product.nomeSistema));
  }

  function renderStoreInventoryOut(){
    state.inventoryOut ||= {date:'', type:'FOLHAGEM'};
    const ref = promoterDeliveryReference();
    const refLabel = promoterDeliveryReferenceLabel(ref);
    state.inventoryOut.date = ref.primaryDate;
    const storeId = state.session.storeId;
    const store = storeById(storeId);
    const type = state.inventoryOut.type || 'FOLHAGEM';
    const products = getStoreProducts(storeId, type);
    const rows = products.map(p => {
      const cycle = inventoryCycleForProduct(storeId, p.id, type, ref);
      const previousInv = type === 'BANDEJA' && cycle.date ? latestInventoryOutRecord(storeId, p.id, cycle.date, {beforeOnly:true}) : null;
      const inv = getInventoryOutRecord(cycle.date, storeId, p.id, false) || {};
      const delivered = sumDeliveryQty(storeId, p.id, cycle.dates);
      const stockBeforeDefault = type === 'BANDEJA' ? toNumber(previousInv?.stockCurrent || 0) : 0;
      const stockGood = inv.id ? toNumber(inv.stockGoodBefore) : stockBeforeDefault;
      const stockCurrent = toNumber(inv.stockCurrent);
      const breakQty = getBreakQtyForStock(storeId, p.id, cycle.dates);
      const available = stockGood + delivered;
      const soldEstimated = Math.max(0, available - stockCurrent - breakQty);
      const soldPct = available > 0 ? (soldEstimated / available) * 100 : 0;
      const remainingPct = available > 0 ? (stockCurrent / available) * 100 : 0;
      return {p, inv, cycle, previousInv, delivered, stockGood, stockCurrent, breakQty, available, soldEstimated, soldPct, remainingPct};
    });
    const filled = rows.filter(r => r.inv && (toNumber(r.inv.stockGoodBefore) > 0 || toNumber(r.inv.stockCurrent) > 0 || String(r.inv.notes || '').trim())).length;
    setTitle('Inventário de Saída', 'Informe o estoque bom da loja e o estoque atual para o comercial avaliar risco de falta e possível reforço.');
    $('#viewRoot').innerHTML = `
      <div class="view-head">
        <div>
          <h1>${escapeHtml(store?.nome || '')}</h1>
          <p class="muted">Inventário de saída • ${type === 'BANDEJA' ? 'Bandejas vinculadas à última entrega real' : 'Data de entrega '+refLabel+' • Folhagens'}</p>
        </div>
        <div class="actions">
          <span class="status-chip green">📅 ${type === 'BANDEJA' ? 'Última entrega por produto' : 'Data de entrega: '+refLabel}</span>
        </div>
      </div>
      <div class="filter-row">
        <div class="segmented">
          <button data-inv-type="FOLHAGEM" class="${type==='FOLHAGEM'?'active':''}">☘ Folhagens</button>
          <button data-inv-type="BANDEJA" class="${type==='BANDEJA'?'active':''}">▦ Bandejas</button>
        </div>
        <span class="status-chip">${fmt.format(filled)} itens preenchidos</span>
      </div>
      <div class="card">
        <h3>Preenchimento do inventário</h3>
        <p class="muted small">${type === 'BANDEJA' ? 'Para bandejas, o sistema usa saldo contínuo: estoque anterior + última entrega real - quebra - saída estimada = estoque bom atual.' : promoterDeliveryReferenceNotice(ref)+' Estoque disponível = estoque bom informado + entrega vinculada.'}</p>
        <div class="table-wrap order-table-wrap"><table class="order-table">
          <thead><tr><th>Produto</th><th>Entrega vinculada</th><th class="num">Entrega</th><th class="num">${type === 'BANDEJA' ? 'Estoque anterior' : 'Estoque bom loja'}</th><th class="num">Quebra</th><th class="num">Estoque atual bom</th><th class="num">Disponível</th><th class="num">% vendido</th><th>Observação</th></tr></thead>
          <tbody>${rows.map(r => `
            <tr>
              <td data-label="Produto"><strong>${escapeHtml(r.p.nomeSistema)}</strong></td>
              <td data-label="Entrega vinculada">${escapeHtml(r.cycle.label)}</td>
              <td data-label="Entrega" class="num">${fmt.format(r.delivered)}</td>
              <td data-label="${type === 'BANDEJA' ? 'Estoque anterior' : 'Estoque bom loja'}" class="num"><input class="input-xs" data-inventory-field="stockGoodBefore" data-product-id="${r.p.id}" type="number" min="0" value="${toNumber(r.stockGood)}"></td>
              <td data-label="Quebra" class="num">${fmt.format(r.breakQty)}</td>
              <td data-label="Estoque atual bom" class="num"><input class="input-xs" data-inventory-field="stockCurrent" data-product-id="${r.p.id}" type="number" min="0" value="${toNumber(r.inv.stockCurrent)}"></td>
              <td data-label="Disponível" class="num">${fmt.format(r.available)}</td>
              <td data-label="% vendido" class="num">${r.available ? r.soldPct.toFixed(1).replace('.',',')+'%' : '—'}</td>
              <td data-label="Observação"><input data-inventory-field="notes" data-product-id="${r.p.id}" value="${escapeHtml(r.inv.notes || '')}" placeholder="Ex.: vendendo rápido, sem espaço, reforço solicitado..."></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
      <div class="footer-actions"><button class="btn btn-primary" id="saveInventoryOut">💾 Salvar inventário</button></div>
    `;
    $$('[data-inv-type]').forEach(btn => btn.addEventListener('click', () => { state.inventoryOut.type = btn.dataset.invType; renderStoreInventoryOut(); }));
    $$('[data-inventory-field]').forEach(inp => {
      inp.addEventListener('input', e => {
        const row = rows.find(r => r.p.id === e.target.dataset.productId);
        if (!row) return;
        const rec = getInventoryOutRecord(row.cycle.date, storeId, row.p.id, true);
        if (type === 'BANDEJA' && !toNumber(rec.stockGoodBefore) && toNumber(row.previousInv?.stockCurrent) > 0) rec.stockGoodBefore = toNumber(row.previousInv.stockCurrent);
        const field = e.target.dataset.inventoryField;
        rec[field] = field === 'notes' ? e.target.value : toNumber(e.target.value);
        rec.referenceDates = row.cycle.dates;
        rec.referenceLabel = row.cycle.label;
        rec.cycleMode = row.cycle.mode;
        rec.filledAtDate = ref.fillDate;
        rec.productType = row.p.tipo || type;
        rec.updatedBy = state.session?.usuario || 'promotor';
        rec.updatedAt = new Date().toISOString();
      });
    });
    $('#saveInventoryOut')?.addEventListener('click', async () => { await Store.save(); toast('Inventário de saída salvo.'); renderStoreInventoryOut(); });
  }

  function renderInventoryOutLimitRows(){
    const limits = Store.data.appConfig.inventoryOutLimits || {};
    const rows = Object.entries(limits).map(([key, cfg]) => {
      const [rede, productId] = key.split('|');
      return {key, rede: rede === 'GERAL' ? '' : rede, product: productById(productId), minPct: toNumber(cfg.minPct), criticalPct: toNumber(cfg.criticalPct)};
    }).filter(r => r.product).sort((a,b)=>(a.rede||'').localeCompare(b.rede||'') || a.product.nomeSistema.localeCompare(b.product.nomeSistema));
    return `<div class="table-wrap"><table><thead><tr><th>Rede</th><th>Produto</th><th class="num">Mínimo aceitável</th><th class="num">Crítico</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${escapeHtml(r.rede || 'Todas')}</td><td>${escapeHtml(r.product.nomeSistema)}</td><td class="num">${fmt.format(r.minPct)}%</td><td class="num">${fmt.format(r.criticalPct)}%</td><td><button class="btn btn-sm btn-danger" onclick="App.deleteInventoryLimit('${escapeHtml(r.key)}')">Excluir</button></td></tr>`).join('') || `<tr><td colspan="5" class="center muted">Nenhuma regra configurada. O sistema usará 30% como mínimo e 15% como crítico.</td></tr>`}</tbody></table></div>`;
  }

  function renderInventoryOutAdmin(){
    state.inventoryOut ||= {date:'', rede:'', loja:'', product:'', status:''};
    if (!state.inventoryOut.date) state.inventoryOut.date = latestOperationalDate();
    const f = state.inventoryOut;
    const redes = getRedeOptions().filter(Boolean);
    const storeOptions = Store.data.stores.filter(st => !f.rede || st.rede === f.rede);
    const productOptions = activeProducts().sort((a,b)=>a.nomeSistema.localeCompare(b.nomeSistema));
    const rows = computeInventoryOutRows({date:f.date, rede:f.rede, storeId:f.loja, productId:f.product, status:f.status});
    const low = rows.filter(r => r.status === 'Estoque baixo' || r.status === 'Risco de falta');
    const noInv = rows.filter(r => r.status === 'Sem inventário');
    const totalReinforcement = rows.reduce((a,r)=>a+toNumber(r.reinforcement),0);
    setTitle('Inventário de Saída', 'Concilie estoque bom da loja + entrega do dia com o estoque atual informado pelo promotor.');
    $('#viewRoot').innerHTML = `
      <div class="grid kpis">
        ${kpi('▨','Itens analisados',fmt.format(rows.length),'data selecionada')}
        ${kpi('⚠','Estoque baixo',fmt.format(low.length),'risco de falta', low.length ? 'red' : 'green')}
        ${kpi('↯','Sem inventário',fmt.format(noInv.length),'entrega sem informação da loja', noInv.length ? 'amber' : 'green')}
        ${kpi('+','Reforço sugerido',fmt.format(totalReinforcement),'unidades para voltar ao mínimo')}
      </div>
      <div class="card">
        <h3>Filtros da análise</h3>
        <div class="filter-row">
          <div class="filter">Data <input type="date" id="invAdminDate" value="${escapeHtml(f.date)}"></div>
          <div class="filter">Rede <select id="invAdminRede"><option value="">Todas</option>${redes.map(r=>`<option value="${escapeHtml(r)}" ${f.rede===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
          <div class="filter">Loja <select id="invAdminStore"><option value="">Todas</option>${storeOptions.map(st=>`<option value="${st.id}" ${f.loja===st.id?'selected':''}>${escapeHtml(st.nome)}</option>`).join('')}</select></div>
          <div class="filter">Produto <select id="invAdminProduct"><option value="">Todos</option>${productOptions.map(p=>`<option value="${p.id}" ${f.product===p.id?'selected':''}>${escapeHtml(p.nomeSistema)}</option>`).join('')}</select></div>
          <div class="filter">Status <select id="invAdminStatus"><option value="">Todos</option>${['OK','Atenção','Estoque baixo','Risco de falta','Sem inventário','Sem entrega/estoque'].map(x=>`<option value="${x}" ${f.status===x?'selected':''}>${x}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="card">
        <h3>Configurar percentual aceitável por produto</h3>
        <p class="muted small">A regra pode ser por rede e produto. Exemplo: Alface Crespa com mínimo de 30% restante e crítico em 15%.</p>
        <div class="form-grid compact-grid">
          <label>Rede<select id="invLimitRede"><option value="">Todas</option>${redes.map(r=>`<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}</select></label>
          <label>Produto<select id="invLimitProduct">${productOptions.map(p=>`<option value="${p.id}">${escapeHtml(p.nomeSistema)}</option>`).join('')}</select></label>
          <label>Mínimo aceitável (%)<input id="invLimitMin" type="number" min="0" max="100" value="30"></label>
          <label>Crítico (%)<input id="invLimitCritical" type="number" min="0" max="100" value="15"></label>
        </div>
        <button class="btn btn-primary" id="saveInvLimit" style="margin-top:10px">Salvar regra</button>
        <div style="margin-top:12px">${renderInventoryOutLimitRows()}</div>
      </div>
      <div class="card">
        <h3>Conciliação estoque x entrega</h3>
        <p class="muted small">Disponível = estoque bom da loja + entrega do dia. Saída estimada = disponível - estoque atual.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Rede</th><th>Loja</th><th>Produto</th><th class="num">Estoque bom</th><th class="num">Entrega</th><th class="num">Disponível</th><th class="num">Estoque atual</th><th class="num">% vendido</th><th class="num">% restante</th><th>Status</th><th class="num">Reforço</th><th>Observação</th></tr></thead>
          <tbody>${rows.map(r => `<tr class="${r.statusClass==='red'?'warning-row':''}"><td>${escapeHtml(r.store.rede)}</td><td>${escapeHtml(r.store.nome)}</td><td>${escapeHtml(r.product.nomeSistema)}</td><td class="num">${fmt.format(r.stockGood)}</td><td class="num">${fmt.format(r.delivered)}</td><td class="num">${fmt.format(r.available)}</td><td class="num">${r.inv ? fmt.format(r.stockCurrent) : '—'}</td><td class="num">${r.available ? r.soldPct.toFixed(1).replace('.',',')+'%' : '—'}</td><td class="num">${r.available ? r.remainingPct.toFixed(1).replace('.',',')+'%' : '—'}</td><td><span class="badge ${r.statusClass}">${r.status}</span></td><td class="num">${r.reinforcement ? fmt.format(r.reinforcement) : '—'}</td><td>${escapeHtml(r.inv?.notes || '')}</td></tr>`).join('') || `<tr><td colspan="12" class="center muted">Nenhuma entrega ou inventário encontrado para o filtro selecionado.</td></tr>`}</tbody>
        </table></div>
      </div>
    `;
    $('#invAdminDate')?.addEventListener('change', e => { state.inventoryOut.date = e.target.value || latestOperationalDate(); renderInventoryOutAdmin(); });
    $('#invAdminRede')?.addEventListener('change', e => { state.inventoryOut.rede = e.target.value; state.inventoryOut.loja = ''; renderInventoryOutAdmin(); });
    $('#invAdminStore')?.addEventListener('change', e => { state.inventoryOut.loja = e.target.value; renderInventoryOutAdmin(); });
    $('#invAdminProduct')?.addEventListener('change', e => { state.inventoryOut.product = e.target.value; renderInventoryOutAdmin(); });
    $('#invAdminStatus')?.addEventListener('change', e => { state.inventoryOut.status = e.target.value; renderInventoryOutAdmin(); });
    $('#saveInvLimit')?.addEventListener('click', async () => {
      const rede = $('#invLimitRede')?.value || '';
      const productId = $('#invLimitProduct')?.value || '';
      if (!productId) return toast('Selecione um produto.', 'error');
      const minPct = toNumber($('#invLimitMin')?.value);
      const criticalPct = toNumber($('#invLimitCritical')?.value);
      Store.data.appConfig.inventoryOutLimits ||= {};
      Store.data.appConfig.inventoryOutLimits[inventoryLimitKey(rede, productId)] = {minPct, criticalPct};
      await Store.save();
      toast('Regra de estoque salva.');
      renderInventoryOutAdmin();
    });
  }

  async function deleteInventoryLimit(key){
    if (!key) return;
    Store.data.appConfig.inventoryOutLimits ||= {};
    delete Store.data.appConfig.inventoryOutLimits[key];
    await Store.save();
    toast('Regra de estoque removida.');
    render();
  }

  function renderAdmin(){
    if (!userCanAccessPage(state.page)) {
      const fallback = firstAccessibleAdminPage();
      if (state.page !== fallback) {
        state.page = fallback;
        toast('Seu usuário não tem permissão para essa função.', 'warn');
      }
    }
    switch(state.page){
      case 'dashboard': return renderDashboard();
      case 'fechamento-dia': return renderDayClosing();
      case 'inventario-saida': return renderInventoryOutAdmin();
      case 'estoque-loja': return renderStoreStockAdmin();
      case 'analise-pedidos': return renderOrderAnalysis();
      case 'importar-pdf': return renderImportPdf();
      case 'conferencia-importacao': return renderImportAudit();
      case 'duplicidades': return renderImportDuplicates();
      case 'ofertas': return renderOffers();
      case 'precos': return renderPriceMonitoringAdmin();
      case 'chamados': return renderTickets();
      case 'bases': return renderImportSales();
      case 'conciliacao': return renderConciliation();
      case 'faltas': return renderMissingQuality();
      case 'pendencias': return renderPendencies();
      case 'itens-obrigatorios': return renderCriticalRuptureSettings();
      case 'rupturas': return renderRuptures();
      case 'mix': return renderMix();
      case 'usuarios': return renderUsers();
      case 'historico': return renderHistory();
      case 'analises':
      default: return renderAnalytics();
    }
  }


  function storesForGlobalFilters(){
    try {
      if (typeof allKnownStoresForSelection === 'function') return allKnownStoresForSelection();
    } catch(_) {}
    return Store.data?.stores || [];
  }
  function getRedeOptions(){
    const stores = storesForGlobalFilters();
    return ['', ...unique(stores.map(s=>s.rede).filter(Boolean)).sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'))];
  }
  function getStoresByFilter(f=state.filters){
    const stores = storesForGlobalFilters();
    const nRede = normalize(f?.rede || '');
    return stores.filter(st => !nRede || normalize(st.rede || '') === nRede)
      .sort((a,b)=>String(a.nome || '').localeCompare(String(b.nome || ''),'pt-BR'));
  }
  function adminFiltersHtml(idPrefix='filter', extra=''){
    const f = state.filters;
    const redes = getRedeOptions();
    const storesFiltered = getStoresByFilter(f);
    return `
      <div class="filter-toggle-row">
        <button class="btn btn-ghost" id="${idPrefix}Toggle">☰ Filtros</button>
        <span class="muted small">Clique para exibir ou ocultar os filtros disponíveis.</span>
      </div>
      <div class="filter-row collapsible-filters ${state.filterPanelsOpen[idPrefix] ? '' : 'hidden'}" id="${idPrefix}Panel">
        <div class="filter">Rede <select id="${idPrefix}Rede">${redes.map(r=>`<option value="${r}" ${f.rede===r?'selected':''}>${r||'Todas as redes'}</option>`).join('')}</select></div>
        <div class="filter">Loja <select id="${idPrefix}Loja"><option value="" ${!f.loja?'selected':''}>Todas as lojas</option>${storesFiltered.map(st=>`<option value="${st.id}" ${f.loja===st.id?'selected':''}>${st.nome}</option>`).join('')}</select></div>
        <div class="filter">De <input type="date" id="${idPrefix}From" value="${f.dateFrom||''}"></div>
        <div class="filter">Até <input type="date" id="${idPrefix}To" value="${f.dateTo||''}"></div>
        <div class="filter">Tipo <select id="${idPrefix}Tipo"><option value="AMBOS" ${(!f.tipo||f.tipo==='AMBOS')?'selected':''}>Ambos</option><option value="FOLHAGEM" ${f.tipo==='FOLHAGEM'?'selected':''}>Folhagens</option><option value="BANDEJA" ${f.tipo==='BANDEJA'?'selected':''}>Bandejas</option></select></div>
        ${extra}
        <button class="btn btn-primary" id="${idPrefix}Apply">Aplicar filtros</button>
      </div>`;
  }
  function bindAdminFilters(idPrefix='filter'){
    const f = state.filters;
    const panel = $(`#${idPrefix}Panel`);
    const toggle = $(`#${idPrefix}Toggle`);

    function refreshStoreOptions(){
      const lojaSelect = $(`#${idPrefix}Loja`);
      if (!lojaSelect) return;
      const storesFiltered = getStoresByFilter(f);
      lojaSelect.innerHTML =
        `<option value="" ${!f.loja?'selected':''}>Todas as lojas</option>` +
        storesFiltered.map(st=>`<option value="${st.id}" ${f.loja===st.id?'selected':''}>${st.nome}</option>`).join('');
    }

    toggle?.addEventListener('click',()=>{
      panel?.classList.toggle('hidden');
      state.filterPanelsOpen[idPrefix] = !panel?.classList.contains('hidden');
    });

    $(`#${idPrefix}Rede`)?.addEventListener('change', e=>{
      f.rede = e.target.value;
      f.loja = '';
      refreshStoreOptions();
    });

    $(`#${idPrefix}Loja`)?.addEventListener('change', e=>{ f.loja=e.target.value; });
    $(`#${idPrefix}From`)?.addEventListener('change', e=>{ f.dateFrom=e.target.value; });
    $(`#${idPrefix}To`)?.addEventListener('change', e=>{ f.dateTo=e.target.value; });
    $(`#${idPrefix}Tipo`)?.addEventListener('change', e=>{ f.tipo=e.target.value; state.adminType=e.target.value; });

    $(`#${idPrefix}Apply`)?.addEventListener('click', ()=>{
      state.filterPanelsOpen[idPrefix] = true;
      render();
    });
  }
  function selectedTypes(value){
    return (!value || value === 'AMBOS') ? ['FOLHAGEM','BANDEJA'] : [value];
  }

  function clearTaskCard(title, value, detail, page, tone='green'){
    return `
      <button class="clear-task-card ${tone}" onclick="App.go('${page}')">
        <span class="clear-task-value">${value}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${detail}</small>
      </button>`;
  }

  function computePricePendingCount(date=todayISO()){
    if (!isPriceCheckRequiredDate(date)) return 0;
    let pending = 0;
    (Store.data.stores || []).forEach(store => {
      const products = getStorePriceProducts(store.id);
      if (!products.length) return;
      const saved = products.filter(p => toNumber(getPriceCheckRecord(date, store.id, p.id)?.storePrice) > 0).length;
      if (saved < products.length) pending += 1;
    });
    return pending;
  }

  function renderDashboardOverview(metrics, orderSummary){
    const today = todayISO();
    const activeOffers = (Store.data.offers || []).filter(o => offerIsActiveOn(o, today)).length;
    const openTickets = (Store.data.tickets || []).filter(t => t.status === 'ABERTO').length;
    const activeTickets = (Store.data.tickets || []).filter(t => ['ABERTO','EM_ATENDIMENTO'].includes(t.status)).length;
    const relevantIssues = (Store.data.importIssues || []).filter(importIssueStillRelevant);
    const criticalPending = computeCriticalRuptureAlerts({onlyPending:true}).length;
    const closingDate = latestOperationalDate();
    const closing = computeDayClosing(closingDate, state.filters.rede || '');
    const pricePending = computePricePendingCount(today);
    const pendingCount = (closing.status === 'OK' ? 0 : closing.blockers.length) + relevantIssues.length + openTickets + criticalPending + pricePending + orderSummary.lowStockStores;
    const periodLabel = state.filters.dateFrom || state.filters.dateTo
      ? `${state.filters.dateFrom ? formatDate(state.filters.dateFrom) : 'início'} até ${state.filters.dateTo ? formatDate(state.filters.dateTo) : 'hoje'}`
      : 'Visão geral';
    return `
      <section class="clear-hero">
        <div>
          <span class="eyebrow">Central de controle</span>
          <h1>O que precisa de atenção agora</h1>
          <p>Visão resumida das pendências comerciais, operacionais e de importação. As tabelas ficam nas abas específicas para reduzir poluição visual.</p>
          <div class="hero-status-row">
            <span class="status-chip">${escapeHtml(periodLabel)}</span>
            <span class="status-chip ${pendingCount ? 'amber' : 'green'}">${pendingCount ? `${pendingCount} ponto(s) de atenção` : 'Tudo sem alerta crítico'}</span>
          </div>
        </div>
        <div class="clear-hero-score ${pendingCount ? 'amber' : 'green'}">
          <span>${fmt.format(pendingCount)}</span>
          <small>pendências</small>
        </div>
      </section>
      <div class="clear-task-grid">
        ${clearTaskCard('Fechamento do dia', closing.status === 'OK' ? 'OK' : closing.blockers.length, `Data ${formatDate(closingDate)}`, 'fechamento-dia', closing.status === 'OK' ? 'green' : 'amber')}
        ${clearTaskCard('Importações / divergências', fmt.format(relevantIssues.length), 'PDF, XML ou Base para conferir', 'conferencia-importacao', relevantIssues.length ? 'amber' : 'green')}
        ${clearTaskCard('Duplicidades pendentes', fmt.format((Store.data.importDuplicates || []).filter(d => d.status === 'PENDENTE').length), 'aguardando decisão do operador', 'duplicidades', (Store.data.importDuplicates || []).some(d => d.status === 'PENDENTE') ? 'amber' : 'green')}
        ${clearTaskCard('Chamados abertos', fmt.format(openTickets), `${fmt.format(activeTickets)} ativos no total`, 'chamados', openTickets ? 'amber' : 'green')}
        ${clearTaskCard('Rupturas pendentes', fmt.format(criticalPending), 'itens obrigatórios sem justificativa', 'rupturas', criticalPending ? 'red' : 'green')}
        ${clearTaskCard('Preços pendentes', fmt.format(pricePending), 'lojas sem coleta obrigatória', 'precos', pricePending ? 'red' : 'green')}
        ${clearTaskCard('Estoque baixo', fmt.format(orderSummary.lowStockStores), 'lojas com risco de falta', 'estoque-loja', orderSummary.lowStockStores ? 'red' : 'green')}
      </div>
      <div class="grid four executive-strip compact-strip">
        ${kpi('▥','Venda válida',money.format(metrics.vendaValida),'resultado do filtro atual')}
        ${kpi('↘','Quebra',money.format(metrics.quebra),'valor por custo', metrics.quebra ? 'red' : 'green')}
        ${kpi('🏷','Ofertas ativas',fmt.format(activeOffers),'válidas hoje', activeOffers ? 'amber' : 'green')}
        ${kpi('!','Lojas em atenção',fmt.format(orderSummary.attentionStores),'pedido/estoque em alerta', orderSummary.attentionStores ? 'amber' : 'green')}
      </div>`;
  }

  function renderClearModules(){
    const modules = [
      ['Importações', 'PDF/XML, Base de Vendas e Conferência', 'importar-pdf', '▣'],
      ['Comercial', 'Pedidos, preços, ofertas e análises', 'analise-pedidos', '▤'],
      ['Operação', 'Inventário, estoque, rupturas e quebras', 'inventario-saida', '▨'],
      ['Atendimento', 'Chamados, responsáveis e resolução', 'chamados', '✉']
    ];
    return `<div class="module-grid">${modules.map(m => `
      <button class="module-card" onclick="App.go('${m[2]}')">
        <span>${m[3]}</span><strong>${m[0]}</strong><small>${m[1]}</small>
      </button>`).join('')}</div>`;
  }

  function renderDashboard(){
    setTitle('Visão Geral', 'Painel limpo com pendências e atalhos principais.');
    const f = state.filters;
    if (!f.tipo) f.tipo = 'AMBOS';
    const metrics = computeMetrics(f);
    const stores = getStoresByFilter(f).filter(st=>!f.loja || st.id===f.loja);
    const orderSummary = summarizeOrderHealth(stores, f.tipo || 'AMBOS');
    const criticalRows = orderSummary.rows.filter(r=>r.lowStock || r.excess || r.attention).slice(0,8);
    $('#viewRoot').innerHTML = `
      ${renderDashboardOverview(metrics, orderSummary)}
      <div class="clear-toolbar">
        ${adminFiltersHtml('dash')}
      </div>
      <div class="clear-section-grid">
        <div class="card clear-panel">
          <div class="panel-head"><div><h3>Módulos principais</h3><p class="muted small">Escolha uma área para abrir os detalhes.</p></div></div>
          ${renderClearModules()}
        </div>
        <div class="card clear-panel">
          <div class="panel-head"><div><h3>Lojas críticas</h3><p class="muted small">Mostra somente os principais pontos de atenção.</p></div><button class="btn btn-sm btn-soft" onclick="App.go('analise-pedidos')">Ver análise</button></div>
          ${renderOrderHealthTable(criticalRows)}
        </div>
      </div>
      <details class="card clear-details">
        <summary>Ver gráficos e listas detalhadas</summary>
        <div class="grid two" style="margin-top:14px">
          <div class="chart-panel"><h3>Venda x Quebra</h3>${renderSimpleChart(f)}</div>
          <div><h3>Lojas que precisam de atenção</h3>${renderOrderHealthTable(orderSummary.rows.slice(0,10))}</div>
        </div>
        <div class="grid three" style="margin-top:14px">
          ${miniPanel('Lojas com excesso', renderStoreList(orderSummary.rows.filter(r=>r.excess).slice(0,8), 'excesso'))}
          ${miniPanel('Lojas com estoque baixo', renderStoreList(orderSummary.rows.filter(r=>r.lowStock).slice(0,8), 'baixo'))}
          ${miniPanel('Pendências e rupturas', `<p>Rupturas abertas <strong class="negative">${computeRuptures(f).length}</strong></p><p>Pendências de bandejas <strong class="negative">${computePendencies().filter(p=>p.pending>0).length}</strong></p><button class="btn btn-sm btn-soft" onclick="App.go('rupturas')">Ver rupturas</button>`) }
        </div>
      </details>`;
    bindAdminFilters('dash');
  }

  function ensureDeliveryConciliationStore(){
    Store.data ||= Store.seed();
    Store.data.deliveryConciliations ||= { FOLHAGEM:{}, BANDEJA:{} };
    Store.data.deliveryConciliations.FOLHAGEM ||= {};
    Store.data.deliveryConciliations.BANDEJA ||= {};
    return Store.data.deliveryConciliations;
  }

  function deliveryConciliationRecord(type, orderDate, rede, {create=false}={}){
    if (!type || !orderDate || !rede) return null;
    const root = ensureDeliveryConciliationStore();
    root[type] ||= {};
    root[type][orderDate] ||= {};
    if (!root[type][orderDate][rede] && create) {
      root[type][orderDate][rede] = {baseDates:[], increasePct:toNumber(Store.data.conciliation?.[type]?.increasePct || 0), updatedAt:'', user:''};
    }
    return root[type][orderDate][rede] || null;
  }

  function orderAnalysisConciliation(type, orderDate, rede=''){
    const legacy = Store.data.conciliation?.[type] || {baseDates:[], pendingDates:[], orderDate:orderDate || todayISO(), increasePct:0};
    const direct = rede ? deliveryConciliationRecord(type, orderDate, rede) : null;
    if (direct && Array.isArray(direct.baseDates) && direct.baseDates.length) {
      return {baseDates:direct.baseDates || [], increasePct:toNumber(direct.increasePct), orderDate, rede};
    }
    if (!rede) return {baseDates:legacy.baseDates || [], increasePct:toNumber(legacy.increasePct), orderDate:orderDate || legacy.orderDate || todayISO(), rede:''};
    return {baseDates:legacy.baseDates || [], increasePct:toNumber(legacy.increasePct), orderDate:orderDate || legacy.orderDate || todayISO(), rede};
  }

  function setDeliveryConciliation(type, orderDate, rede, baseDates=[], increasePct=0){
    const rec = deliveryConciliationRecord(type, orderDate, rede, {create:true});
    if (!rec) return null;
    rec.baseDates = unique(baseDates || []).sort();
    rec.increasePct = Math.max(0, toNumber(increasePct));
    rec.updatedAt = new Date().toISOString();
    rec.user = state.session?.usuario || 'sistema';
    Store.data.conciliation[type] ||= {baseDates:[], pendingDates:[], orderDate, increasePct:0};
    Store.data.conciliation[type].orderDate = orderDate;
    Store.data.conciliation[type].baseDates = [...rec.baseDates];
    Store.data.conciliation[type].increasePct = rec.increasePct;
    return rec;
  }

  function availableDeliveryDatesForConciliation(){
    const root = ensureDeliveryConciliationStore();
    const fromPlans = ['FOLHAGEM','BANDEJA'].flatMap(type => Object.keys(root[type] || {}));
    const fromDeliveries = unique((Store.data.deliveries || []).map(d=>d.date));
    const fromOrders = unique((Store.data.orders || []).map(o=>o.date));
    const fromLegacy = ['FOLHAGEM','BANDEJA'].map(type => Store.data.conciliation?.[type]?.orderDate).filter(Boolean);
    return unique([...fromPlans, ...fromDeliveries, ...fromOrders, ...fromLegacy, todayISO()]).sort();
  }

  function redesForDeliveryConciliation(){
    const salesRedes = unique((Store.data.sales || []).map(r=>r.rede).filter(Boolean));
    if (salesRedes.length) return salesRedes.sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'));
    return getRedeOptions().filter(Boolean);
  }

  function deliveryConciliationSummary(type, orderDate){
    const redes = redesForDeliveryConciliation();
    const done = redes.filter(rede => (deliveryConciliationRecord(type, orderDate, rede)?.baseDates || []).length > 0);
    return {type, orderDate, redes, done, pending:redes.filter(r=>!done.includes(r)), total:redes.length};
  }

  function renderOrderAnalysis(){
    setTitle('Pedidos', 'Análise comercial para montar o pedido usando base de venda, estoque bom e última entrega.');
    const f = state.filters;
    if (!f.tipo || f.tipo === 'AMBOS') f.tipo = state.adminType && state.adminType !== 'AMBOS' ? state.adminType : 'FOLHAGEM';
    if (!['FOLHAGEM','BANDEJA'].includes(f.tipo)) f.tipo = 'FOLHAGEM';
    const type = f.tipo;
    const legacy = Store.data.conciliation[type] || {baseDates:[], orderDate:todayISO(), increasePct:0};
    const orderDate = f.dateFrom || legacy.orderDate || todayISO();
    const stores = getStoresByFilter(f).filter(st=>!f.loja || st.id===f.loja);
    const displayConc = orderAnalysisConciliation(type, orderDate, f.rede || stores[0]?.rede || '');
    const rows = buildPedidoAnalysisRows(stores, type, orderDate);
    const totalSuggested = sum(rows.map(r=>r.baseSuggestion));
    const totalPromoter = sum(rows.map(r=>r.promoterOrder));
    const rowsWithHistory = rows.filter(r=>r.salesCalc.daysWithSales > 0).length;
    const rowsAttention = rows.filter(r=>r.alerts.length > 0).length;
    const selectedRede = f.rede || 'Todas as redes';
    const selectedStore = f.loja ? (storeById(f.loja)?.nome || 'Loja não encontrada') : 'Todas as lojas';
    const baseDatesHtml = (displayConc.baseDates||[]).length
      ? (displayConc.baseDates||[]).map(d=>`<span class="badge gray">${formatDate(d)}</span>`).join(' ')
      : '<span class="badge amber">Nenhuma data base selecionada</span>';
    $('#viewRoot').innerHTML = `
      ${pedidoAnalysisFiltersHtml(orderDate, type, displayConc)}
      <div class="card order-analysis-hero compact-order-hero">
        <div class="order-analysis-meta">
          <span class="eyebrow">Análise para pedido</span>
          <h3>Entrega ${formatDate(orderDate)} • ${productTypeName(type)}</h3>
          <div class="order-analysis-lines">
            <div class="order-analysis-line"><span class="label">Rede</span><strong>${escapeHtml(selectedRede)}</strong></div>
            <div class="order-analysis-line"><span class="label">Loja</span><strong>${escapeHtml(selectedStore)}</strong></div>
            <div class="order-analysis-line"><span class="label">Datas base</span><div class="value badges-inline">${baseDatesHtml}</div></div>
            <div class="order-analysis-line"><span class="label">Aumento aplicado</span><strong>${toNumber(displayConc.increasePct)}%</strong></div>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-soft" type="button" onclick="App.go('conciliacao')">Ajustar base de venda</button>
        </div>
      </div>
      <div class="grid kpis">
        ${kpi('▤','Itens analisados',fmt.format(rows.length),'produto(s) para revisar')}
        ${kpi('◷','Com histórico',fmt.format(rowsWithHistory),'com venda nas datas base')}
        ${kpi('▥','Estoque bom',fmt.format(sum(rows.map(r=>r.stockGood))),'inventário do promotor - quebra')}
        ${kpi('↥','Sugestão',fmt.format(totalSuggested),'média com acréscimo','green')}
        ${kpi('✎','Pedido promotor',fmt.format(totalPromoter),'pedido enviado pela loja')}
        ${kpi('!','Alertas',fmt.format(rowsAttention),'ofertas na base ou entrega',rowsAttention?'amber':'')}
      </div>
      <div class="card" style="margin-top:14px">
        <div class="panel-head">
          <div>
            <h3>Análise por produto</h3>
            <p class="muted small">A tabela mostra somente os campos da análise do pedido: produto, datas base, média, sugestão, entrega do dia, estoque bom, pedido do promotor e alertas.</p>
          </div>
          <span class="badge blue">${fmt.format(rows.length)} linha(s)</span>
        </div>
        ${renderPedidoAnalysisTable(rows)}
      </div>`;
    bindPedidoAnalysisFilters(orderDate, type, displayConc);
    bindPedidoAnalysisInputs(rows, orderDate, type);
  }

  function pedidoAnalysisFiltersHtml(orderDate, type, displayConc=null){
    const f = state.filters;
    const redes = getRedeOptions();
    const storesFiltered = getStoresByFilter(f);
    const conf = displayConc || orderAnalysisConciliation(type, orderDate, f.rede || '');
    return `
      <div class="filter-toggle-row">
        <button class="btn btn-ghost" id="pedidoToggle">☰ Filtros</button>
        <span class="muted small">Escolha a rede, a loja, a data de entrega, o tipo e a porcentagem de aumento da sugestão.</span>
      </div>
      <div class="filter-row collapsible-filters ${state.filterPanelsOpen.pedido ? '' : 'hidden'}" id="pedidoPanel">
        <div class="filter">Rede <select id="pedidoRede">${redes.map(r=>`<option value="${escapeHtml(r)}" ${f.rede===r?'selected':''}>${escapeHtml(r||'Todas as redes')}</option>`).join('')}</select></div>
        <div class="filter">Loja <select id="pedidoLoja"><option value="" ${!f.loja?'selected':''}>Todas as lojas</option>${storesFiltered.map(st=>`<option value="${escapeHtml(st.id)}" ${f.loja===st.id?'selected':''}>${escapeHtml(st.nome)}</option>`).join('')}</select></div>
        <div class="filter">Data de entrega <input type="date" id="pedidoData" value="${escapeHtml(orderDate)}"></div>
        <div class="filter">Tipo <select id="pedidoTipo"><option value="FOLHAGEM" ${type==='FOLHAGEM'?'selected':''}>Folhagens</option><option value="BANDEJA" ${type==='BANDEJA'?'selected':''}>Bandejas</option></select></div>
        <div class="filter">Aumento (%) <input type="number" id="pedidoIncreasePct" min="0" step="1" value="${toNumber(conf.increasePct)}"></div>
        <button class="btn btn-primary" id="pedidoApply">Aplicar análise</button>
      </div>`;
  }

  function bindPedidoAnalysisFilters(orderDate, type){
    const f = state.filters;
    const panel = $('#pedidoPanel');
    $('#pedidoToggle')?.addEventListener('click',()=>{
      panel?.classList.toggle('hidden');
      state.filterPanelsOpen.pedido = !panel?.classList.contains('hidden');
    });
    function refreshStores(){
      const loja = $('#pedidoLoja');
      if (!loja) return;
      const storesFiltered = getStoresByFilter(f);
      loja.innerHTML = `<option value="" ${!f.loja?'selected':''}>Todas as lojas</option>` + storesFiltered.map(st=>`<option value="${escapeHtml(st.id)}" ${f.loja===st.id?'selected':''}>${escapeHtml(st.nome)}</option>`).join('');
    }
    $('#pedidoRede')?.addEventListener('change', e=>{ f.rede = e.target.value; f.loja = ''; refreshStores(); });
    $('#pedidoLoja')?.addEventListener('change', e=>{ f.loja = e.target.value; });
    $('#pedidoData')?.addEventListener('change', e=>{ f.dateFrom = e.target.value || todayISO(); f.dateTo = f.dateFrom; });
    $('#pedidoTipo')?.addEventListener('change', e=>{ f.tipo = e.target.value; state.adminType = e.target.value; });
    $('#pedidoApply')?.addEventListener('click', ()=>{
      const nextType = $('#pedidoTipo')?.value || type;
      const nextDate = $('#pedidoData')?.value || orderDate;
      const nextIncreasePct = toNumber($('#pedidoIncreasePct')?.value || 0);
      state.filters.tipo = nextType;
      state.adminType = nextType;
      state.filters.dateFrom = nextDate;
      state.filters.dateTo = nextDate;
      Store.data.conciliation[nextType] ||= {baseDates:[], pendingDates:[], orderDate:nextDate, increasePct:0};
      Store.data.conciliation[nextType].orderDate = nextDate;
      Store.data.conciliation[nextType].increasePct = nextIncreasePct;
      if (state.filters.rede) {
        const currentBase = orderAnalysisConciliation(nextType, nextDate, state.filters.rede).baseDates || [];
        setDeliveryConciliation(nextType, nextDate, state.filters.rede, currentBase, nextIncreasePct);
      }
      state.filterPanelsOpen.pedido = true;
      Store.queueSave({}, 900);
      render();
    });
  }

  function buildPedidoAnalysisRows(stores, type, orderDate){
    const rows = [];
    for (const store of stores) {
      const conf = orderAnalysisConciliation(type, orderDate, store.rede || '');
      const baseDates = unique(conf.baseDates || []).sort();
      for (const product of getStoreProducts(store.id, type)) {
        const salesCalc = salesAverageCalc(store.id, product.id, baseDates, conf.increasePct);
        const baseSuggestion = salesCalc.suggestion;
        const deliveryTodayQty = sumDeliveryQty(store.id, product.id, [orderDate]);
        const existingOrder = (Store.data.orders || []).find(o => o.storeId === store.id && o.type === type && o.date === orderDate);
        const existingLine = existingOrder?.lines?.[product.id] || null;
        const latestInv = latestInventoryOutRecord(store.id, product.id, orderDate);
        const stockGood = existingLine ? getLineInventoryGood(existingLine) : toNumber(latestInv?.stockCurrent || 0);
        const promoterOrder = existingLine && existingLine.suggestion !== undefined ? toNumber(existingLine.suggestion) : 0;
        const hasOfferOnBase = baseDates.some(date => !!getActiveOfferForStore(store.id, product.id, date));
        const hasOfferOnDelivery = !!getActiveOfferForStore(store.id, product.id, orderDate);
        const alerts = [];
        if (hasOfferOnBase) alerts.push('Oferta em uma ou mais datas base');
        if (hasOfferOnDelivery) alerts.push('Oferta ativa na data da entrega');
        rows.push({
          key:`${store.id}|${product.id}|${type}|${orderDate}`,
          store, product, type, orderDate, baseDates, salesCalc, baseSuggestion,
          deliveryTodayQty, latestInv, stockGood, promoterOrder,
          existingOrder, existingLine, hasOfferOnBase, hasOfferOnDelivery, alerts
        });
      }
    }
    return rows.sort((a,b)=>
      String(a.store.rede||'').localeCompare(String(b.store.rede||''),'pt-BR') ||
      String(a.store.nome||'').localeCompare(String(b.store.nome||''),'pt-BR') ||
      String(a.product.nomeSistema||'').localeCompare(String(b.product.nomeSistema||''),'pt-BR')
    );
  }

  function renderPedidoAnalysisTable(rows){
    return `<div class="table-wrap pedido-analysis-table-wrap"><table class="pedido-analysis-table compact"><thead><tr>
      <th>Produto</th><th>Datas base</th><th class="num">Média</th><th class="num">Sugestão</th><th class="num">Entrega hoje</th><th class="num">Estoque bom</th><th class="num">Pedido promotor</th><th>Alertas</th>
    </tr></thead><tbody>
      ${rows.map(r=>{
        const baseHtml = r.salesCalc.detail.length
          ? `<div class="base-date-list">${r.salesCalc.detail.map(d=>`<span class="badge ${d.qty>0?'gray':'amber'}">${formatDate(d.date)}: ${fmt.format(d.qty)}</span>`).join('')}</div>`
          : '<span class="badge amber">Base não selecionada</span>';
        const alertHtml = r.alerts.length
          ? r.alerts.map(a=>`<span class="badge amber">${escapeHtml(a)}</span>`).join(' ')
          : '<span class="badge green">Sem alertas</span>';
        return `<tr>
          <td><div class="product-cell"><span class="prod-dot"></span><strong>${escapeHtml(r.product.nomeSistema)}</strong></div></td>
          <td class="base-date-cell">${baseHtml}<span class="muted small">${r.salesCalc.daysWithSales}/${Math.max(1,r.salesCalc.selectedCount)} dia(s) com venda</span></td>
          <td class="num">${r.salesCalc.daysWithSales ? fmt.format(Math.ceil(r.salesCalc.average)) : '—'}</td>
          <td class="num"><strong>${fmt.format(r.baseSuggestion)}</strong></td>
          <td class="num">${fmt.format(r.deliveryTodayQty)}</td>
          <td class="num">${r.existingLine || r.latestInv ? fmt.format(r.stockGood) : '—'}</td>
          <td class="num"><span class="pedido-promoter-value">${fmt.format(r.promoterOrder || 0)}</span></td>
          <td>${alertHtml}</td>
        </tr>`;
      }).join('') || `<tr><td colspan="8" class="center muted">Sem produtos para o filtro selecionado.</td></tr>`}
    </tbody></table></div>`;
  }

  function ensureCommercialOrderLine(storeId, productId, type, date){
    const order = getCurrentOrder(storeId, type, date);
    order.lines[productId] ||= { productId, inventoryGross:0, quebraQty:0, suggestion:0, justification:'', updatedAt:null };
    return order.lines[productId];
  }

  function bindPedidoAnalysisInputs(rows, orderDate, type){
    $$('#viewRoot [data-pedido-adjust]').forEach(inp=>{
      inp.addEventListener('change', e=>{
        const line = ensureCommercialOrderLine(e.target.dataset.storeId, e.target.dataset.productId, e.target.dataset.type, e.target.dataset.date);
        line.suggestion = toNumber(e.target.value);
        line.updatedAt = new Date().toISOString();
        Store.queueSave({}, 900);
        toast('Pedido ajustado salvo em rascunho.');
      });
    });
    $$('#viewRoot [data-pedido-note]').forEach(inp=>{
      inp.addEventListener('change', e=>{
        const line = ensureCommercialOrderLine(e.target.dataset.storeId, e.target.dataset.productId, e.target.dataset.type, e.target.dataset.date);
        line.commercialNote = e.target.value;
        line.updatedAt = new Date().toISOString();
        Store.queueSave({}, 900);
      });
    });
  }

  function renderStoreList(rows, mode){
    return rows.length ? `<table><tbody>${rows.map(r=>`<tr><td>${r.store.nome}</td><td class="num">${mode==='excesso'?fmt.format(r.inventory-r.sale):fmt.format(r.sale-r.inventory)} und</td></tr>`).join('')}</tbody></table>` : `<div class="empty">Sem lojas nesta condição.</div>`;
  }

  function renderAnalytics(){
    setTitle('Sistema de Análises Comerciais', 'Dashboards e análises para performance comercial e operacional.');
    const f = state.filters;
    if (!f.tipo) f.tipo = 'AMBOS';
    const allowedTypesForDash = selectedTypes(f.tipo || 'AMBOS');
    const matchesDashboardDelivery = (d, ignoreDate=false) => {
      const s = storeById(d.storeId);
      const p = productById(d.productId);
      return (!f.rede || s?.rede === f.rede)
        && (!f.loja || d.storeId === f.loja)
        && (!p || allowedTypesForDash.includes(p.tipo))
        && (ignoreDate || dateInRange(d.date, f.dateFrom, f.dateTo));
    };
    const hasFilteredDeliveries = (Store.data.deliveries || []).some(d => matchesDashboardDelivery(d));
    if (!hasFilteredDeliveries) {
      const fallbackDates = unique((Store.data.deliveries || []).filter(d => matchesDashboardDelivery(d, true)).map(d=>d.date)).sort();
      if (fallbackDates.length) {
        const latest = fallbackDates[fallbackDates.length - 1];
        f.dateFrom = latest;
        f.dateTo = latest;
      }
    }
    const metrics = computeMetrics(f);
    const topQuebra = computeTopQuebra(f).slice(0,5);
    const titleStore = f.loja ? storeById(f.loja)?.nome : 'Todas as lojas';
    $('#viewRoot').innerHTML = `
      ${adminFiltersHtml('filter')}
      <div class="grid kpis">
        ${kpi('▥','Venda válida',money.format(metrics.vendaValida),'PDF - faltas - qualidade')}
        ${kpi('↘','Quebra',money.format(metrics.quebra),'custo da última entrega','red')}
        ${kpi('%','% Quebra',metrics.vendaValida?((metrics.quebra/metrics.vendaValida)*100).toFixed(2).replace('.',',')+'%':'0,00%','sobre venda válida','amber')}
        ${kpi('!','Faltas R$',money.format(metrics.faltas),'abatidas da entrega','red')}
        ${kpi('◇','Qualidade R$',money.format(metrics.qualidade),'devolução/descartes','amber')}
        ${kpi('⚠','Rupturas',computeRuptures(f).length,'ativas no mix','purple')}
      </div>
      <div class="grid two">
        <div class="card chart-panel">
          <h3>Venda x Quebra</h3>
          ${renderSimpleChart(f)}
        </div>
        <div class="card">
          <h3>Top lojas em quebra</h3>
          <table>
            <thead><tr><th>Loja</th><th class="num">Quebra R$</th><th class="num">% Quebra</th></tr></thead>
            <tbody>${topQuebra.map(r=>`<tr><td>${r.store.nome}</td><td class="num">${money.format(r.quebra)}</td><td class="num">${r.venda?((r.quebra/r.venda)*100).toFixed(2).replace('.',',')+'%':'0,00%'}</td></tr>`).join('') || `<tr><td colspan="3" class="center muted">Sem dados</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <h3>Análise Comercial • ${titleStore} • ${(!f.tipo||f.tipo==='AMBOS')?'Folhagens e Bandejas':f.tipo==='BANDEJA'?'Bandejas':'Folhagens'}</h3>
        ${renderAdminAnalysisTable(f.loja || null, f.tipo || 'AMBOS')}
      </div>
      <div class="grid five" style="margin-top:14px">
        ${miniPanel('Carteira de Pendências de Bandejas', renderPendenciesSummary())}
        ${miniPanel('Alertas de Ruptura', renderRupturesSummary())}
        ${miniPanel('Produtos Inativos Entregues', renderInactiveDeliveriesSummary())}
        ${miniPanel('Solicitações de Correção', renderCorrectionsSummary())}
        ${miniPanel('Faltas e Qualidade', renderMissingQualityMini())}
      </div>
    `;
    bindAdminFilters('filter');
  }

  function renderAdminAnalysisTable(storeId, type){
    const f = state.filters;
    const stores = storeId ? Store.data.stores.filter(s=>s.id===storeId) : getStoresByFilter(f);
    const types = selectedTypes(type);
    const products = Store.data.products.filter(p => p.situacao==='ATIVO' && types.includes(p.tipo));
    const rows = [];
    for (const p of products) {
      let saleBase=0, deliveryBase=0, vendaPendente=0, invGood=0, suggestion=0, comercial=0;
      const offerMap = new Map();
      for (const st of stores) {
        if (!isProductActiveForStore(st.id, p.id)) continue;
        const conf = Store.data.conciliation[p.tipo] || {baseDates:[], pendingDates:[], orderDate:todayISO()};
        const orderDate = conf.orderDate || todayISO();
        const order = Store.data.orders.find(o => o.storeId===st.id && o.type===p.tipo && o.date===orderDate);
        const line = order?.lines?.[p.id] || {inventoryGross:0,quebraQty:0,suggestion:0};
        const calc = salesAverageCalc(st.id, p.id, conf.baseDates, conf.increasePct);
        saleBase += calc.suggestion;
        deliveryBase += sumDeliveryQty(st.id, p.id, conf.baseDates);
        vendaPendente += p.tipo==='BANDEJA' ? sumSalesForPending(st.id, p.id, conf.pendingDates) : 0;
        invGood += getLineInventoryGood(line);
        suggestion += toNumber(line.suggestion);
        comercial += getCommercialSuggestion(st.id, p.id, orderDate);
        const activeOffer = getActiveOfferForStore(st.id, p.id, orderDate);
        if (activeOffer) offerMap.set(activeOffer.id + '|' + st.rede, {...activeOffer, rede:st.rede});
      }
      const stats = {saleBase, deliveryBase, aproveitamento: deliveryBase>0?(saleBase/deliveryBase)*100:(saleBase>0?100:0), vendaPendente, sugestaoComercial:comercial};
      const pseudoLine = {inventoryGross:invGood, quebraQty:0, suggestion};
      const sobra = invGood - vendaPendente;
      const status = orderLineStatus(pseudoLine, stats, p.tipo);
      rows.push({p, stats, invGood, suggestion, comercial, sobra, status, offers:Array.from(offerMap.values())});
    }
    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>Produto</th><th>Tipo</th><th class="num">Venda período</th><th class="num">Entrega período</th><th class="num">Aproveitamento</th><th class="num">Inventário bom</th>
        <th class="num">Venda pendente</th><th class="num">Sobra prevista</th>
        <th class="num">Sugestão loja</th><th class="num">Sugestão comercial</th><th>Oferta</th><th>Status</th>
      </tr></thead>
      <tbody>${rows.map(r=>`
        <tr>
          <td><div class="product-cell"><span class="prod-dot"></span><strong>${r.p.nomeSistema}</strong></div></td>
          <td>${r.p.tipo}</td>
          <td class="num">${fmt.format(r.stats.saleBase)}</td>
          <td class="num">${fmt.format(r.stats.deliveryBase)}</td>
          <td class="num ${r.stats.aproveitamento>=90?'positive':''}">${r.stats.deliveryBase?r.stats.aproveitamento.toFixed(1).replace('.',',')+'%':'—'}</td>
          <td class="num">${fmt.format(r.invGood)}</td>
          <td class="num">${r.p.tipo==='BANDEJA'?fmt.format(r.stats.vendaPendente):'—'}</td>
          <td class="num ${r.p.tipo==='BANDEJA' && r.sobra<0?'negative':r.p.tipo==='BANDEJA'?'positive':''}">${r.p.tipo==='BANDEJA'?fmt.format(r.sobra):'—'}</td>
          <td class="num">${fmt.format(r.suggestion)}</td>
          <td class="num">${fmt.format(r.comercial)}</td>
          <td>${r.offers.length ? r.offers.map(o=>`<span class="badge amber">${escapeHtml(o.rede)} • ${money.format(toNumber(o.price))}</span>`).join(' ') : '<span class="badge gray">—</span>'}</td>
          <td><span class="badge ${r.status.level==='red'?'red':r.status.level==='amber'?'amber':'green'}">${r.status.label}</span></td>
        </tr>`).join('') || `<tr><td colspan="12" class="center muted">Sem produtos ativos no mix.</td></tr>`}</tbody>
    </table></div>`;
  }


  function renderOffers(){
    setTitle('Ofertas Comerciais', 'Cadastre produtos em oferta por período, rede e loja. A ressalva aparece para o comercial e para o promotor no pedido.');
    if (!state.offersFilterMonth) state.offersFilterMonth = todayISO().slice(0,7);
    const month = state.offersFilterMonth;
    const redes = getRedeOptions().filter(Boolean);
    const products = Store.data.products
      .filter(p => p.situacao === 'ATIVO')
      .sort((a,b)=>a.tipo.localeCompare(b.tipo) || a.nomeSistema.localeCompare(b.nomeSistema));
    const rows = (Store.data.offers || [])
      .filter(o => offerOverlapsMonth(o, month))
      .sort((a,b)=>(offerStart(b)||'').localeCompare(offerStart(a)||'') || (a.rede||'').localeCompare(b.rede||'') || (productById(a.productId)?.nomeSistema||'').localeCompare(productById(b.productId)?.nomeSistema||''));
    const activeToday = (Store.data.offers || []).filter(o => offerIsActiveOn(o, todayISO())).length;
    $('#viewRoot').innerHTML = `
      <div class="grid three">
        ${kpi('🏷','Ofertas cadastradas',(Store.data.offers || []).length,'total no sistema','amber')}
        ${kpi('✓','Ofertas hoje',activeToday,'ativas na data de hoje')}
        ${kpi('▥','Mês selecionado',rows.length,'ofertas que passam pelo mês filtrado')}
      </div>

      <div class="grid two" style="margin-top:14px">
        <div class="card">
          <h3>Nova oferta</h3>
          <p class="muted">Informe rede, período, lojas, produto e valor. O sistema não altera o pedido automaticamente; ele mostra uma ressalva para orientar a análise.</p>
          <div class="form-grid">
            <label>Rede
              <select id="offerRede">
                <option value="">Selecione a rede</option>
                ${redes.map(r=>`<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}
              </select>
            </label>
            <label>Data inicial
              <input type="date" id="offerStartDate" value="${todayISO()}">
            </label>
            <label>Data final
              <input type="date" id="offerEndDate" value="${todayISO()}">
            </label>
            <label>Produto
              <select id="offerProduct">
                <option value="">Selecione o produto</option>
                ${products.map(p=>`<option value="${p.id}">${escapeHtml(p.tipo)} • ${escapeHtml(p.nomeSistema)}</option>`).join('')}
              </select>
            </label>
            <label>Valor da oferta
              <input type="number" id="offerPrice" step="0.01" min="0" placeholder="Ex.: 3,49">
            </label>
          </div>

          <label style="margin-top:12px">Lojas da oferta
            <select id="offerStores" multiple size="7">
              <option value="__ALL__" selected>Selecione uma rede primeiro — Todas as lojas da rede</option>
            </select>
            <small class="muted">Deixe “Todas as lojas” selecionado para aplicar na rede inteira. Para oferta isolada, selecione uma ou várias lojas.</small>
          </label>

          <label style="margin-top:12px">Observação opcional
            <textarea id="offerNotes" placeholder="Ex.: Oferta de fim de semana, encarte, ação comercial..."></textarea>
          </label>
          <div class="footer-actions">
            <button class="btn btn-primary" id="saveOfferBtn">Salvar oferta</button>
          </div>
        </div>

        <div class="card">
          <h3>Como a ressalva aparece</h3>
          <div class="offer-preview">
            <strong>🏷 Item em oferta nesta data</strong>
            <span>Produto X por R$ 3,49 • período: 04/04/2026 a 07/04/2026</span>
            <small>Essa informação aparece na linha do item para o promotor e nas análises do comercial, respeitando a rede e as lojas selecionadas.</small>
          </div>
          <p class="muted">Use para evitar que o comercial ou a loja analisem o pedido sem considerar que o produto estava com preço promocional naquela data.</p>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="view-head" style="margin-bottom:12px">
          <div>
            <h3>Histórico de ofertas</h3>
            <p class="muted">Filtre por mês para acompanhar ofertas de um dia ou de vários dias seguidos.</p>
          </div>
          <div class="actions">
            <input type="month" id="offerMonth" value="${escapeHtml(month)}">
          </div>
        </div>
        ${renderOffersTable(rows)}
      </div>
    `;
    $('#saveOfferBtn').addEventListener('click', saveOfferFromForm);
    $('#offerMonth').addEventListener('change', e => {
      state.offersFilterMonth = e.target.value || todayISO().slice(0,7);
      render();
    });
    $('#offerRede').addEventListener('change', populateOfferStoreSelect);
    populateOfferStoreSelect();
  }

  function populateOfferStoreSelect(){
    const rede = $('#offerRede')?.value || '';
    const select = $('#offerStores');
    if (!select) return;
    const stores = Store.data.stores
      .filter(st => !rede || st.rede === rede)
      .sort((a,b)=>a.nome.localeCompare(b.nome));
    select.innerHTML = `
      <option value="__ALL__" selected>Todas as lojas da rede</option>
      ${stores.map(st => `<option value="${st.id}">${escapeHtml(st.nome)}</option>`).join('')}
    `;
  }

  function selectedOfferStoreIds(){
    const select = $('#offerStores');
    if (!select) return [];
    const values = Array.from(select.selectedOptions || []).map(o => o.value).filter(Boolean);
    if (!values.length || values.includes('__ALL__')) return [];
    return values;
  }

  function offerStoreScopeKey(offer){
    const ids = offerStoreIds(offer).slice().sort();
    return ids.length ? ids.join('|') : '__ALL__';
  }

  function renderOffersTable(rows){
    return `<div class="table-wrap"><table>
      <thead><tr><th>Período</th><th>Rede</th><th>Lojas</th><th>Produto</th><th>Tipo</th><th class="num">Valor oferta</th><th>Observação</th><th>Cadastrado em</th><th>Ação</th></tr></thead>
      <tbody>${rows.map(o => {
        const p = productById(o.productId);
        return `<tr>
          <td>${offerPeriodLabel(o)}</td>
          <td>${escapeHtml(o.rede || '')}</td>
          <td>${escapeHtml(offerScopeLabel(o))}</td>
          <td><div class="product-cell"><span class="prod-dot"></span><strong>${escapeHtml(p?.nomeSistema || 'Produto removido')}</strong></div></td>
          <td>${escapeHtml(p?.tipo || '—')}</td>
          <td class="num">${money.format(toNumber(o.price))}</td>
          <td>${escapeHtml(o.notes || '—')}</td>
          <td>${o.createdAt ? formatDateTime(o.createdAt) : '—'}</td>
          <td><button class="btn btn-sm btn-danger" onclick="App.deleteOffer('${o.id}')">Excluir</button></td>
        </tr>`;
      }).join('') || `<tr><td colspan="9" class="center muted">Nenhuma oferta cadastrada no mês selecionado.</td></tr>`}</tbody>
    </table></div>`;
  }

  async function saveOfferFromForm(){
    const rede = $('#offerRede')?.value || '';
    const startDate = $('#offerStartDate')?.value || '';
    const endDate = $('#offerEndDate')?.value || '';
    const productId = $('#offerProduct')?.value || '';
    const price = toNumber($('#offerPrice')?.value);
    const notes = ($('#offerNotes')?.value || '').trim();
    const storeIds = selectedOfferStoreIds();

    if (!rede) return toast('Selecione a rede da oferta.', 'error');
    if (!startDate) return toast('Informe a data inicial da oferta.', 'error');
    if (!endDate) return toast('Informe a data final da oferta.', 'error');
    if (endDate < startDate) return toast('A data final não pode ser menor que a data inicial.', 'error');
    if (!productId) return toast('Selecione o produto da oferta.', 'error');
    if (price <= 0) return toast('Informe um valor de oferta válido.', 'error');

    const scopeKey = storeIds.length ? storeIds.slice().sort().join('|') : '__ALL__';
    const duplicated = (Store.data.offers || []).find(o =>
      o.rede === rede &&
      o.productId === productId &&
      offerStart(o) === startDate &&
      offerEnd(o) === endDate &&
      offerStoreScopeKey(o) === scopeKey
    );
    if (duplicated && !confirm('Já existe uma oferta cadastrada para essa rede, período, lojas e produto. Deseja substituir pelo novo valor?')) return;
    if (duplicated) {
      duplicated.price = price;
      duplicated.notes = notes;
      duplicated.startDate = startDate;
      duplicated.endDate = endDate;
      duplicated.date = startDate;
      duplicated.storeIds = storeIds;
      duplicated.updatedAt = new Date().toISOString();
      duplicated.updatedBy = state.session?.usuario || 'admin';
    } else {
      Store.data.offers ||= [];
      Store.data.offers.push({
        id: uid('offer'),
        rede,
        date: startDate,
        startDate,
        endDate,
        storeIds,
        productId,
        price,
        notes,
        createdAt: new Date().toISOString(),
        createdBy: state.session?.usuario || 'admin'
      });
    }
    await Store.save();
    toast('Oferta salva. A ressalva já aparece nos pedidos dentro do período e nas lojas selecionadas.');
    render();
  }

  async function deleteOffer(id){
    if (!id) return;
    const offer = (Store.data.offers || []).find(o => o.id === id);
    if (!offer) return;
    if (!confirm('Excluir esta oferta cadastrada?')) return;
    Store.data.offers = (Store.data.offers || []).filter(o => o.id !== id);
    await Store.save();
    toast('Oferta excluída.');
    render();
  }



  function deliveryGrossValue(d){
    const explicit = toNumber(d.valuePdf);
    if (explicit > 0) return explicit;
    return toNumber(d.qtyPdf) * toNumber(d.unitCost);
  }

  function importAuditRows(){
    const f = state.audit || {};
    return (Store.data.deliveries || []).filter(d => {
      if (f.dateFrom && d.date < f.dateFrom) return false;
      if (f.dateTo && d.date > f.dateTo) return false;
      if (f.rede && d.rede !== f.rede) return false;
      if (f.source && String(d.sourceType || 'PDF').toUpperCase() !== f.source) return false;
      return true;
    });
  }

  function auditGroupRows(rows, keyFn){
    const map = new Map();
    rows.forEach(d => {
      const key = keyFn(d);
      if (!map.has(key)) map.set(key, {
        key,
        date:d.date,
        rede:d.rede,
        storeId:d.storeId,
        orderNumber:d.orderNumber || '',
        sourceType:String(d.sourceType || 'PDF').toUpperCase(),
        files:new Set(),
        notes:new Set(),
        stores:new Set(),
        items:0,
        qty:0,
        bruto:0,
        valido:0,
        falta:0,
        qualidade:0,
        alertas:0
      });
      const g = map.get(key);
      if ((d.date || '') < (g.date || d.date || '9999-12-31')) g.date = d.date;
      if (!g.rede && d.rede) g.rede = d.rede;
      if (!g.storeId && d.storeId) g.storeId = d.storeId;
      if (!g.orderNumber && d.orderNumber) g.orderNumber = d.orderNumber;
      if (d.fileName) g.files.add(d.fileName);
      if (d.sourceFileName) g.files.add(d.sourceFileName);
      g.notes.add(d.importGroupKey || d.orderNumber || d.id);
      if (d.storeId) g.stores.add(d.storeId);
      g.items += 1;
      g.qty += validQty(d);
      g.bruto += deliveryGrossValue(d);
      g.valido += validValue(d);
      g.falta += toNumber(d.faltaQty) * toNumber(d.unitCost);
      g.qualidade += toNumber(d.qualidadeQty) * toNumber(d.unitCost);
      if (alertDetailsForDelivery(d).length) g.alertas += 1;
    });
    return Array.from(map.values());
  }

  function parseAuditExpectedLines(text){
    const rows = [];
    String(text || '').split(/\r?\n/).forEach((line, idx) => {
      const raw = line.trim();
      if (!raw) return;
      const parts = raw.split(/[;\t]/).map(x => x.trim()).filter(Boolean);
      let date='', rede='', value=0;
      if (parts.length >= 3) {
        date = parseDate(parts[0]);
        rede = normalizeRedeLabel(parts[1]);
        value = toNumber(parts.slice(2).join(' '));
      } else if (parts.length === 2) {
        date = parseDate(parts[0]);
        value = toNumber(parts[1]);
      } else {
        const m = raw.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}).*?([\d.]+,\d{2}|\d+\.\d{2})\s*$/);
        if (m) { date = parseDate(m[1]); value = toNumber(m[2]); }
      }
      if (date && value > 0) rows.push({line:idx+1, date, rede, expected:value});
    });
    return rows;
  }

  function normalizeRedeLabel(value){
    const n = normalize(value);
    const found = expectedPdfRedes().find(r => normalize(r) === n || n.includes(normalize(r)) || normalize(r).includes(n));
    if (found) return found;
    if (n.includes('DIA A DIA') || n === 'DD') return 'DIA A DIA';
    if (n.includes('FORT') || n.includes('COMPER')) return 'COMPER/FORT';
    if (n.includes('COSTA')) return 'COSTA ATACADÃO';
    return String(value || '').trim();
  }

  function computeImportAudit(){
    const rows = importAuditRows();
    const byDateRede = auditGroupRows(rows, d => `${d.date}|${d.rede || 'Rede não identificada'}`)
      .sort((a,b)=>(a.date||'').localeCompare(b.date||'') || (a.rede||'').localeCompare(b.rede||''));
    const byRede = auditGroupRows(rows, d => d.rede || 'Rede não identificada')
      .sort((a,b)=>b.valido-a.valido);
    const byStore = auditGroupRows(rows, d => `${d.rede || ''}|${d.storeId || 'loja?'}`)
      .sort((a,b)=>b.valido-a.valido);
    const byNote = auditGroupRows(rows, d => d.importGroupKey || `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber || d.id}`)
      .sort((a,b)=>(b.date||'').localeCompare(a.date||'') || b.valido-a.valido);
    const issues = (Store.data.importIssues || []).filter(i => {
      if (!['PDF','XML'].includes(i.type)) return false;
      if (!importIssueStillRelevant(i)) return false;
      if (state.audit?.source && i.type !== state.audit.source) return false;
      const group = importGroupParts(i.importGroupKey || '');
      const issueDate = i.date || group.date || '';
      const issueRede = i.rede || group.rede || '';
      if (state.audit?.dateFrom && issueDate && issueDate < state.audit.dateFrom) return false;
      if (state.audit?.dateTo && issueDate && issueDate > state.audit.dateTo) return false;
      if (state.audit?.rede) {
        const hasNoteInFilter = byNote.some(n => n.key === i.importGroupKey);
        if (!hasNoteInFilter && issueRede !== state.audit.rede) return false;
      }
      return true;
    }).slice().reverse();
    const expectedLines = parseAuditExpectedLines(state.audit?.compareText || '');
    const compareRows = expectedLines.map(er => {
      const imported = byDateRede
        .filter(r => r.date === er.date && (!er.rede || r.rede === er.rede))
        .reduce((a,r)=>a+r.valido,0);
      return {...er, imported, diff: er.expected - imported};
    }).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
    const expectedValue = toNumber(state.audit?.expectedValue);
    const total = {
      items: rows.length,
      notes: unique(rows.map(d=>d.importGroupKey || d.orderNumber || d.id)).length,
      stores: unique(rows.map(d=>d.storeId)).length,
      files: unique(rows.flatMap(d=>[d.fileName, d.sourceFileName]).filter(Boolean)).length,
      qty: rows.reduce((a,d)=>a+validQty(d),0),
      bruto: rows.reduce((a,d)=>a+deliveryGrossValue(d),0),
      valido: rows.reduce((a,d)=>a+validValue(d),0),
      falta: rows.reduce((a,d)=>a+toNumber(d.faltaQty)*toNumber(d.unitCost),0),
      qualidade: rows.reduce((a,d)=>a+toNumber(d.qualidadeQty)*toNumber(d.unitCost),0),
      expected: expectedValue,
      diff: expectedValue > 0 ? expectedValue - rows.reduce((a,d)=>a+validValue(d),0) : 0
    };
    return {rows, byDateRede, byRede, byStore, byNote, issues, compareRows, total};
  }

  function renderImportAudit(){
    setTitle('Conferência de Importação', 'Compare o valor importado pelo sistema e localize diferenças por data, rede, loja e nota.');
    state.audit ||= {dateFrom:'', dateTo:'', rede:'', source:'', expectedValue:'', compareText:''};
    const audit = computeImportAudit();
    const redes = expectedPdfRedes();
    const dates = unique([
      ...(Store.data.deliveries || []).map(d=>d.date),
      ...(Store.data.cancelledNfes || []).map(d=>d.date),
      ...(Store.data.importIssues || []).map(i=>i.date || importGroupParts(i.importGroupKey || '').date)
    ].filter(Boolean)).sort();
    const minDate = state.audit.dateFrom || dates[0] || '';
    const maxDate = state.audit.dateTo || dates[dates.length-1] || '';
    const diffType = audit.total.expected ? (Math.abs(audit.total.diff) <= 0.10 ? 'green' : 'red') : 'amber';
    $('#viewRoot').innerHTML = `
      <div class="card audit-card">
        <h3>1. Filtros da conferência</h3>
        <div class="filter-row">
          <label>Data inicial<input type="date" id="auditDateFrom" value="${escapeHtml(minDate)}"></label>
          <label>Data final<input type="date" id="auditDateTo" value="${escapeHtml(maxDate)}"></label>
          <label>Rede<select id="auditRede"><option value="">Todas as redes</option>${redes.map(r=>`<option value="${escapeHtml(r)}" ${state.audit.rede===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></label>
          <label>Origem<select id="auditSource"><option value="">XML e PDF</option><option value="XML" ${state.audit.source==='XML'?'selected':''}>Somente XML</option><option value="PDF" ${state.audit.source==='PDF'?'selected':''}>Somente PDF</option></select></label>
          <label>Valor esperado<input id="auditExpectedValue" inputmode="decimal" placeholder="Ex: 2.617.668,60" value="${escapeHtml(state.audit.expectedValue || '')}"></label>
          <button class="btn btn-primary" id="auditRefresh">Atualizar</button>
        </div>
        <p class="muted small">O valor comparado é a <strong>venda válida</strong> usada no dashboard: quantidade importada menos faltas/qualidade, multiplicada pelo custo unitário.</p>
      </div>

      <div class="grid kpis" style="margin-top:14px">
        ${kpi('$','Valor importado',money.format(audit.total.valido),'venda válida no filtro')}
        ${kpi('↔','Diferença',audit.total.expected ? money.format(audit.total.diff) : 'Informe valor esperado',audit.total.expected ? 'esperado - importado' : 'para comparar',diffType)}
        ${kpi('▥','Valor bruto NF',money.format(audit.total.bruto),'antes de faltas/qualidade')}
        ${kpi('▣','Notas / lojas',`${fmt.format(audit.total.notes)} / ${fmt.format(audit.total.stores)}`,`${fmt.format(audit.total.files)} arquivo(s)`)}
        ${kpi('⚠','Divergências',fmt.format(audit.issues.length),'itens para conferir',audit.issues.length?'red':'green')}
        ${kpi('−','Abates',money.format(audit.total.falta + audit.total.qualidade),'faltas + qualidade','amber')}
      </div>

      <div class="grid two" style="margin-top:14px">
        <div class="card">
          <h3>2. Comparar por data/rede</h3>
          <p class="muted">Cole aqui o resumo do seu sistema, uma linha por data ou data/rede. Formato recomendado:</p>
          <pre class="code-sample">01/04/2026;DIA A DIA;123456,78
01/04/2026;COMPER/FORT;98765,43</pre>
          <textarea id="auditCompareText" rows="6" placeholder="Cole aqui o resumo para comparar por data/rede...">${escapeHtml(state.audit.compareText || '')}</textarea>
          <div class="footer-actions"><button class="btn btn-soft" id="auditCompareBtn">Comparar linhas coladas</button></div>
        </div>
        <div class="card">
          <h3>Resumo por rede</h3>
          ${renderAuditRedeTable(audit.byRede)}
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h3>${audit.compareRows.length ? 'Diferenças encontradas no resumo colado' : 'Conferência por data e rede'}</h3>
        ${audit.compareRows.length ? renderAuditCompareTable(audit.compareRows) : renderAuditDateRedeTable(audit.byDateRede)}
      </div>

      <div class="card" style="margin-top:14px">
        <h3>Maiores valores por loja</h3>
        <p class="muted">Use para localizar rapidamente qual rede/loja pesa mais dentro do período filtrado.</p>
        ${renderAuditStoreTable(audit.byStore.slice(0,80))}
      </div>

      <div class="card" style="margin-top:14px">
        <h3>Notas importadas</h3>
        <p class="muted">Lista nota por nota. Aqui você identifica se alguma NF caiu em data/rede/loja diferente.</p>
        <div class="footer-actions"><button class="btn btn-soft" id="auditExportCsv">Exportar conferência CSV</button></div>
        ${renderAuditNotesTable(audit.byNote.slice(0,300))}
      </div>

      <div class="card" style="margin-top:14px">
        <h3>Notas ignoradas, pendentes ou com erro</h3>
        <p class="muted">Tudo que não entrou limpo na importação aparece aqui: loja/produto não reconhecido, valor divergente, XML inválido e outras falhas.</p>
        ${renderAuditIssuesTable(audit.issues.slice(0,300))}
      </div>
    `;
    bindImportAuditEvents();
  }

  function bindImportAuditEvents(){
    const update = () => {
      state.audit.dateFrom = $('#auditDateFrom')?.value || '';
      state.audit.dateTo = $('#auditDateTo')?.value || '';
      state.audit.rede = $('#auditRede')?.value || '';
      state.audit.source = $('#auditSource')?.value || '';
      state.audit.expectedValue = $('#auditExpectedValue')?.value || '';
      state.audit.compareText = $('#auditCompareText')?.value || '';
      renderImportAudit();
    };
    $('#auditRefresh')?.addEventListener('click', update);
    $('#auditCompareBtn')?.addEventListener('click', update);
    ['auditDateFrom','auditDateTo','auditRede','auditSource'].forEach(id => $('#'+id)?.addEventListener('change', update));
    $('#auditExpectedValue')?.addEventListener('change', update);
    $('#auditExportCsv')?.addEventListener('click', exportImportAuditCsv);
  }

  function renderAuditRedeTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Rede</th><th class="num">Notas</th><th class="num">Qtd.</th><th class="num">Valor válido</th><th class="num">Valor bruto</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td><strong>${escapeHtml(r.key)}</strong></td><td class="num">${fmt.format(r.notes.size)}</td><td class="num">${fmt.format(r.qty)}</td><td class="num">${money.format(r.valido)}</td><td class="num">${money.format(r.bruto)}</td></tr>`).join('') || `<tr><td colspan="5" class="center muted">Sem importações no filtro.</td></tr>`}
    </tbody></table></div>`;
  }

  function renderAuditDateRedeTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Rede</th><th class="num">Notas</th><th class="num">Lojas</th><th class="num">Qtd.</th><th class="num">Valor válido</th><th class="num">Valor bruto</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${formatDate(r.date)}</td><td>${escapeHtml(r.rede)}</td><td class="num">${fmt.format(r.notes.size)}</td><td class="num">${fmt.format(r.stores.size)}</td><td class="num">${fmt.format(r.qty)}</td><td class="num">${money.format(r.valido)}</td><td class="num">${money.format(r.bruto)}</td></tr>`).join('') || `<tr><td colspan="7" class="center muted">Sem dados para conferir.</td></tr>`}
    </tbody></table></div>`;
  }

  function renderAuditCompareTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Linha</th><th>Data</th><th>Rede</th><th class="num">Valor esperado</th><th class="num">Valor importado</th><th class="num">Diferença</th><th>Status</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${r.line}</td><td>${formatDate(r.date)}</td><td>${escapeHtml(r.rede || 'Todas')}</td><td class="num">${money.format(r.expected)}</td><td class="num">${money.format(r.imported)}</td><td class="num ${Math.abs(r.diff)>0.10?'negative':'positive'}">${money.format(r.diff)}</td><td><span class="badge ${Math.abs(r.diff)>0.10?'red':'green'}">${Math.abs(r.diff)>0.10?'Divergente':'OK'}</span></td></tr>`).join('') || `<tr><td colspan="7" class="center muted">Cole um resumo para comparar.</td></tr>`}
    </tbody></table></div>`;
  }

  function renderAuditStoreTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Rede</th><th>Loja</th><th class="num">Notas</th><th class="num">Qtd.</th><th class="num">Valor válido</th><th class="num">Abates</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${escapeHtml(r.rede)}</td><td>${escapeHtml(storeById(r.storeId)?.nome || r.storeId || 'Loja não identificada')}</td><td class="num">${fmt.format(r.notes.size)}</td><td class="num">${fmt.format(r.qty)}</td><td class="num">${money.format(r.valido)}</td><td class="num">${money.format(r.falta + r.qualidade)}</td></tr>`).join('') || `<tr><td colspan="6" class="center muted">Sem lojas no filtro.</td></tr>`}
    </tbody></table></div>`;
  }

  function renderAuditNotesTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Origem</th><th>Rede</th><th>Loja</th><th>Nota</th><th class="num">Itens</th><th class="num">Qtd.</th><th class="num">Valor válido</th><th class="num">Valor bruto</th><th>Status</th></tr></thead><tbody>
      ${rows.map(r=>{
        const details = alertDetailsForNote(r.key);
        return `<tr><td>${formatDate(r.date)}</td><td>${escapeHtml(r.sourceType)}</td><td>${escapeHtml(r.rede)}</td><td>${escapeHtml(storeById(r.storeId)?.nome || r.storeId || '')}</td><td>${escapeHtml(r.orderNumber || r.key)}</td><td class="num">${fmt.format(r.items)}</td><td class="num">${fmt.format(r.qty)}</td><td class="num">${money.format(r.valido)}</td><td class="num">${money.format(r.bruto)}</td><td>${renderStatusBadge(details,'note',r.key)}</td></tr>`;
      }).join('') || `<tr><td colspan="10" class="center muted">Nenhuma nota importada no filtro.</td></tr>`}
    </tbody></table></div>`;
  }

  function renderAuditIssuesTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data registro</th><th>Arquivo</th><th>Tipo</th><th>Divergência</th><th>Detalhe</th></tr></thead><tbody>
      ${rows.map(i=>`<tr><td>${formatDateTime(i.createdAt)}</td><td>${escapeHtml(i.fileName || '')}</td><td>${escapeHtml(i.type || '')} / ${escapeHtml(i.kind || '')}</td><td><span class="badge red">${escapeHtml(i.message || '')}</span></td><td>${escapeHtml(i.detail || '')}</td></tr>`).join('') || `<tr><td colspan="5" class="center muted">Nenhuma divergência no filtro.</td></tr>`}
    </tbody></table></div>`;
  }

  function exportImportAuditCsv(){
    const audit = computeImportAudit();
    const lines = [['Data','Origem','Rede','Loja','Nota','Itens','Quantidade','Valor valido','Valor bruto','Falta','Qualidade','Arquivos']];
    audit.byNote.forEach(r => {
      lines.push([
        formatDate(r.date),
        r.sourceType,
        r.rede,
        storeById(r.storeId)?.nome || r.storeId || '',
        r.orderNumber || r.key,
        r.items,
        r.qty,
        r.valido.toFixed(2).replace('.',','),
        r.bruto.toFixed(2).replace('.',','),
        r.falta.toFixed(2).replace('.',','),
        r.qualidade.toFixed(2).replace('.',','),
        Array.from(r.files).join(' | ')
      ]);
    });
    const csv = lines.map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'conferencia_importacao_so_folhas_' + todayISO() + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }


  function renderImportPdf(){
    setTitle('Importar XML/PDF/ZIP de Entrega', 'Use esta tela para importar entregas/faturamento. Dia a Dia e Comper/Fort podem entrar por XML/ZIP; Costa pode continuar em PDF.');
    const noteSummaries = deliveryImportSummaries().slice(0,80);
    const fileSummaries = deliveryFileSummaries().slice(0,80);
    const issues = Store.data.importIssues.filter(i=>['PDF','XML'].includes(i.type) && importIssueStillRelevant(i)).slice(-40).reverse();
    $('#viewRoot').innerHTML = `
      <div class="grid two">
        <div class="card import-flow-card">
          <h3>1. Nova importação de XML/PDF</h3>
          <p class="muted">Importe XML de NF-e ativa para Dia a Dia e Comper/Fort, ou PDF para Costa. ZIP com XMLs/PDFs também é aceito. XML de NF cancelada é rejeitado e registrado na conferência.</p>
          <label>Rede do arquivo
            <select id="pdfRede">
              <option value="">Identificar automaticamente</option>
              <option>DIA A DIA</option><option>COSTA ATACADÃO</option><option>COMPER/FORT</option>
            </select>
          </label>
          <label style="margin-top:12px">Arquivos XML, PDF ou ZIP com XMLs/PDFs
            <input type="file" id="pdfInput" multiple accept=".pdf,.xml,.zip,application/pdf,text/xml,application/xml" />
          </label>
          <div class="import-steps">
            <span>1. Selecionar arquivo</span>
            <span>2. Ler dados</span>
            <span>3. Mostrar divergências</span>
            <span>4. Salvar no histórico</span>
          </div>
          <div class="footer-actions"><button id="processPdf" class="btn btn-primary">Ler e importar arquivos</button></div>
          <div id="pdfImportLog" class="empty" style="margin-top:12px">Nenhum arquivo processado nesta sessão.</div>
        </div>
        <div class="card import-help-card">
          <h3>O que o XML/PDF alimenta?</h3>
          <div class="mini-list">
            <div><strong>Entrega válida</strong><span>Quantidade importada menos faltas e qualidade.</span></div>
            <div><strong>Sugestão comercial</strong><span>Quantidade enviada conforme NF-e ou PDF.</span></div>
            <div><strong>Custo do produto</strong><span>Usado em quebra, falta e qualidade.</span></div>
            <div><strong>Pendências de bandejas</strong><span>Baixa automática conforme entrega válida.</span></div>
          </div>
        </div>
      </div>

      <div class="card pdf-calendar-card" style="margin-top:14px">
        <h3>Calendário de importações de XML/PDF</h3>
        <p class="muted">Confira rapidamente quais datas já estão completas e quais ainda têm rede pendente, independentemente de entrar por XML ou PDF.</p>
        ${renderPdfImportCalendar()}
      </div>

      <div class="card" style="margin-top:14px">
        <h3>Histórico de XML/PDF importados</h3>
        <p class="muted">Exclua aqui um arquivo importado. A exclusão remove automaticamente entregas, custos, sugestão comercial, faltas/qualidade e impactos vinculados a essa importação.</p>
        ${renderPdfImportHistory(fileSummaries)}
      </div>

      <div class="card" style="margin-top:14px">
        <h3>Resumo por loja/nota</h3>
        <p class="muted">Visualização consolidada por nota: quantidade de itens, quantidade total entregue e valor total.</p>
        ${renderDeliveryImportSummary(noteSummaries)}
      </div>

      <div class="card" style="margin-top:14px">
        <div class="panel-head">
          <div>
            <h3>Divergências de reconhecimento</h3>
            <p class="muted">Quando loja, produto, data, custo ou quantidade não forem reconhecidos no XML/PDF, o erro aparece aqui para conferência.</p>
          </div>
          <div class="footer-actions compact-actions">
            <button class="btn btn-sm btn-soft" type="button" onclick="App.cleanResolvedImportIssues()">Ocultar corrigidos</button>
            <button class="btn btn-sm btn-danger" type="button" onclick="App.clearImportIssues()">Limpar</button>
          </div>
        </div>
        ${renderImportIssues(issues)}
      </div>
    `;
    $('#processPdf').addEventListener('click', processPdfFiles);
  }


  function deliveryImportSummaries(){
    const map = new Map();
    for (const d of Store.data.deliveries) {
      const key = d.importGroupKey || `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber||d.fileName||''}`;
      if (!map.has(key)) map.set(key,{key,date:d.date,rede:d.rede,storeId:d.storeId,orderNumber:d.orderNumber||'—',fileName:d.fileName||'',importedAt:d.importedAt,items:0,qty:0,value:0,issues:0});
      const g=map.get(key);
      g.items += 1;
      g.qty += validQty(d);
      g.value += validValue(d);
      if (toNumber(d.noteQtyTotal) > 0) g.noteQtyTotal = toNumber(d.noteQtyTotal);
      if (!isProductActiveForStore(d.storeId,d.productId)) g.issues += 1;
      if (d.importedAt > g.importedAt) g.importedAt = d.importedAt;
    }
    return Array.from(map.values()).map(g=>({
      ...g,
      qty: toNumber(g.noteQtyTotal) > 0 ? toNumber(g.noteQtyTotal) : g.qty
    })).sort((a,b)=>(b.importedAt||'').localeCompare(a.importedAt||''));
  }

  function deliveryFileSummaries(){
    const map = new Map();
    for (const d of Store.data.deliveries) {
      const key = d.importBatchId || `${d.fileName}|${d.rede}|${d.importedAt}`;
      if (!map.has(key)) map.set(key,{
        key,
        fileName:d.sourceFileName || d.fileName || 'Arquivo sem nome',
        importedAt:d.importedAt,
        dates:new Set(),
        redes:new Set(),
        stores:new Set(),
        notes:new Set(),
        noteQtyTotals:new Map(),
        items:0,
        qty:0,
        value:0,
        issues:0
      });
      const g = map.get(key);
      g.dates.add(d.date);
      g.redes.add(d.rede);
      g.stores.add(d.storeId);
      const noteKey = d.importGroupKey || d.orderNumber || d.id;
      g.notes.add(d.orderNumber || d.importGroupKey || d.id);
      if (toNumber(d.noteQtyTotal) > 0) g.noteQtyTotals.set(noteKey, toNumber(d.noteQtyTotal));
      g.items += 1;
      g.qty += validQty(d);
      g.value += validValue(d);
      if (alertDetailsForDelivery(d).length) g.issues += 1;
      if ((d.importedAt||'') > (g.importedAt||'')) g.importedAt = d.importedAt;
    }
    return Array.from(map.values()).map(g=>{
      const batchIssues = alertDetailsForBatch(g.key);
      const noteQtyTotal = Array.from(g.noteQtyTotals.values()).reduce((sum,n)=>sum + toNumber(n), 0);
      return {
        ...g,
        dates:Array.from(g.dates).sort(),
        redes:Array.from(g.redes).sort(),
        stores:g.stores.size,
        notes:g.notes.size,
        qty: noteQtyTotal > 0 ? noteQtyTotal : g.qty,
        issues:g.issues + batchIssues.length,
        issueDetails:batchIssues
      };
    }).sort((a,b)=>(b.importedAt||'').localeCompare(a.importedAt||''));
  }

  function deliveryNoteSummariesForBatch(batchKey){
    return deliveryImportSummaries()
      .filter(r => {
        const rows = Store.data.deliveries.filter(d => (d.importGroupKey || `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber||d.fileName||''}`) === r.key);
        return rows.some(d => (d.importBatchId || `${d.fileName}|${d.rede}|${d.importedAt}`) === batchKey);
      })
      .map(r => ({...r, alertDetails: alertDetailsForNote(r.key)}));
  }

  function alertDetailsForDelivery(d){
    const details = [];
    const product = productById(d.productId);
    const store = storeById(d.storeId);
    const source = deliverySourceLabel(d);
    if (!isProductActiveForStore(d.storeId,d.productId)) {
      details.push(`Produto inativo entregue: ${product?.nomeSistema || d.productRaw || d.productId} consta como inativo no mix de ${store?.nome || 'loja não identificada'}, mas apareceu neste ${source}.`);
    }
    if (toNumber(d.qtyPdf) <= 0) details.push(`Quantidade inválida no ${source}: ${product?.nomeSistema || d.productRaw || d.productId}.`);
    if (toNumber(d.unitCost) <= 0) details.push(`Custo unitário não identificado no ${source}: ${product?.nomeSistema || d.productRaw || d.productId}.`);
    return details;
  }

  function alertDetailsForNote(noteKey){
    const rows = Store.data.deliveries.filter(d => (d.importGroupKey || `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber||d.fileName||''}`) === noteKey);
    const deliveryDetails = unique(rows.flatMap(alertDetailsForDelivery));
    const issueDetails = Store.data.importIssues
      .filter(i => i.importGroupKey === noteKey && importIssueStillRelevant(i))
      .map(issueText);
    return unique([...deliveryDetails, ...issueDetails]);
  }


  function importIssueStillRelevant(i){
    const msg = String(i.message || '');
    const detail = String(i.detail || '').trim();

    if (i.type === 'XML' && (/Loja não reconhecida/i.test(msg) || /Loja não reconhecida no XML/i.test(detail))) {
      const cnpjMatch = detail.match(/CNPJ\s*([\d\.\/-]+)/i);
      if (cnpjMatch && matchStoreByCnpj(cnpjMatch[1])) return false;
      return true;
    }

    if (i.type !== 'PDF') return true;

    if (/Loja não reconhecida/i.test(msg) || /Loja não reconhecida no PDF/i.test(detail)) {
      const match = detail.match(/Loja não reconhecida no PDF:\s*(.+?)(?:\s*\(pedido|\.|$)/i);
      const storeName = match?.[1]?.trim() || detail;
      // Se a loja agora é reconhecida pelo cadastro/equivalência atual, remove o alerta antigo da tela.
      return !matchStore(storeName);
    }

    if (!/Divergência no PDF/i.test(msg)) return true;
    const parts = detail.split('|').map(x=>x.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const store = matchStore(parts[0]);
      const product = matchProduct(parts.slice(1).join(' | '));
      // Se a equivalência atual já reconhece loja e produto, este alerta antigo não deve mais aparecer.
      return !(store && product);
    }
    return true;
  }

  function issueText(i){
    const detail = String(i.detail || '').trim();
    if (/Divergência no PDF/i.test(i.message || '')) {
      const parts = detail.split('|').map(x=>x.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const store = matchStore(parts[0]);
        const product = matchProduct(parts.slice(1).join(' | '));
        if (!store) return `Loja não reconhecida no PDF: ${parts[0]}.`;
        if (!product) return `Produto não reconhecido no PDF: ${parts.slice(1).join(' | ')} na loja ${store.nome}.`;
      }
    }
    return `${i.message || 'Divergência'}${detail ? ': ' + detail : ''}`.trim();
  }

  function alertDetailsForBatch(batchKey){
    const rows = Store.data.deliveries.filter(d => (d.importBatchId || `${d.fileName}|${d.rede}|${d.importedAt}`) === batchKey);
    const details = rows.flatMap(alertDetailsForDelivery);
    const issueDetails = Store.data.importIssues
      .filter(i => i.importBatchId === batchKey && importIssueStillRelevant(i))
      .map(issueText);
    return unique([...details, ...issueDetails]);
  }


  function renderStatusBadge(details, scope, key){
    if (!details || !details.length) return '<span class="badge green">Importado</span>';
    return `<button class="badge amber alert-click" type="button" data-app-action="show-import-alert" data-scope="${escapeHtml(scope)}" data-key="${escapeHtml(encodeIssueKeyForAttr(key))}">${details.length} alerta(s)</button>`;
  }



  function expectedPdfRedes(){
    const redes = unique((Store.data.stores || [])
      .filter(s => s.ativo !== false)
      .map(s => s.rede)
      .filter(Boolean)
    ).sort();
    return redes.length ? redes : ['DIA A DIA','COSTA ATACADÃO','COMPER/FORT'];
  }

  function currentPdfCalendarMonth(){
    if (state.pdfCalendarMonth) return state.pdfCalendarMonth;
    const dates = unique((Store.data.deliveries || []).map(d => d.date).filter(Boolean)).sort();
    return (dates[dates.length - 1] || todayISO()).slice(0,7);
  }

  function pdfCalendarMonthLabel(monthKey){
    const d = new Date(`${monthKey}-01T12:00:00`);
    const label = d.toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function pdfCalendarDayMap(){
    const map = new Map();
    for (const note of deliveryImportSummaries()) {
      if (!note.date) continue;
      if (!map.has(note.date)) {
        map.set(note.date, {
          date: note.date,
          redes: new Set(),
          stores: new Set(),
          files: new Set(),
          notes: 0,
          qty: 0,
          value: 0
        });
      }
      const day = map.get(note.date);
      if (note.rede) day.redes.add(note.rede);
      if (note.storeId) day.stores.add(note.storeId);
      if (note.fileName) day.files.add(note.fileName);
      day.notes += 1;
      day.qty += toNumber(note.qty);
      day.value += toNumber(note.value);
    }
    return map;
  }

  function pdfCalendarStatus(info, expectedRedes){
    const imported = info ? Array.from(info.redes).filter(Boolean).sort() : [];
    const missing = expectedRedes.filter(rede => !imported.includes(rede));
    if (!info || !imported.length) {
      return {cls:'red', label:'Sem importação', count:`0/${expectedRedes.length}`, imported, missing: expectedRedes};
    }
    if (!missing.length) {
      return {cls:'green', label:'OK', count:`${imported.length}/${expectedRedes.length}`, imported, missing};
    }
    return {cls:'amber', label:'Pendente', count:`${imported.length}/${expectedRedes.length}`, imported, missing};
  }

  function renderPdfImportCalendar(){
    const monthKey = currentPdfCalendarMonth();
    const [year, month] = monthKey.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const expectedRedes = expectedPdfRedes();
    const dayMap = pdfCalendarDayMap();
    const monthDatesWithImport = Array.from(dayMap.keys()).filter(d => d.startsWith(monthKey)).sort();
    const selectedDate = (state.pdfCalendarSelectedDate && state.pdfCalendarSelectedDate.startsWith(monthKey))
      ? state.pdfCalendarSelectedDate
      : (monthDatesWithImport[monthDatesWithImport.length - 1] || `${monthKey}-01`);
    const blanks = Array.from({length:first.getDay()}, () => '<div class="pdf-calendar-day is-empty"></div>');
    const days = [];
    for (let day = 1; day <= last.getDate(); day++) {
      const date = `${monthKey}-${String(day).padStart(2,'0')}`;
      const info = dayMap.get(date);
      const status = pdfCalendarStatus(info, expectedRedes);
      days.push(`
        <button class="pdf-calendar-day ${status.cls} ${date === selectedDate ? 'is-selected' : ''}" onclick="App.selectPdfCalendarDay('${date}')" title="${escapeHtml(status.label)} - ${escapeHtml(status.count)} redes">
          <span class="pdf-calendar-number">${day}</span>
          <span class="pdf-calendar-status">${escapeHtml(status.label)}</span>
          <span class="pdf-calendar-count">${escapeHtml(status.count)} redes</span>
        </button>`);
    }
    return `
      <div class="pdf-calendar-head">
        <button class="btn btn-sm btn-soft" onclick="App.changePdfCalendarMonth(-1)">‹ Mês anterior</button>
        <div>
          <strong>${pdfCalendarMonthLabel(monthKey)}</strong>
          <span class="muted small">Redes esperadas: ${expectedRedes.map(escapeHtml).join(', ')}</span>
        </div>
        <button class="btn btn-sm btn-soft" onclick="App.changePdfCalendarMonth(1)">Próximo mês ›</button>
      </div>
      <div class="pdf-calendar-legend">
        <span><i class="dot green"></i>OK</span>
        <span><i class="dot amber"></i>Pendente</span>
        <span><i class="dot red"></i>Sem importação</span>
      </div>
      <div class="pdf-calendar-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>
      <div class="pdf-calendar-grid">${blanks.join('')}${days.join('')}</div>
      ${renderPdfCalendarDayDetail(selectedDate, dayMap.get(selectedDate), expectedRedes)}`;
  }

  function renderPdfCalendarDayDetail(date, info, expectedRedes){
    const status = pdfCalendarStatus(info, expectedRedes);
    const imported = status.imported;
    const missing = status.missing;
    const files = deliveryFileSummaries().filter(file => (file.dates || []).includes(date));
    return `
      <div class="pdf-calendar-detail">
        <div>
          <strong>${formatDate(date)}</strong>
          <span class="badge ${status.cls}">${escapeHtml(status.label)}</span>
        </div>
        <div class="pdf-calendar-detail-grid">
          <div><span>Redes importadas</span><strong>${imported.length ? imported.map(escapeHtml).join(', ') : 'Nenhuma'}</strong></div>
          <div><span>Redes pendentes</span><strong class="${missing.length ? 'negative' : 'positive'}">${missing.length ? missing.map(escapeHtml).join(', ') : 'Nenhuma'}</strong></div>
          <div><span>Lojas/notas</span><strong>${fmt.format(info?.stores?.size || 0)} lojas / ${fmt.format(info?.notes || 0)} notas</strong></div>
          <div><span>Qtd. / Valor</span><strong>${fmt.format(info?.qty || 0)} und • ${money.format(info?.value || 0)}</strong></div>
        </div>
        ${files.length ? `
          <div class="pdf-calendar-files">
            ${files.map(f => `<span title="${escapeHtml(f.fileName)}">${escapeHtml(f.redes.join(', ') || 'Rede não identificada')} • ${escapeHtml(f.fileName)}</span>`).join('')}
          </div>` : '<p class="muted small">Nenhum XML/PDF importado para esta data.</p>'}
      </div>`;
  }

  function renderPdfImportHistory(rows){
    return `<div class="table-wrap pdf-history-table"><table><thead><tr><th></th><th>Importado em</th><th>Rede</th><th>Arquivo</th><th>Data(s) entrega</th><th class="num">Lojas</th><th class="num">Notas</th><th class="num">Qtd. total</th><th class="num">Valor total</th><th>Status</th><th>Ação</th></tr></thead><tbody>
      ${rows.map(r=>{
        const expanded = !!state.expandedPdfImports[r.key];
        const details = alertDetailsForBatch(r.key);
        const detailRows = expanded ? renderPdfImportDetailRows(r.key) : '';
        return `
          <tr class="pdf-summary-row">
            <td><button class="btn btn-sm btn-soft" type="button" data-app-action="toggle-pdf-history" data-key="${escapeHtml(encodeIssueKeyForAttr(r.key))}">${expanded?'−':'+'}</button></td>
            <td>${formatDateTime(r.importedAt)}</td>
            <td><strong>${r.redes.join(', ') || 'Rede não identificada'}</strong></td>
            <td>${escapeHtml(r.fileName)}</td>
            <td>${r.dates.map(formatDate).join(', ')}</td>
            <td class="num">${fmt.format(r.stores)}</td>
            <td class="num">${fmt.format(r.notes)}</td>
            <td class="num">${fmt.format(r.qty)}</td>
            <td class="num">${money.format(r.value)}</td>
            <td>${renderStatusBadge(details,'batch',r.key)}</td>
            <td><button class="btn btn-sm btn-danger" type="button" data-app-action="delete-delivery-batch" data-key="${escapeHtml(encodeIssueKeyForAttr(r.key))}">Excluir arquivo</button></td>
          </tr>
          ${detailRows}`;
      }).join('') || `<tr><td colspan="11" class="center muted">Nenhum XML/PDF importado.</td></tr>`}
    </tbody></table></div>`;
  }

  function renderPdfImportDetailRows(batchKey){
    const rows = deliveryNoteSummariesForBatch(batchKey);
    if (!rows.length) return `<tr class="pdf-detail-row"><td colspan="11" class="center muted">Nenhuma loja encontrada neste arquivo.</td></tr>`;
    return `
      <tr class="pdf-detail-row">
        <td></td>
        <td colspan="10">
          <div class="expanded-panel">
            <div class="expanded-title">Lojas/notas importadas neste arquivo</div>
            <table class="inner-table">
              <thead><tr><th>Data</th><th>Rede</th><th>Loja</th><th>Nº nota/pedido</th><th class="num">Itens</th><th class="num">Qtd. total</th><th class="num">Valor total</th><th>Status</th><th>Ação</th></tr></thead>
              <tbody>
                ${rows.map(r=>`<tr>
                  <td>${formatDate(r.date)}</td>
                  <td>${r.rede}</td>
                  <td>${storeById(r.storeId)?.nome||''}</td>
                  <td>${escapeHtml(r.orderNumber)}</td>
                  <td class="num">${fmt.format(r.items)}</td>
                  <td class="num">${fmt.format(r.qty)}</td>
                  <td class="num">${money.format(r.value)}</td>
                  <td>${renderStatusBadge(r.alertDetails,'note',r.key)}</td>
                  <td><button class="btn btn-sm btn-danger" type="button" data-app-action="delete-delivery-import" data-key="${escapeHtml(encodeIssueKeyForAttr(r.key))}">Excluir loja</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </td>
      </tr>`;
  }


  function renderDeliveryImportSummary(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Rede</th><th>Loja</th><th>Nº nota/pedido</th><th class="num">Itens na nota</th><th class="num">Qtd. total</th><th class="num">Valor total</th><th>Status</th><th>Ação</th></tr></thead><tbody>
      ${rows.map(r=>{
        const details = alertDetailsForNote(r.key);
        return `<tr><td>${formatDate(r.date)}</td><td>${r.rede}</td><td>${storeById(r.storeId)?.nome||''}</td><td>${escapeHtml(r.orderNumber)}</td><td class="num">${fmt.format(r.items)}</td><td class="num">${fmt.format(r.qty)}</td><td class="num">${money.format(r.value)}</td><td>${renderStatusBadge(details,'note',r.key)}</td><td><button class="btn btn-sm btn-danger" type="button" data-app-action="delete-delivery-import" data-key="${escapeHtml(encodeIssueKeyForAttr(r.key))}">Excluir</button></td></tr>`;
      }).join('') || `<tr><td colspan="9" class="center muted">Nenhum XML/PDF importado.</td></tr>`}
    </tbody></table></div>`;
  }


  async function deleteDeliveryImport(key){
    if (!key) return toast('Registro não identificado para exclusão.', 'error');
    if (!confirm('Excluir esta loja/nota importada e todos os dados de entrega vinculados?')) return;
    const groupKey = String(key);
    const before = Store.data.deliveries.length;
    const removedRows = Store.data.deliveries.filter(d => (d.importGroupKey || `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber||d.fileName||''}`) === groupKey);
    if (!removedRows.length) return toast('Nenhum dado encontrado para esta loja/nota. A tela pode estar desatualizada; use Ctrl+F5.', 'warn');
    const removedFileNames = unique(removedRows.map(d=>d.fileName || d.sourceFileName).filter(Boolean));
    Store.data.deliveries = Store.data.deliveries.filter(d => (d.importGroupKey || `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber||d.fileName||''}`) !== groupKey);
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => i.importGroupKey !== groupKey);
    Store.data.importDuplicates = (Store.data.importDuplicates || []).filter(dup => dup.currentKey !== groupKey && dup.newKey !== groupKey && dup.importGroupKey !== groupKey);
    Store.data.deletedImports ||= [];
    Store.data.deletedImports.push({id:uid('delimp'), type:'ARQUIVO_NOTA', key:groupKey, removed:before-Store.data.deliveries.length, fileNames:removedFileNames, user:state.session?.usuario || 'sistema', createdAt:new Date().toISOString()});
    await saveAndRender('Loja/nota removida com sucesso.');
  }

  async function deleteDeliveryBatch(batchId){
    if (!batchId) return toast('Arquivo/importação não identificado para exclusão.', 'error');
    if (!confirm('Atenção: ao excluir este arquivo, todos os dados vinculados a essa importação serão removidos. Deseja continuar?')) return;
    const key = String(batchId);
    const removedRows = Store.data.deliveries.filter(d => (d.importBatchId || `${d.fileName}|${d.rede}|${d.importedAt}`) === key);
    if (!removedRows.length) return toast('Nenhum dado encontrado para este arquivo. A tela pode estar desatualizada; use Ctrl+F5.', 'warn');
    const removedIds = new Set(removedRows.map(d=>d.id));
    const removedGroupKeys = new Set(removedRows.map(d => d.importGroupKey || `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber||d.fileName||''}`));
    const removedFileNames = unique(removedRows.map(d=>d.fileName || d.sourceFileName).filter(Boolean));
    const before = Store.data.deliveries.length;
    Store.data.deliveries = Store.data.deliveries.filter(d => (d.importBatchId || `${d.fileName}|${d.rede}|${d.importedAt}`) !== key);
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => i.importBatchId !== key && !removedGroupKeys.has(i.importGroupKey) && !removedFileNames.includes(i.fileName));
    Store.data.cancelledNfes = (Store.data.cancelledNfes || []).filter(c => c.importBatchId !== key && !removedFileNames.includes(c.fileName));
    Store.data.importDuplicates = (Store.data.importDuplicates || []).filter(dup => dup.importBatchId !== key && !removedFileNames.includes(dup.fileName) && !removedFileNames.includes(dup.newFileName));
    Store.data.deletedImports ||= [];
    Store.data.deletedImports.push({
      id:uid('delpdf'),
      type:'ARQUIVO_ENTREGA',
      key,
      fileNames:removedFileNames,
      removed:before-Store.data.deliveries.length,
      affectedDeliveryIds:Array.from(removedIds),
      affectedGroupKeys:Array.from(removedGroupKeys),
      user:state.session?.usuario || 'sistema',
      createdAt:new Date().toISOString()
    });
    await saveAndRender('Arquivo removido com todos os dados vinculados.');
  }

  function importIssueKey(i){
    return String(i?.id || [i?.fileName, i?.message, i?.detail, i?.createdAt, i?.importBatchId, i?.importGroupKey, i?.importId].join('||'));
  }

  function findImportIssueByKey(key){
    return (Store.data.importIssues || []).find(i => importIssueKey(i) === String(key));
  }

  function importIssueCnpj(i){
    const text = `${i?.detail || ''} ${i?.message || ''}`;
    const match = text.match(/CNPJ\s*([\d\.\/-]{11,18})/i) || text.match(/(\d{14})/);
    return match ? match[1] : '';
  }

  function importIssueNf(i){
    const text = `${i?.detail || ''} ${i?.fileName || ''}`;
    return (text.match(/NF\s*([\d\/-]+)/i) || [])[1] || '';
  }

  function importIssueStoreHint(i){
    const cnpj = importIssueCnpj(i);
    const store = cnpj ? matchStoreByCnpj(cnpj) : null;
    return store ? `${store.nome} • ${store.rede}` : '';
  }

  function encodeIssueKeyForAttr(key){
    return encodeURIComponent(String(key || ''));
  }

  function decodeIssueKeyFromAttr(token){
    try { return decodeURIComponent(String(token || '')); }
    catch(_) { return String(token || ''); }
  }

  function renderImportIssues(issues){
    return `<div class="bulk-actions-bar">
        <label class="inline-check"><input type="checkbox" onchange="App.setAllImportIssueSelection(this.checked)"> Selecionar todos</label>
        <button class="btn btn-sm btn-soft" type="button" onclick="App.copySelectedImportIssueDetails()">Copiar detalhes selecionados</button>
        <button class="btn btn-sm btn-soft" type="button" onclick="App.clearSelectedSimilarImportIssues()">Limpar erros iguais selecionados</button>
        <button class="btn btn-sm btn-danger" type="button" onclick="App.clearSelectedImportIssues()">Limpar selecionados</button>
      </div>
      <div class="table-wrap"><table><thead><tr><th class="select-col">Sel.</th><th>Data</th><th>Arquivo</th><th>Tipo</th><th>Divergência</th><th>Detalhe</th><th>Ação</th></tr></thead><tbody>
      ${issues.map(i=>{
        const key = importIssueKey(i);
        const encodedKey = encodeIssueKeyForAttr(key);
        const storeHint = importIssueStoreHint(i);
        return `<tr class="clickable-row import-issue-row" data-import-issue-row="1" data-issue-key="${escapeHtml(encodedKey)}" title="Clique para ver opções do erro">
          <td class="select-col"><input type="checkbox" class="import-issue-check" value="${escapeHtml(encodedKey)}" aria-label="Selecionar erro"></td>
          <td>${formatDateTime(i.createdAt)}</td>
          <td>${escapeHtml(i.fileName||'')}</td>
          <td>${escapeHtml(i.kind||'')}</td>
          <td><span class="badge red">${escapeHtml(i.message||'')}</span></td>
          <td>${escapeHtml(i.detail||'')}${storeHint ? `<div class="small positive">CNPJ já vinculado: ${escapeHtml(storeHint)}</div>` : ''}</td>
          <td><button class="btn btn-sm btn-soft" type="button" data-import-issue-action="open" data-issue-key="${escapeHtml(encodedKey)}">Opções</button></td>
        </tr>`;
      }).join('') || `<tr><td colspan="7" class="center muted">Sem divergências registradas.</td></tr>`}
    </tbody></table></div>`;
  }

  function clearImportIssues(){
    const total = (Store.data.importIssues || []).filter(i => ['PDF','XML'].includes(i.type)).length;
    if (!total) return toast('Não há divergências de XML/PDF para limpar.');
    if (!confirm(`Limpar ${total} divergência(s) de reconhecimento da tela?\n\nIsso remove apenas o histórico de erros. Não exclui XML/PDF importado, notas, entregas ou dados comerciais.`)) return;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => !['PDF','XML'].includes(i.type));
    Store.save().then(()=>{ toast('Histórico de erros limpo.'); render(); });
  }

  function cleanResolvedImportIssues(){
    const before = (Store.data.importIssues || []).length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => {
      if (!['PDF','XML'].includes(i.type)) return true;
      return importIssueStillRelevant(i);
    });
    const removed = before - (Store.data.importIssues || []).length;
    Store.save().then(()=>{ toast(removed ? `${removed} erro(s) corrigido(s) ocultado(s).` : 'Nenhum erro corrigido para ocultar.'); render(); });
  }

  function clearSingleImportIssue(key){
    const before = (Store.data.importIssues || []).length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => importIssueKey(i) !== String(key));
    if (Store.data.importIssues.length === before) return toast('Erro não encontrado.', 'warn');
    Store.save().then(()=>{ closeModal(); toast('Erro removido do histórico.'); render(); });
  }

  function clearImportIssuesByFile(key){
    const issue = findImportIssueByKey(key);
    if (!issue) return toast('Erro não encontrado.', 'warn');
    const fileName = issue.fileName || '';
    if (!fileName) return toast('Este erro não possui arquivo vinculado.', 'warn');
    if (!confirm(`Limpar todos os erros do arquivo:\n${fileName}?`)) return;
    const before = Store.data.importIssues.length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => i.fileName !== fileName);
    const removed = before - Store.data.importIssues.length;
    Store.save().then(()=>{ closeModal(); toast(`${removed} erro(s) removido(s) do arquivo.`); render(); });
  }

  function clearSimilarImportIssues(key){
    const issue = findImportIssueByKey(key);
    if (!issue) return toast('Erro não encontrado.', 'warn');
    const msg = issue.message || '';
    const cnpj = onlyDigits(importIssueCnpj(issue));
    const before = Store.data.importIssues.length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => {
      if ((i.message || '') !== msg) return true;
      if (cnpj) return onlyDigits(importIssueCnpj(i)) !== cnpj;
      return false;
    });
    const removed = before - Store.data.importIssues.length;
    Store.save().then(()=>{ closeModal(); toast(`${removed} erro(s) semelhante(s) removido(s).`); render(); });
  }

  function selectedImportIssueKeys(){
    return $$('.import-issue-check:checked').map(cb => decodeIssueKeyFromAttr(cb.value || '')).filter(Boolean);
  }

  function setAllImportIssueSelection(checked){
    $$('.import-issue-check').forEach(cb => { cb.checked = !!checked; });
  }

  async function clearSelectedImportIssues(){
    const keys = selectedImportIssueKeys();
    if (!keys.length) return toast('Selecione ao menos um erro.', 'warn');
    if (!confirm(`Limpar ${keys.length} erro(s) selecionado(s)?\n\nIsso remove apenas o histórico de erros. Não exclui XML/PDF, notas, entregas ou dados comerciais.`)) return;
    const keySet = new Set(keys.map(String));
    const before = (Store.data.importIssues || []).length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => !keySet.has(importIssueKey(i)));
    const removed = before - (Store.data.importIssues || []).length;
    await Store.save();
    toast(`${removed} erro(s) selecionado(s) limpo(s).`);
    render();
  }

  async function clearSelectedSimilarImportIssues(){
    const keys = selectedImportIssueKeys();
    if (!keys.length) return toast('Selecione ao menos um erro.', 'warn');
    const selected = keys.map(findImportIssueByKey).filter(Boolean);
    if (!selected.length) return toast('Erro selecionado não encontrado.', 'warn');
    if (!confirm(`Limpar erros iguais aos ${selected.length} selecionado(s)?\n\nQuando houver CNPJ no erro, serão limpos os erros do mesmo CNPJ e mesma divergência.`)) return;
    const patterns = selected.map(issue => ({message:issue.message || '', cnpj:onlyDigits(importIssueCnpj(issue)), fileName:issue.fileName || ''}));
    const before = (Store.data.importIssues || []).length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(issue => {
      return !patterns.some(p => {
        if ((issue.message || '') !== p.message) return false;
        if (p.cnpj) return onlyDigits(importIssueCnpj(issue)) === p.cnpj;
        return (issue.fileName || '') === p.fileName;
      });
    });
    const removed = before - (Store.data.importIssues || []).length;
    await Store.save();
    toast(`${removed} erro(s) igual(is) limpo(s).`);
    render();
  }

  function copySelectedImportIssueDetails(){
    const keys = selectedImportIssueKeys();
    if (!keys.length) return toast('Selecione ao menos um erro.', 'warn');
    const selected = keys.map(findImportIssueByKey).filter(Boolean);
    const text = selected.map(i => [
      `Arquivo: ${i.fileName || '—'}`,
      `Tipo: ${i.kind || i.type || '—'}`,
      `Divergência: ${i.message || '—'}`,
      `Detalhe: ${i.detail || '—'}`
    ].join('\n')).join('\n\n---\n\n');
    if (!text) return toast('Nenhum detalhe encontrado.', 'warn');
    navigator.clipboard?.writeText(text);
    toast(`${selected.length} detalhe(s) copiado(s).`);
  }

  function linkImportIssueCnpjToStore(key){
    const issue = findImportIssueByKey(key);
    if (!issue) return toast('Erro não encontrado.', 'warn');
    const cnpj = onlyDigits(importIssueCnpj(issue));
    const storeId = document.getElementById('issue-store-link-select')?.value || '';
    if (!cnpj) return toast('CNPJ não identificado nesse erro.', 'warn');
    if (!storeId) return toast('Selecione uma loja para vincular.', 'warn');
    const store = (Store.data.stores || []).find(s => s.id === storeId) || (window.DEFAULT_STORES || []).find(s => s.id === storeId);
    if (!store) return toast('Loja selecionada não encontrada no cadastro.', 'warn');

    Store.data.customCnpjStoreMap ||= {};
    Store.data.customCnpjStoreMap[cnpj] = storeId;

    Store.data.stores = enrichStoreCnpjs(mergeCadastroById(Store.data.stores || [], window.DEFAULT_STORES || []));
    Store.data.stores = (Store.data.stores || []).map(s => {
      if (s.id !== storeId) return s;
      const cnpjs = unique([...(s.cnpjs || []), cnpj].map(onlyDigits).filter(Boolean));
      return {...s, cnpj: s.cnpj || cnpj, cnpjs};
    });

    // Limpa da tela erros iguais do mesmo CNPJ, porque o vínculo já resolverá as próximas importações.
    const before = (Store.data.importIssues || []).length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => onlyDigits(importIssueCnpj(i)) !== cnpj);
    const removed = before - Store.data.importIssues.length;

    Store.save().then(() => {
      closeModal();
      toast(`CNPJ vinculado a ${store.nome}. ${removed} erro(s) desse CNPJ limpo(s). Importe o XML novamente para registrar as notas.`);
      render();
    });
  }

  function linkImportIssueProductToProduct(key){
    const issue = findImportIssueByKey(key);
    if (!issue) return toast('Erro não encontrado.', 'warn');
    const rawName = importIssueProductRaw(issue);
    const targetId = document.getElementById('issue-product-link-select')?.value || '';
    const product = productById(targetId);
    if (!rawName) return toast('Produto não identificado nesse erro.', 'warn');
    if (!product) return toast('Selecione o produto correto.', 'warn');

    const recs = nameReconciliationStore();
    const aliasKey = productAliasKeyFromRaw(rawName);
    recs.products[aliasKey] = {rawName, targetId:product.id, targetName:product.nomeSistema, createdAt:recs.products[aliasKey]?.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString(), user:state.session?.usuario || 'sistema'};
    const affected = applyManualNameReconciliations();
    const removed = clearProductIssuesByRaw(rawName);
    Store.save().then(() => {
      closeModal();
      toast(`Produto conciliado a ${product.nomeSistema}. ${fmt.format(affected)} registro(s) atualizado(s) e ${fmt.format(removed)} erro(s) igual(is) limpo(s).`);
      render();
    });
  }


  function importIssueStoreSelectHtml(){
    const stores = allKnownStoresForSelection();
    const options = stores
      .map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.rede)} • ${escapeHtml(s.nome)}</option>`)
      .join('');

    if (!options) {
      return `<div class="alert warn">Nenhuma loja carregada para vínculo. Atualize a página com Ctrl+F5 e confirme se o arquivo data/default-data.js foi enviado ao GitHub.</div>`;
    }

    return `<select id="issue-store-link-select"><option value="">Selecionar loja...</option>${options}</select>`;
  }

  function openImportIssueOptions(key){
    const issue = findImportIssueByKey(key);
    if (!issue) return toast('Erro não encontrado.', 'warn');
    const cnpj = importIssueCnpj(issue);
    const nf = importIssueNf(issue);
    const store = cnpj ? matchStoreByCnpj(cnpj) : null;
    const resolved = !importIssueStillRelevant(issue);
    openModal('Opções do erro', `
      <div class="issue-detail-box">
        <div><span>Data</span><strong>${formatDateTime(issue.createdAt)}</strong></div>
        <div><span>Arquivo</span><strong>${escapeHtml(issue.fileName || '—')}</strong></div>
        <div><span>Tipo</span><strong>${escapeHtml(issue.type || issue.kind || '—')}</strong></div>
        <div><span>Divergência</span><strong>${escapeHtml(issue.message || '—')}</strong></div>
        ${cnpj ? `<div><span>CNPJ identificado</span><strong>${escapeHtml(cnpj)}</strong></div>` : ''}
        ${nf ? `<div><span>NF</span><strong>${escapeHtml(nf)}</strong></div>` : ''}
        <div><span>Status atual</span><strong class="${resolved ? 'positive' : 'negative'}">${resolved ? 'Já parece corrigido pelo cadastro atual' : 'Ainda pendente de conferência'}</strong></div>
        ${store ? `<div><span>Loja pelo CNPJ</span><strong>${escapeHtml(store.nome)} • ${escapeHtml(store.rede)}</strong></div>` : ''}
      </div>
      ${cnpj && !store ? `
        <div class="panel" style="margin-top:14px">
          <div class="panel-head"><h4>Vincular CNPJ à loja</h4></div>
          <p class="muted small">Use esta opção quando o XML trouxer uma loja nova ou quando o cadastro local ainda não tiver o CNPJ. Depois de vincular, importe o XML novamente.</p>
          <div class="form-grid">
            <label>Loja correta${importIssueStoreSelectHtml()}</label>
          </div>
          <div class="footer-actions">
            <button class="btn" type="button" onclick="App.linkImportIssueCnpjToStore(${jsArg(key)})">Vincular CNPJ</button>
          </div>
        </div>
      ` : ''}
      ${cnpj && store ? `<div class="panel" style="margin-top:14px"><strong class="positive">Este CNPJ já está vinculado.</strong><p class="muted small">Limpe esse erro antigo e importe o XML novamente para registrar as notas com o cadastro atualizado.</p></div>` : ''}
      ${importIssueProductRaw(issue) ? `
        <div class="panel" style="margin-top:14px">
          <div class="panel-head"><h4>Conciliar produto não reconhecido</h4></div>
          <p class="muted small">Produto da importação: <strong>${escapeHtml(importIssueProductRaw(issue))}</strong>. Selecione o produto correto uma vez; todos os erros iguais serão resolvidos por essa conciliação.</p>
          <div class="form-grid">
            <label>Produto correto<select id="issue-product-link-select">${productSelectOptionsHtml(resolveManualProductAlias(importIssueProductRaw(issue), Store.data.products || [])?.id || '')}</select></label>
          </div>
          <div class="footer-actions">
            <button class="btn" type="button" onclick="App.linkImportIssueProductToProduct(${jsArg(key)})">Conciliar produto</button>
          </div>
        </div>
      ` : ''}
      <div style="margin-top:14px">
        <h4>Detalhe completo</h4>
        <p class="muted">${escapeHtml(issue.detail || 'Sem detalhe adicional.')}</p>
      </div>
      <div class="footer-actions">
        <button class="btn btn-soft" type="button" onclick="navigator.clipboard?.writeText(${jsArg(issue.detail || issue.message || '')});App.closeModal();">Copiar detalhe</button>
        <button class="btn btn-soft" type="button" onclick="App.clearSingleImportIssue(${jsArg(key)})">Limpar este erro</button>
        <button class="btn btn-soft" type="button" onclick="App.clearSimilarImportIssues(${jsArg(key)})">Limpar erros iguais</button>
        <button class="btn btn-danger" type="button" onclick="App.clearImportIssuesByFile(${jsArg(key)})">Limpar arquivo</button>
      </div>
      <p class="muted small">Limpar remove somente o registro do histórico de erros. Não apaga entregas, notas, XML/PDF ou dados comerciais.</p>
    `);
  }

  function fileExt(fileName){
    return String(fileName || '').split('.').pop().toLowerCase();
  }

  function getXmlNodes(root, tag){
    if (!root) return [];
    return Array.from(root.getElementsByTagNameNS ? root.getElementsByTagNameNS('*', tag) : root.getElementsByTagName(tag));
  }

  function getXmlNode(root, tag){
    return getXmlNodes(root, tag)[0] || null;
  }

  function getXmlText(root, tag){
    const node = getXmlNode(root, tag);
    return node ? String(node.textContent || '').trim() : '';
  }

  function xmlDate(value){
    const s = String(value || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    return parseDate(s);
  }

  function xmlFileDisplayName(fileName, entryName){
    return entryName ? `${fileName}/${entryName}` : fileName;
  }

  function matchXmlStore(dest, enderDest, redeHint=''){
    const cnpj = getXmlText(dest, 'CNPJ') || getXmlText(dest, 'CPF');
    const byCnpj = matchStoreByCnpj(cnpj, redeHint);
    if (byCnpj) return byCnpj;
    const combined = [
      getXmlText(dest, 'xNome'),
      cnpj,
      getXmlText(enderDest, 'xLgr'),
      getXmlText(enderDest, 'xBairro'),
      getXmlText(enderDest, 'xMun'),
      getXmlText(enderDest, 'UF')
    ].filter(Boolean).join(' ');
    return matchStore(combined, redeHint || inferRedeFromText(combined));
  }

  function xmlTextFromAny(root, tags){
    for (const tag of tags) {
      const value = getXmlText(root, tag);
      if (value) return value;
    }
    return '';
  }

  function normalizeXmlKey(value){
    return onlyDigits(value).slice(-44);
  }

  function xmlStatusInfo(doc){
    const prot = getXmlNode(doc, 'infProt') || getXmlNode(doc, 'protNFe');
    return {
      code: getXmlText(prot, 'cStat') || '',
      message: getXmlText(prot, 'xMotivo') || ''
    };
  }

  function extractXmlCancellationInfo(doc, fileName='', xmlText=''){
    const lowerName = String(fileName || '').toLowerCase();
    const tpEvento = getXmlText(doc, 'tpEvento');
    const descEvento = getXmlText(doc, 'descEvento');
    const status = getXmlText(doc, 'cStat');
    const motivo = getXmlText(doc, 'xMotivo');
    const isCancellation =
      tpEvento === '110111' ||
      /cancel/i.test(descEvento || '') ||
      /proccanc|cancnfe|cancel/i.test(lowerName) ||
      /cancelad/i.test(`${status} ${motivo} ${xmlText.slice(0,800)}`);

    if (!isCancellation) return {isCancellation:false};

    const chave = normalizeXmlKey(
      xmlTextFromAny(doc, ['chNFe']) ||
      String(fileName || '').match(/\d{44}/)?.[0] ||
      String(xmlText || '').match(/\b\d{44}\b/)?.[0] ||
      ''
    );
    const date = xmlDate(xmlTextFromAny(doc, ['dhEvento','dhRegEvento','dhRecbto','dEvento'])) || todayISO();
    const nfNumber = chave ? String(Number(chave.slice(25,34))).replace(/^0+/, '') || chave.slice(25,34) : '';
    return {
      isCancellation:true,
      chave,
      date,
      nfNumber,
      reason: xmlTextFromAny(doc, ['xJust','xMotivo','descEvento']) || 'Cancelamento de NF-e'
    };
  }

  function findDeliveriesByXmlKey(chave){
    const key = normalizeXmlKey(chave);
    if (!key) return [];
    return (Store.data.deliveries || []).filter(d => normalizeXmlKey(d.xmlKey || d.importKey || '') === key || String(d.importKey || '').includes(key));
  }

  function isXmlKeyCancelled(chave){
    const key = normalizeXmlKey(chave);
    if (!key) return false;
    return (Store.data.cancelledNfes || []).some(c => normalizeXmlKey(c.chave) === key);
  }

  function rememberCancelledNfe(info, fileLabel, batchId, rowsRemoved=[]){
    Store.data.cancelledNfes ||= [];
    const key = normalizeXmlKey(info.chave);
    if (!key) return;
    const existing = Store.data.cancelledNfes.find(c => normalizeXmlKey(c.chave) === key);
    const row = rowsRemoved[0] || {};
    const store = row.storeId ? storeById(row.storeId) : null;
    const payload = {
      chave:key,
      date: info.date || row.date || todayISO(),
      nfNumber: info.nfNumber || row.orderNumber || '',
      loja: store?.nome || info.storeName || 'Loja não identificada',
      storeId: row.storeId || info.storeId || '',
      rede: row.rede || info.rede || '',
      fileName:fileLabel,
      importBatchId:batchId,
      reason:info.reason || 'NF-e cancelada',
      removedItems: rowsRemoved.length,
      createdAt:new Date().toISOString()
    };
    if (existing) Object.assign(existing, payload);
    else Store.data.cancelledNfes.push(payload);
  }

  function rejectCancelledXml(info, fileName, batchId, entryName=''){
    const fileLabel = xmlFileDisplayName(fileName, entryName);
    const relatedRows = findDeliveriesByXmlKey(info.chave);
    const store = relatedRows[0]?.storeId ? storeById(relatedRows[0].storeId) : null;
    const date = info.date || relatedRows[0]?.date || todayISO();
    const loja = store?.nome || info.storeName || 'Loja não identificada';
    const rede = relatedRows[0]?.rede || store?.rede || info.rede || '';
    const orderNumber = relatedRows[0]?.orderNumber || info.nfNumber || info.chave || 'NF sem número';
    const importGroupKey = `${date}|${rede || 'REDE?'}|${store?.id || info.storeId || loja}|${orderNumber}`;

    if (relatedRows.length) {
      const keys = new Set(relatedRows.map(d => d.id));
      Store.data.deliveries = (Store.data.deliveries || []).filter(d => !keys.has(d.id));
    }
    rememberCancelledNfe({...info, date, storeName:loja, rede, storeId:store?.id || ''}, fileLabel, batchId, relatedRows);

    return {
      records:[],
      unmatched:[{
        kind:'NF cancelada',
        message:'NF cancelada rejeitada',
        detail:`NF cancelada rejeitada: ${formatDate(date)} | ${loja} | NF ${orderNumber}${info.reason ? ` | Motivo: ${info.reason}` : ''}${relatedRows.length ? ` | ${relatedRows.length} item(ns) removido(s)` : ' | NF ativa original não encontrada nesta base'}.`,
        importGroupKey
      }],
      noteFound:true,
      importGroupKey,
      cancelled:true
    };
  }

  function parseXmlDelivery(xmlText, fileName, batchId, redeHint='', entryName=''){
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('XML inválido ou mal formatado.');
    }

    const cancelInfo = extractXmlCancellationInfo(doc, xmlFileDisplayName(fileName, entryName), xmlText);
    if (cancelInfo.isCancellation) {
      return rejectCancelledXml(cancelInfo, fileName, batchId, entryName);
    }

    const infNFe = getXmlNode(doc, 'infNFe');
    const ide = getXmlNode(doc, 'ide');
    const dest = getXmlNode(doc, 'dest');
    const enderDest = dest ? getXmlNode(dest, 'enderDest') : null;
    const total = getXmlNode(doc, 'ICMSTot');
    const prot = getXmlNode(doc, 'infProt');
    const dets = getXmlNodes(doc, 'det');
    const fileLabel = xmlFileDisplayName(fileName, entryName);
    const unmatched = [];
    const records = [];

    const chave = (getXmlText(prot, 'chNFe') || (infNFe?.getAttribute('Id') || '').replace(/^NFe/i,'')).trim();
    const numero = getXmlText(ide, 'nNF') || chave || uid('nfe');
    const serie = getXmlText(ide, 'serie');
    const orderNumber = serie ? `${numero}/${serie}` : numero;
    const emissionRawDate = getXmlText(ide, 'dhEmi') || getXmlText(ide, 'dEmi');
    const exitRawDate = getXmlText(ide, 'dhSaiEnt') || getXmlText(ide, 'dSaiEnt');
    const emissionDate = xmlDate(emissionRawDate);
    const exitDate = xmlDate(exitRawDate);
    // Regra Só Folhas: em XML NF-e, a data comercial da entrega é SEMPRE a data de saída/entrada da NF-e.
    // A data de emissão fica apenas para auditoria e só é usada como fallback quando o XML não traz data de saída.
    const date = exitDate || emissionDate || todayISO();
    const xmlDateSource = exitDate ? 'DATA_SAIDA_XML' : (emissionDate ? 'EMISSAO_XML_FALLBACK' : 'SEM_DATA_XML');
    const statusInfo = xmlStatusInfo(doc);
    if (statusInfo.code && statusInfo.code !== '100') {
      const inactiveInfo = {
        isCancellation:true,
        chave: normalizeXmlKey(chave),
        date,
        nfNumber: numero,
        reason: statusInfo.message || `Status NF-e ${statusInfo.code}`
      };
      return rejectCancelledXml(inactiveInfo, fileName, batchId, entryName);
    }
    if (isXmlKeyCancelled(chave)) {
      const blockedInfo = {
        isCancellation:true,
        chave: normalizeXmlKey(chave),
        date,
        nfNumber: numero,
        reason: 'NF-e bloqueada porque já existe cancelamento importado'
      };
      return rejectCancelledXml(blockedInfo, fileName, batchId, entryName);
    }
    const destName = getXmlText(dest, 'xNome');
    const destCnpj = getXmlText(dest, 'CNPJ') || getXmlText(dest, 'CPF');
    const combinedText = [destName, destCnpj, getXmlText(enderDest, 'xLgr'), getXmlText(enderDest, 'xBairro'), getXmlText(enderDest, 'xMun'), getXmlText(enderDest, 'UF'), xmlText.slice(0,3000)].join(' ');
    let rede = redeHint || inferRedeFromText(combinedText);
    const store = matchXmlStore(dest, enderDest, rede);
    if (store) rede = store.rede;
    const importGroupKey = `${date}|${store?.rede || rede || 'REDE?'}|${store?.id || destCnpj || destName || 'LOJA?'}|${orderNumber}`;
    const noteFound = !!(chave || numero || dets.length || destName);

    if (!store && noteFound) {
      unmatched.push({
        kind:'Loja',
        message:'Loja não reconhecida',
        detail:`Loja não reconhecida no XML: ${destName || 'nome do destinatário não identificado'}${destCnpj ? ' | CNPJ ' + destCnpj : ''} (NF ${orderNumber}).`,
        importGroupKey
      });
      return {records, unmatched, noteFound, importGroupKey};
    }

    const xmlQtyTotal = dets.reduce((acc, det) => {
      const prod = getXmlNode(det, 'prod');
      return acc + toNumber(getXmlText(prod, 'qCom') || getXmlText(prod, 'qTrib'));
    }, 0);
    const invoiceTotal = toNumber(getXmlText(total, 'vNF'));

    for (const det of dets) {
      const prod = getXmlNode(det, 'prod');
      if (!prod) continue;
      const itemNumber = det.getAttribute('nItem') || '';
      const cProd = getXmlText(prod, 'cProd');
      const rawProduct = getXmlText(prod, 'xProd');
      const unitRaw = getXmlText(prod, 'uCom') || getXmlText(prod, 'uTrib') || 'UND';
      const unit = unitRaw.toUpperCase() === 'UN' ? 'UND' : unitRaw.toUpperCase();
      const qty = toNumber(getXmlText(prod, 'qCom') || getXmlText(prod, 'qTrib'));
      const grossValue = toNumber(getXmlText(prod, 'vProd'));
      const discount = toNumber(getXmlText(prod, 'vDesc'));
      const valueTotal = Math.max(0, grossValue - discount);
      const unitCostXml = toNumber(getXmlText(prod, 'vUnCom') || getXmlText(prod, 'vUnTrib'));
      const unitCost = qty > 0 && valueTotal > 0 ? valueTotal / qty : unitCostXml;
      const product = matchProduct(rawProduct) || matchProduct(`${cProd} ${rawProduct}`);

      if (!product) {
        unmatched.push({
          kind:'Produto',
          message:'Produto não reconhecido',
          detail:`Produto não reconhecido no XML: ${store?.nome || destName || 'loja?'} | ${rawProduct || cProd || 'sem descrição'}.`,
          importGroupKey
        });
        continue;
      }
      if (qty <= 0) {
        unmatched.push({kind:'Quantidade', message:'Quantidade inválida', detail:`Quantidade inválida no XML: ${store.nome} | ${rawProduct}.`, importGroupKey});
        continue;
      }
      if (unitCost <= 0) {
        unmatched.push({kind:'Custo', message:'Custo não identificado', detail:`Custo unitário não identificado no XML: ${store.nome} | ${rawProduct}.`, importGroupKey});
        continue;
      }

      const importKey = `XML|${chave || orderNumber}|${store.id}|${product.id}|${itemNumber || cProd || rawProduct}`;
      const d = {
        id: uid('del'),
        importKey,
        fileName:fileLabel,
        sourceFileName:fileName,
        sourceEntryName:entryName || '',
        sourceType:'XML',
        xmlKey:chave,
        itemNumber,
        pageNo:'',
        importBatchId: batchId,
        importGroupKey: `${date}|${store.rede}|${store.id}|${orderNumber}`,
        orderNumber,
        rede: store.rede,
        storeId: store.id,
        productId: product.id,
        productRaw: rawProduct || cProd,
        unit,
        date,
        deliveryDate: date,
        exitDate,
        emissionDate,
        xmlDateSource,
        qtyPdf: qty,
        noteQtyTotal: xmlQtyTotal > 0 ? xmlQtyTotal : 0,
        unitCost,
        valuePdf: valueTotal > 0 ? valueTotal : qty * unitCost,
        faltaQty: 0,
        qualidadeQty: 0,
        importedAt: new Date().toISOString()
      };
      records.push(d);
    }

    const importedValue = records.reduce((acc, d) => acc + toNumber(d.valuePdf), 0);
    if (invoiceTotal > 0 && records.length && Math.abs(importedValue - invoiceTotal) > 0.10) {
      unmatched.push({
        kind:'Valor',
        message:'Valor divergente',
        detail:`Valor da NF-e não confere no XML: ${store?.nome || destName || 'loja?'} | NF ${orderNumber} | XML ${money.format(invoiceTotal)} x sistema ${money.format(importedValue)}.`,
        importGroupKey
      });
    }
    const duplicateKey = deliveryDuplicateKeyFromParts('XML', chave, date, store.rede, store.id, orderNumber);
    const existingRows = findDeliveryRowsByDuplicateKey(duplicateKey);
    if (existingRows.length) {
      return {records:[], unmatched, noteFound, importGroupKey, duplicate:buildDeliveryDuplicate({sourceType:'XML', fileName:fileLabel, batchId, importGroupKey, duplicateKey, store, date, orderNumber, xmlKey:chave, newRows:records, existingRows})};
    }
    Store.data.deliveries.push(...records);
    return {records, unmatched, noteFound, importGroupKey};
  }

  function importGroupParts(key=''){
    const parts = String(key || '').split('|');
    return {date:parts[0] || '', rede:parts[1] || '', noteNumber:parts[2] || ''};
  }

  function registerImportIssues(parsed, fileName, batchId, type){
    parsed.unmatched.forEach(u => {
      const groupKey = u.importGroupKey || parsed.importGroupKey || '';
      const group = importGroupParts(groupKey);
      const issue = {
        id:uid('issue'),
        date: group.date || todayISO(),
        rede: group.rede || u.rede || parsed.rede || '',
        noteNumber: group.noteNumber || u.noteNumber || parsed.orderNumber || '',
        type,
        kind:u.kind || 'Reconhecimento',
        fileName,
        importBatchId:batchId,
        importGroupKey:groupKey,
        message:u.message || `Divergência no ${type}`,
        detail:u.detail,
        createdAt:new Date().toISOString()
      };
      const exists = (Store.data.importIssues || []).some(i => i.fileName === issue.fileName && i.message === issue.message && i.detail === issue.detail);
      if (!exists) Store.data.importIssues.push(issue);
    });
  }

  async function processPdfFiles(){
    const input = $('#pdfInput');
    const processBtn = $('#processPdf');
    const files = Array.from(input.files||[]);
    if (!files.length) return toast('Selecione ao menos um arquivo XML, PDF ou ZIP.', 'warn');
    const hasPdf = files.some(file => fileExt(file.name) === 'pdf');
    const hasZip = files.some(file => fileExt(file.name) === 'zip');
    if (hasPdf && !window.pdfjsLib) return toast('Biblioteca PDF ainda não carregou. Tente novamente.', 'error');
    if (hasZip && !window.JSZip) return toast('Biblioteca ZIP ainda não carregou. Tente novamente.', 'error');
    if (hasPdf || hasZip) {
      if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const redeHint = $('#pdfRede').value;
    const SAVE_EVERY_PAGES = 75;
    const YIELD_EVERY_PAGES = 3;
    let total = 0, notasLidas = 0, notasImportadas = 0, notasComDivergencia = 0, nfsCanceladasRejeitadas = 0, duplicidadesDetectadas = 0;
    let totalSteps = files.length, processedSteps = 0, totalPages = 0, processedPages = 0;
    const unmatched = [];
    const log = [];

    if (processBtn) {
      processBtn.disabled = true;
      processBtn.textContent = 'Importando...';
    }
    updatePdfProgress(0, 1, 'Preparando arquivos para importação...');

    try {
      // Não remove importações anteriores automaticamente.
      // Se o mesmo XML/PDF/ZIP for importado novamente, a duplicidade é registrada para decisão do operador.
      Store.data.importDuplicates ||= [];

      for (const file of files) {
        const ext = fileExt(file.name);
        const batchId = uid(ext === 'pdf' ? 'pdfimp' : ext === 'zip' ? 'zipxml' : 'xmlimp');

        if (ext === 'pdf') {
          const fileStats = {pages:0, itens:0, notas:0, divergencias:0};
          try {
            updatePdfProgress(processedSteps, Math.max(totalSteps, 1), `Abrindo PDF ${file.name}...`);
            const buf = await file.arrayBuffer();
            const doc = await pdfjsLib.getDocument({data:buf}).promise;
            totalPages += doc.numPages;
            totalSteps += doc.numPages - 1;
            fileStats.pages = doc.numPages;

            for (let pageNo=1; pageNo<=doc.numPages; pageNo++) {
              const page = await doc.getPage(pageNo);
              const content = await page.getTextContent();
              const lines = content.items.map(i=>i.str).join('\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
              const text = lines.join('\n');
              const rede = redeHint || inferRedeFromText(text);
              const parsed = parsePdfPage(text, lines, rede, file.name, pageNo, batchId);

              notasLidas += parsed.noteFound ? 1 : 0;
              notasImportadas += parsed.records.length ? 1 : 0;
              notasComDivergencia += parsed.unmatched.length ? 1 : 0;
              total += parsed.records.length;
              fileStats.itens += parsed.records.length;
              fileStats.notas += parsed.records.length ? 1 : 0;
              fileStats.divergencias += parsed.unmatched.length;
              unmatched.push(...parsed.unmatched.map(u=>u.detail));
              registerImportIssues(parsed, file.name, batchId, 'PDF');
              if (registerParsedDuplicate(parsed, file.name, batchId, 'PDF')) { duplicidadesDetectadas++; fileStats.divergencias += 0; }

              processedPages++;
              processedSteps++;
              updatePdfProgress(processedSteps, totalSteps, `${file.name} • página ${pageNo}/${doc.numPages} • ${fmt.format(total)} itens importados`);

              if (processedPages % SAVE_EVERY_PAGES === 0) {
                await Store.save();
                updatePdfProgress(processedSteps, totalSteps, `Salvando etapa ${Math.ceil(processedPages / SAVE_EVERY_PAGES)}... ${fmt.format(total)} itens já importados`);
              }
              if (processedPages % YIELD_EVERY_PAGES === 0) await yieldToBrowser();
            }
            log.push(`${file.name}: ${fileStats.pages} páginas, ${fileStats.notas} notas, ${fileStats.itens} itens importados${fileStats.divergencias ? ` • ${fileStats.divergencias} divergência(s)` : ''}.`);
            await Store.save();
          } catch(e) {
            console.error(e);
            log.push(`${file.name}: erro ${e.message}`);
            Store.data.importIssues.push({id:uid('issue'), type:'PDF', kind:'Erro de leitura', fileName:file.name, importBatchId:batchId, message:'Erro ao processar PDF', detail:e.message, createdAt:new Date().toISOString()});
            await Store.save();
          }
        } else if (ext === 'xml') {
          try {
            updatePdfProgress(processedSteps, totalSteps, `Lendo XML ${file.name}...`);
            const parsed = parseXmlDelivery(await file.text(), file.name, batchId, redeHint);
            notasLidas += parsed.noteFound ? 1 : 0;
            notasImportadas += parsed.records.length ? 1 : 0;
            notasComDivergencia += parsed.unmatched.length ? 1 : 0;
            nfsCanceladasRejeitadas += parsed.cancelled ? 1 : 0;
            total += parsed.records.length;
            unmatched.push(...parsed.unmatched.map(u=>u.detail));
            registerImportIssues(parsed, file.name, batchId, 'XML');
            if (registerParsedDuplicate(parsed, file.name, batchId, 'XML')) duplicidadesDetectadas++;
            log.push(`${file.name}: 1 XML, ${parsed.duplicate ? 'duplicidade enviada para conferência' : (parsed.cancelled ? 'NF cancelada rejeitada' : (parsed.records.length ? '1 NF-e ativa importada' : '0 NF-e importada'))}, ${parsed.records.length} itens${parsed.unmatched.length ? ` • ${parsed.unmatched.length} divergência(s)` : ''}.`);
            processedSteps++;
            updatePdfProgress(processedSteps, totalSteps, `${file.name} • ${fmt.format(total)} itens importados`);
            await Store.save();
          } catch(e) {
            console.error(e);
            log.push(`${file.name}: erro ${e.message}`);
            Store.data.importIssues.push({id:uid('issue'), type:'XML', kind:'Erro de leitura', fileName:file.name, importBatchId:batchId, message:'Erro ao processar XML', detail:e.message, createdAt:new Date().toISOString()});
            processedSteps++;
            await Store.save();
          }
        } else if (ext === 'zip') {
          try {
            updatePdfProgress(processedSteps, totalSteps, `Abrindo ZIP ${file.name}...`);
            const zip = await JSZip.loadAsync(file);
            const entries = Object.values(zip.files).filter(entry => !entry.dir && ['xml','pdf'].includes(fileExt(entry.name)));
            if (!entries.length) throw new Error('ZIP sem arquivos XML ou PDF.');
            totalSteps += entries.length - 1;
            let zipItens = 0, zipNotas = 0, zipDiv = 0, zipCancel = 0, zipPdf = 0, zipXml = 0;

            // Primeiro processa XMLs de NF-e ativa; depois processa XMLs de cancelamento.
            // Assim, se a NF ativa e o procCanc vierem no mesmo ZIP, a NF cancelada é removida no final.
            const xmlEntries = [];
            const cancelEntries = [];
            const pdfEntries = [];
            for (const entry of entries) {
              const entryExt = fileExt(entry.name);
              if (entryExt === 'pdf') { pdfEntries.push(entry); continue; }
              const xmlText = await entry.async('string');
              const probeDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
              const isCancel = !probeDoc.getElementsByTagName('parsererror').length && extractXmlCancellationInfo(probeDoc, entry.name, xmlText).isCancellation;
              (isCancel ? cancelEntries : xmlEntries).push({entry, xmlText});
            }

            for (const item of xmlEntries) {
              const entry = item.entry;
              const parsed = parseXmlDelivery(item.xmlText, file.name, batchId, redeHint, entry.name);
              notasLidas += parsed.noteFound ? 1 : 0;
              notasImportadas += parsed.records.length ? 1 : 0;
              notasComDivergencia += parsed.unmatched.length ? 1 : 0;
              nfsCanceladasRejeitadas += parsed.cancelled ? 1 : 0;
              total += parsed.records.length;
              zipItens += parsed.records.length;
              zipNotas += parsed.records.length ? 1 : 0;
              zipDiv += parsed.unmatched.length;
              zipCancel += parsed.cancelled ? 1 : 0;
              zipXml++;
              unmatched.push(...parsed.unmatched.map(u=>u.detail));
              registerImportIssues(parsed, xmlFileDisplayName(file.name, entry.name), batchId, 'XML');
              if (registerParsedDuplicate(parsed, xmlFileDisplayName(file.name, entry.name), batchId, 'XML')) duplicidadesDetectadas++;
              processedSteps++;
              updatePdfProgress(processedSteps, totalSteps, `${file.name} • ${entry.name} • ${fmt.format(total)} itens importados`);
              if (processedSteps % 50 === 0) await Store.save();
              if (processedSteps % 5 === 0) await yieldToBrowser();
            }

            for (const item of cancelEntries) {
              const entry = item.entry;
              const parsed = parseXmlDelivery(item.xmlText, file.name, batchId, redeHint, entry.name);
              notasLidas += parsed.noteFound ? 1 : 0;
              notasImportadas += parsed.records.length ? 1 : 0;
              notasComDivergencia += parsed.unmatched.length ? 1 : 0;
              nfsCanceladasRejeitadas += parsed.cancelled ? 1 : 0;
              total += parsed.records.length;
              zipItens += parsed.records.length;
              zipNotas += parsed.records.length ? 1 : 0;
              zipDiv += parsed.unmatched.length;
              zipCancel += parsed.cancelled ? 1 : 0;
              zipXml++;
              unmatched.push(...parsed.unmatched.map(u=>u.detail));
              registerImportIssues(parsed, xmlFileDisplayName(file.name, entry.name), batchId, 'XML');
              if (registerParsedDuplicate(parsed, xmlFileDisplayName(file.name, entry.name), batchId, 'XML')) duplicidadesDetectadas++;
              processedSteps++;
              updatePdfProgress(processedSteps, totalSteps, `${file.name} • ${entry.name} • NF cancelada rejeitada`);
              if (processedSteps % 50 === 0) await Store.save();
              if (processedSteps % 5 === 0) await yieldToBrowser();
            }

            for (const entry of pdfEntries) {
              if (!window.pdfjsLib) throw new Error('Biblioteca PDF ainda não carregou para ler PDFs dentro do ZIP.');
              zipPdf++;
              const displayName = xmlFileDisplayName(file.name, entry.name);
              const buf = await entry.async('arraybuffer');
              const doc = await pdfjsLib.getDocument({data:buf}).promise;
              totalSteps += doc.numPages - 1;
              for (let pageNo=1; pageNo<=doc.numPages; pageNo++) {
                const page = await doc.getPage(pageNo);
                const content = await page.getTextContent();
                const lines = content.items.map(i=>i.str).join('\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
                const text = lines.join('\n');
                const rede = redeHint || inferRedeFromText(text);
                const parsed = parsePdfPage(text, lines, rede, displayName, pageNo, batchId);
                notasLidas += parsed.noteFound ? 1 : 0;
                notasImportadas += parsed.records.length ? 1 : 0;
                notasComDivergencia += parsed.unmatched.length ? 1 : 0;
                total += parsed.records.length;
                zipItens += parsed.records.length;
                zipNotas += parsed.records.length ? 1 : 0;
                zipDiv += parsed.unmatched.length;
                unmatched.push(...parsed.unmatched.map(u=>u.detail));
                registerImportIssues(parsed, displayName, batchId, 'PDF');
                if (registerParsedDuplicate(parsed, displayName, batchId, 'PDF')) duplicidadesDetectadas++;
                processedSteps++;
                updatePdfProgress(processedSteps, totalSteps, `${displayName} • página ${pageNo}/${doc.numPages} • ${fmt.format(total)} itens importados`);
                if (processedSteps % 50 === 0) await Store.save();
                if (processedSteps % 3 === 0) await yieldToBrowser();
              }
            }
            log.push(`${file.name}: ${entries.length} arquivo(s) no ZIP (${zipXml} XML, ${zipPdf} PDF), ${zipNotas} NF-e/notas importadas, ${zipCancel} NF cancelada(s) rejeitada(s), ${zipItens} itens${zipDiv ? ` • ${zipDiv} divergência(s)` : ''}.`);
            await Store.save();
          } catch(e) {
            console.error(e);
            log.push(`${file.name}: erro ${e.message}`);
            Store.data.importIssues.push({id:uid('issue'), type:'XML', kind:'Erro de leitura', fileName:file.name, importBatchId:batchId, message:'Erro ao processar ZIP/XML', detail:e.message, createdAt:new Date().toISOString()});
            processedSteps++;
            await Store.save();
          }
        } else {
          processedSteps++;
          log.push(`${file.name}: formato ignorado. Use PDF, XML ou ZIP com XMLs/PDFs.`);
        }
        await yieldToBrowser();
      }

      await Store.save();
      const importTitle = duplicidadesDetectadas
        ? (notasImportadas || total ? 'Importação parcial: duplicidades recusadas' : 'Importação barrada por duplicidade')
        : 'Importação concluída';
      const duplicateNotice = duplicidadesDetectadas ? `
        <div class="duplicate-import-alert">
          <strong>${fmt.format(duplicidadesDetectadas)} duplicidade(s) encontrada(s).</strong>
          <p>As notas/XML/PDF duplicados <strong>NÃO foram importados nem somados</strong>. Eles foram enviados para a aba <strong>Duplicidades</strong> para decisão do operador.</p>
          <div class="footer-actions compact-actions"><button class="btn btn-primary" type="button" onclick="App.go('duplicidades')">Ver duplicidades</button></div>
        </div>` : '';
      $('#pdfImportLog').className = duplicidadesDetectadas ? 'empty duplicate-import-log' : 'empty';
      $('#pdfImportLog').innerHTML = `
        <strong>${importTitle}:</strong><br>
        Etapas processadas: <strong>${fmt.format(processedSteps)}</strong> • Notas/NF-e lidas: <strong>${fmt.format(notasLidas)}</strong> • Notas/NF-e importadas: <strong>${fmt.format(notasImportadas)}</strong> • Com divergência: <strong>${fmt.format(notasComDivergencia)}</strong> • Duplicidades recusadas: <strong>${fmt.format(duplicidadesDetectadas)}</strong> • NF cancelada rejeitada: <strong>${fmt.format(nfsCanceladasRejeitadas)}</strong> • Itens importados: <strong>${fmt.format(total)}</strong>
        ${duplicateNotice}
        <hr>${log.map(escapeHtml).join('<br>')}
        ${unmatched.length?`<hr><strong>Divergências:</strong><br>${unique(unmatched).slice(0,80).map(escapeHtml).join('<br>')}${unique(unmatched).length>80?'<br>... demais divergências ficam na tabela abaixo.':''}`:''}`;
      toast(duplicidadesDetectadas ? `${fmt.format(duplicidadesDetectadas)} duplicidade(s) recusada(s). Decida na aba Duplicidades.` : `${fmt.format(notasImportadas)} notas/NF-e e ${fmt.format(total)} itens importados.`);
      render();
    } finally {
      if (processBtn) {
        processBtn.disabled = false;
        processBtn.textContent = 'Ler e importar arquivos';
      }
    }
  }

  function parsePdfNumberColumns(tokens){
    const values = (tokens || []).map(toNumber).filter(n => Number.isFinite(n));
    if (values.length < 3) return {qty:0, unitCost:0, valueTotal:0, confidence:'missing'};

    const closeEnough = (a,b,tolerance=0.05) => Math.abs(a-b) <= Math.max(0.05, Math.abs(b) * tolerance);
    const validStructured = (qty, unitCost, subtotal, valueTotal) => {
      if (qty <= 0 || unitCost <= 0 || valueTotal <= 0) return false;
      const expected = qty * unitCost;
      const base = subtotal > 0 ? subtotal : valueTotal;
      return closeEnough(expected, base, 0.05);
    };

    // Layout padrão do PDF Só Folhas:
    // VOL, QTD, VR. UNIT., VR. SUB., VR. DESC., VR. DESC. UNIT., VR. TOTAL.
    // A versão anterior tentava encontrar a melhor multiplicação em todos os números
    // do trecho. No último produto da página, isso pegava números do rodapé/pedido
    // e aumentava o valor total da nota. Aqui damos prioridade à posição real das colunas.
    if (values.length >= 7) {
      const qty = values[1];
      const unitCost = values[2];
      const subtotal = values[3];
      const valueTotal = values[6];
      if (validStructured(qty, unitCost, subtotal, valueTotal)) {
        return {qty, unitCost, valueTotal, confidence:'structured-7'};
      }
    }

    // Layout sem coluna VOL: QTD, VR. UNIT., VR. SUB., DESC., DESC. UNIT., TOTAL.
    if (values.length >= 6) {
      const qty = values[0];
      const unitCost = values[1];
      const subtotal = values[2];
      const valueTotal = values[5];
      if (validStructured(qty, unitCost, subtotal, valueTotal)) {
        return {qty, unitCost, valueTotal, confidence:'structured-6'};
      }
    }

    // Layout reduzido com VOL: VOL, QTD, VR. UNIT., TOTAL.
    if (values.length >= 4) {
      const qty = values[1];
      const unitCost = values[2];
      const valueTotal = values[3];
      if (validStructured(qty, unitCost, valueTotal, valueTotal)) {
        return {qty, unitCost, valueTotal, confidence:'structured-4'};
      }
    }

    // Layout mínimo: QTD, VR. UNIT., TOTAL.
    if (values.length >= 3) {
      const qty = values[0];
      const unitCost = values[1];
      const valueTotal = values[2];
      if (validStructured(qty, unitCost, valueTotal, valueTotal)) {
        return {qty, unitCost, valueTotal, confidence:'structured-3'};
      }
    }

    // Fallback conservador: usa os três últimos números apenas quando nada estruturado funcionou.
    const tail = values.slice(-3);
    let qty = tail[0] || 0;
    const unitCost = tail[1] || 0;
    const valueTotal = tail[2] || 0;
    if (qty <= 0 && unitCost > 0 && valueTotal > 0) qty = valueTotal / unitCost;
    return {qty, unitCost, valueTotal, confidence:'fallback'};
  }

  function parsePdfTotalQtyToken(token){
    const s = String(token || '').trim();
    if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) return Number(s.replace(/\./g,''));
    return toNumber(s);
  }

  function extractPdfNoteTotals(pageText){
    const source = String(pageText || '').replace(/\s+/g,' ').trim();
    const footerMatch = source.match(/\bItens:\s*\d+\s+Vr\.\s*frete([\s\S]+?)(?:\bASSINATURA\b|\bEstamos de acordo\b|$)/i);
    const footer = footerMatch ? footerMatch[1] : '';
    const totalMatch = source.match(/\bTotal:\s*([\d.]+,\d{2})/i);
    const valueTotal = totalMatch ? toNumber(totalMatch[1]) : 0;
    if (!footer) return {qty:0, valueTotal};
    const beforeTotal = footer.split(/\bTotal:/i)[0] || footer;
    const tokens = beforeTotal.match(/\d{1,3}(?:\.\d{3})+(?!,)|\d+(?:,\d+)?/g) || [];
    const qtyCandidates = tokens
      .map(t => ({raw:t, value:parsePdfTotalQtyToken(t)}))
      .filter(t => t.value > 0 && Math.abs(t.value - Math.round(t.value)) < 0.001);
    const qty = qtyCandidates.length ? qtyCandidates[qtyCandidates.length - 1].value : 0;
    return {qty, valueTotal};
  }

  function cleanPdfProductName(name){
    return String(name || '')
      .replace(/\b(COD|CODIGO|DESCRICAO|DESCRIÇÃO|PRODUTO|ITEM)\b/gi,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function extractPdfItems(pageText){
    let text = String(pageText || '').replace(/\s+/g,' ').trim();

    // Trabalha somente dentro da tabela de produtos.
    // Sem esse corte, o último item da página herdava números do rodapé
    // como "Itens", "Total" e número do pedido, alterando o valor final do PDF.
    const headerMatch = text.match(/(?:ITEM\/PRODUTO|UNIT\.\s*VR\.\s*TOTAL)/i);
    if (headerMatch && typeof headerMatch.index === 'number') {
      text = text.slice(headerMatch.index + headerMatch[0].length).trim();
    }

    const endIndexes = [
      text.search(/\bItens:\s*\d+\b/i),
      text.search(/\bASSINATURA\b/i),
      text.search(/\bEstamos de acordo\b/i),
      text.search(/\bTotal:\s*[\d.,]+/i)
    ].filter(i => i >= 0);
    if (endIndexes.length) text = text.slice(0, Math.min(...endIndexes)).trim();

    const numberPattern = /\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?/g;
    const itemStart = /(?:^|\s)(\d{3})\s+(\d{3,6})\s+/g;
    const starts = [];
    let startMatch;
    while ((startMatch = itemStart.exec(text)) !== null) {
      starts.push({
        index:startMatch.index + (startMatch[0].startsWith(' ') ? 1 : 0),
        contentStart:itemStart.lastIndex,
        itemCode:startMatch[1],
        productCode:startMatch[2]
      });
    }

    const items = [];
    for (let idx = 0; idx < starts.length; idx++) {
      const current = starts[idx];
      const nextIndex = starts[idx + 1]?.index || text.length;
      const segment = text.slice(current.contentStart, nextIndex).trim();
      const unitMatch = segment.match(/^(.+?)\s*-\s*(UN|UND|BDJ|KG|CX|PC)\b([\s\S]*)$/i);
      if (!unitMatch) continue;

      const rawProduct = cleanPdfProductName(unitMatch[1]);
      const unit = unitMatch[2].toUpperCase() === 'UN' ? 'UND' : unitMatch[2].toUpperCase();
      const tail = unitMatch[3] || '';
      const numericTokens = tail.match(numberPattern) || [];
      const cols = parsePdfNumberColumns(numericTokens);

      if (!rawProduct || !numericTokens.length) continue;
      items.push({
        rawProduct,
        unit,
        qty: cols.qty,
        unitCost: cols.unitCost,
        valueTotal: cols.valueTotal,
        confidence: cols.confidence
      });
    }

    // Fallback para PDFs onde o texto sai sem blocos estáveis por item.
    if (!items.length) {
      const productRegex = /(\d{3})\s+(\d{3,6})\s+(.+?)\s*-\s*(UN|UND|BDJ|KG|CX|PC)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/gi;
      let m;
      while ((m = productRegex.exec(text)) !== null) {
        const cols = parsePdfNumberColumns([m[5], m[6], m[7]]);
        items.push({
          rawProduct: cleanPdfProductName(m[3]),
          unit: m[4].toUpperCase() === 'UN' ? 'UND' : m[4].toUpperCase(),
          qty: cols.qty,
          unitCost: cols.unitCost,
          valueTotal: cols.valueTotal,
          confidence: cols.confidence
        });
      }
    }

    return items;
  }

  function parsePdfPage(text, lines, rede, fileName, pageNo, batchId){
    const fantasia = (text.match(/Fantasia:\s*(.+?)(?:\s+I\.E\.|\n|Endereço)/i)||[])[1] || '';
    const dataSaida = parseDate((text.match(/Data Sa[ií]da\.?:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)||[])[1]);
    const pedido = (text.match(/PEDIDO\s*\n?\s*([0-9]+(?:\s*\/\s*[0-9]+)?)/i)||[])[1]?.replace(/\s/g,'') || uid('pedido');
    const invoiceTotal = toNumber((text.match(/Valor R\$\s*([\d.,]+)/i)||text.match(/Total:\s*([\d.,]+)/i)||[])[1]);
    const noteTotals = extractPdfNoteTotals(`${text} ${lines.join(' ')}`);
    const invoiceQty = toNumber(noteTotals.qty);
    const store = matchStore(fantasia, rede);
    const unmatched = [];
    const records = [];
    const pageText = lines.join(' ');
    const foundItems = extractPdfItems(pageText);
    const noteFound = !!fantasia || foundItems.length > 0 || /PEDIDO/i.test(text);
    const importGroupKey = `${dataSaida || todayISO()}|${store?.rede || rede || 'REDE?'}|${store?.id || fantasia || 'LOJA?'}|${pedido}`;

    if (!store && noteFound) {
      unmatched.push({
        kind:'Loja',
        message:'Loja não reconhecida',
        detail:`Loja não reconhecida no PDF: ${fantasia || 'nome da loja não identificado'} (pedido ${pedido}, página ${pageNo}).`,
        importGroupKey
      });
      return {records, unmatched, noteFound, importGroupKey};
    }

    for (const item of foundItems) {
      const rawProduct = item.rawProduct;
      let qty = toNumber(item.qty);
      const unitCost = toNumber(item.unitCost);
      const valueTotal = toNumber(item.valueTotal);
      if (qty <= 0 && unitCost > 0 && valueTotal > 0) qty = valueTotal / unitCost;
      if (!qty && !unitCost) continue;
      const product = matchProduct(rawProduct);
      if (!product) {
        unmatched.push({
          kind:'Produto',
          message:'Produto não reconhecido',
          detail:`Produto não reconhecido no PDF: ${fantasia || store?.nome || 'loja?'} | ${rawProduct}.`,
          importGroupKey
        });
        continue;
      }
      if (qty <= 0) {
        unmatched.push({
          kind:'Quantidade',
          message:'Quantidade inválida',
          detail:`Quantidade inválida no PDF: ${store.nome} | ${rawProduct}.`,
          importGroupKey
        });
        continue;
      }
      if (unitCost <= 0) {
        unmatched.push({
          kind:'Custo',
          message:'Custo não identificado',
          detail:`Custo unitário não identificado no PDF: ${store.nome} | ${rawProduct}.`,
          importGroupKey
        });
        continue;
      }
      const id = `${pedido}|${store.id}|${product.id}|${dataSaida}|${qty}|${unitCost}`;
      const d = {
        id: uid('del'),
        importKey:id,
        fileName, pageNo,
        importBatchId: batchId,
        importGroupKey: `${dataSaida || todayISO()}|${store.rede}|${store.id}|${pedido}`,
        orderNumber:pedido,
        rede: store.rede,
        storeId: store.id,
        productId: product.id,
        productRaw: rawProduct,
        unit:item.unit,
        date: dataSaida || todayISO(),
        qtyPdf: qty,
        noteQtyTotal: invoiceQty > 0 ? invoiceQty : 0,
        unitCost,
        valuePdf: valueTotal > 0 ? valueTotal : qty*unitCost,
        faltaQty: 0,
        qualidadeQty: 0,
        importedAt: new Date().toISOString()
      };
      records.push(d);
    }
    const importedQty = records.reduce((sum,d)=>sum + toNumber(d.qtyPdf), 0);
    if (invoiceQty > 0 && records.length && Math.abs(importedQty - invoiceQty) > 0.01) {
      unmatched.push({
        kind:'Quantidade',
        message:'Quantidade divergente',
        detail:`Quantidade da nota não confere no PDF: ${store?.nome || fantasia || 'loja?'} | pedido ${pedido} | PDF ${fmt.format(invoiceQty)} x sistema ${fmt.format(importedQty)}.`,
        importGroupKey
      });
    }
    const importedValue = records.reduce((sum,d)=>sum + toNumber(d.valuePdf), 0);
    if (invoiceTotal > 0 && records.length && Math.abs(importedValue - invoiceTotal) > 0.10) {
      unmatched.push({
        kind:'Valor',
        message:'Valor divergente',
        detail:`Valor da nota não confere no PDF: ${store?.nome || fantasia || 'loja?'} | pedido ${pedido} | PDF ${money.format(invoiceTotal)} x sistema ${money.format(importedValue)}.`,
        importGroupKey
      });
    }
    const duplicateKey = deliveryDuplicateKeyFromParts('PDF', '', dataSaida || todayISO(), store.rede, store.id, pedido);
    const existingRows = findDeliveryRowsByDuplicateKey(duplicateKey);
    if (existingRows.length) {
      return {records:[], unmatched, noteFound, importGroupKey, duplicate:buildDeliveryDuplicate({sourceType:'PDF', fileName, batchId, importGroupKey, duplicateKey, store, date:dataSaida || todayISO(), orderNumber:pedido, xmlKey:'', newRows:records, existingRows})};
    }
    Store.data.deliveries.push(...records);
    return {records, unmatched, noteFound, importGroupKey};
  }


  function duplicateRows(){
    return (Store.data.importDuplicates || []).slice().sort((a,b)=>{
      const pa = a.status === 'PENDENTE' ? 0 : 1;
      const pb = b.status === 'PENDENTE' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function renderImportDuplicates(){
    setTitle('Duplicidades de Importação', 'Notas, XML/PDF e bases de venda repetidas ficam recusadas aqui até decisão do operador.');
    const rows = duplicateRows();
    const pending = rows.filter(d => d.status === 'PENDENTE');
    const deliveryPending = pending.filter(d => d.scope === 'DELIVERY');
    const salesPending = pending.filter(d => d.scope === 'SALES');
    $('#viewRoot').innerHTML = `
      <div class="grid kpis">
        ${kpi('⧉','Pendentes',fmt.format(pending.length),'aguardando decisão', pending.length ? 'amber' : 'green')}
        ${kpi('▣','XML/PDF',fmt.format(deliveryPending.length),'notas duplicadas')}
        ${kpi('▤','Base de Vendas',fmt.format(salesPending.length),'períodos conflitantes')}
        ${kpi('✓','Resolvidas',fmt.format(rows.length - pending.length),'decididas pelo operador')}
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Duplicidades encontradas</h3>
            <p class="muted">O sistema não soma duplicidades automaticamente. Escolha manter a importação atual, substituir pela nova ou importar apenas datas novas quando for Base de Vendas.</p>
          </div>
        </div>
        <div class="bulk-actions-bar">
          <label class="inline-check"><input type="checkbox" onchange="App.setAllImportDuplicateSelection(this.checked)"> Selecionar todos</label>
          <button class="btn btn-sm btn-soft" type="button" onclick="App.resolveSelectedImportDuplicates('keep')">Manter atual selecionados</button>
          <button class="btn btn-sm btn-primary" type="button" onclick="App.resolveSelectedImportDuplicates('replace')">Substituir pela nova selecionados</button>
          <button class="btn btn-sm btn-soft" type="button" onclick="App.resolveSelectedImportDuplicates('new-dates')">Importar só datas novas</button>
          <button class="btn btn-sm btn-danger" type="button" onclick="App.clearSelectedImportDuplicates()">Excluir/limpar selecionados</button>
        </div>
        ${renderDuplicatesTable(rows)}
      </div>`;
  }

  function renderDuplicatesTable(rows){
    return `<div class="table-wrap"><table>
      <thead><tr><th class="select-col">Sel.</th><th>Status</th><th>Tipo</th><th>Data/período</th><th>Rede / Loja</th><th>Nota/NF ou arquivo</th><th class="num">Atual</th><th class="num">Nova</th><th>Ações</th></tr></thead>
      <tbody>${rows.map(d => {
        const type = d.scope === 'SALES' ? 'Base de Vendas' : (d.type || 'XML/PDF');
        const dateLabel = d.scope === 'SALES' ? `${formatDate(d.dateFrom)} a ${formatDate(d.dateTo)}` : formatDate(d.date);
        const place = d.scope === 'SALES' ? escapeHtml(d.rede || 'Todas') : `${escapeHtml(d.rede || '')}<br><span class="muted small">${escapeHtml(d.storeName || storeById(d.storeId)?.nome || 'Loja')}</span>`;
        const ref = d.scope === 'SALES' ? escapeHtml(d.fileName || '') : `${escapeHtml(d.noteNumber || 'NF/nota')}<br><span class="muted small">${escapeHtml(d.fileName || '')}</span>`;
        const current = d.scope === 'SALES' ? `${fmt.format(d.current?.records || 0)} reg.<br><span class="muted small">${fmt.format(d.current?.qty || 0)} und</span>` : `${fmt.format(d.current?.records || 0)} itens<br><span class="muted small">${money.format(d.current?.value || 0)}</span>`;
        const incoming = d.scope === 'SALES' ? `${fmt.format(d.incoming?.records || 0)} reg.<br><span class="muted small">${fmt.format(d.incoming?.qty || 0)} und</span>` : `${fmt.format(d.incoming?.records || 0)} itens<br><span class="muted small">${money.format(d.incoming?.value || 0)}</span>`;
        return `<tr>
          <td class="select-col"><input type="checkbox" class="import-duplicate-check" value="${escapeHtml(d.id)}" aria-label="Selecionar duplicidade"></td>
          <td><span class="badge ${duplicateStatusClass(d.status)}">${duplicateStatusText(d.status)}</span></td>
          <td>${type}</td>
          <td>${dateLabel}</td>
          <td>${place}</td>
          <td>${ref}</td>
          <td class="num">${current}</td>
          <td class="num">${incoming}</td>
          <td>${renderDuplicateActions(d)}</td>
        </tr>`;
      }).join('') || `<tr><td colspan="9" class="center muted">Nenhuma duplicidade registrada.</td></tr>`}</tbody>
    </table></div>`;
  }

  function renderDuplicateActions(d){
    const id = escapeHtml(d.id);
    const detail = `<button class="btn btn-sm btn-soft" onclick="App.openImportDuplicate('${id}')">Ver comparação</button>`;
    if (d.status !== 'PENDENTE') return detail;
    if (d.scope === 'SALES') {
      return `<div class="action-stack">${detail}<button class="btn btn-sm btn-soft" onclick="App.resolveImportDuplicate('${id}','keep')">Manter atual</button><button class="btn btn-sm btn-primary" onclick="App.resolveImportDuplicate('${id}','replace')">Substituir pela nova</button><button class="btn btn-sm btn-soft" onclick="App.resolveImportDuplicate('${id}','new-dates')">Importar só datas novas</button></div>`;
    }
    return `<div class="action-stack">${detail}<button class="btn btn-sm btn-soft" onclick="App.resolveImportDuplicate('${id}','keep')">Manter atual</button><button class="btn btn-sm btn-primary" onclick="App.resolveImportDuplicate('${id}','replace')">Substituir pela nova</button></div>`;
  }

  function openImportDuplicate(id){
    const dup = (Store.data.importDuplicates || []).find(d => d.id === id);
    if (!dup) return toast('Duplicidade não encontrada.', 'error');
    const isSales = dup.scope === 'SALES';
    const conflictDates = (dup.conflictDates || []).map(formatDate).join(', ') || '—';
    const body = `
      <div class="grid two">
        <div class="panel"><h4>Importação atual</h4><p><strong>${isSales ? fmt.format(dup.current?.records || 0) + ' registros' : fmt.format(dup.current?.records || 0) + ' itens'}</strong></p><p class="muted small">Qtd: ${fmt.format(dup.current?.qty || 0)}${!isSales ? ` • Valor: ${money.format(dup.current?.value || 0)}` : ''}</p></div>
        <div class="panel"><h4>Nova importação recusada</h4><p><strong>${isSales ? fmt.format(dup.incoming?.records || 0) + ' registros' : fmt.format(dup.incoming?.records || 0) + ' itens'}</strong></p><p class="muted small">Qtd: ${fmt.format(dup.incoming?.qty || 0)}${!isSales ? ` • Valor: ${money.format(dup.incoming?.value || 0)}` : ''}</p></div>
      </div>
      <div class="panel" style="margin-top:12px">
        <p><strong>Tipo:</strong> ${isSales ? 'Base de Vendas' : escapeHtml(dup.type || 'XML/PDF')}</p>
        <p><strong>Arquivo novo:</strong> ${escapeHtml(dup.fileName || '')}</p>
        <p><strong>Rede/Loja:</strong> ${escapeHtml(dup.rede || '')} ${dup.storeName ? ' • ' + escapeHtml(dup.storeName) : ''}</p>
        <p><strong>Nota/NF ou período:</strong> ${isSales ? `${formatDate(dup.dateFrom)} a ${formatDate(dup.dateTo)}` : escapeHtml(dup.noteNumber || dup.xmlKey || '')}</p>
        ${isSales ? `<p><strong>Datas conflitantes:</strong> ${conflictDates}</p>` : ''}
        <p><strong>Status:</strong> ${duplicateStatusText(dup.status)}</p>
        ${dup.resolvedAt ? `<p><strong>Decidido por:</strong> ${escapeHtml(dup.resolvedBy || '')} em ${formatDateTime(dup.resolvedAt)}</p>` : ''}
        <p class="muted small">${escapeHtml(dup.message || '')}</p>
      </div>
      ${dup.status === 'PENDENTE' ? `<div class="footer-actions">${isSales ? `<button class="btn btn-soft" onclick="App.resolveImportDuplicate('${dup.id}','keep')">Manter atual</button><button class="btn btn-primary" onclick="App.resolveImportDuplicate('${dup.id}','replace')">Substituir pela nova</button><button class="btn btn-soft" onclick="App.resolveImportDuplicate('${dup.id}','new-dates')">Importar só datas novas</button>` : `<button class="btn btn-soft" onclick="App.resolveImportDuplicate('${dup.id}','keep')">Manter atual</button><button class="btn btn-primary" onclick="App.resolveImportDuplicate('${dup.id}','replace')">Substituir pela nova</button>`}</div>` : ''}`;
    openModal('Comparação da duplicidade', body);
  }

  function removeCurrentDeliveryDuplicateRows(dup){
    const key = dup.duplicateKey;
    const before = (Store.data.deliveries || []).length;
    Store.data.deliveries = (Store.data.deliveries || []).filter(row => deliveryDuplicateKeyFromRow(row) !== key);
    return before - (Store.data.deliveries || []).length;
  }

  function salesRowsForDuplicate(dup, mode){
    const rows = sanitizeRowsForDuplicate(dup.pendingRows || []);
    if (mode === 'new-dates') {
      const conflict = new Set(dup.conflictKeys || []);
      return rows.filter(r => !conflict.has(salesConflictKey(r)));
    }
    return rows;
  }

  function appendSalesDuplicateImport(dup, mode){
    const rows = salesRowsForDuplicate(dup, mode);
    if (!rows.length) return 0;
    const importId = dup.newImportId || uid('sales');
    const importedAt = new Date().toISOString();
    const finalRows = rows.map((r, idx) => ({...r, id:`${importId}_${idx+1}`, importId, fileName:dup.fileName, importedAt}));
    appendSalesRows(finalRows);
    const range = salesImportDateRange(finalRows);
    Store.data.salesImports ||= [];
    Store.data.salesImports.push({
      ...(dup.importSummary || {}),
      id:importId,
      fileName:dup.fileName,
      importedAt,
      dateFrom:range.from,
      dateTo:range.to,
      dates:range.dates,
      records:finalRows.length,
      sourceRecords:finalRows.reduce((a,r)=>a+toNumber(r.sourceRecords || 1),0),
      qtyTotal:finalRows.reduce((a,r)=>a+toNumber(r.qty),0),
      resolvedFromDuplicateId:dup.id,
      duplicateDecision:mode
    });
    Store.data.importIssues ||= [];
    Store.data.importIssues.push(...(dup.pendingIssues || []).map(i => ({...i, id:uid('issue'), importId, source:'BASE_VENDA', createdAt:importedAt})));
    return finalRows.length;
  }

  function selectedImportDuplicateIds(){
    return $$('.import-duplicate-check:checked').map(cb => cb.value).filter(Boolean);
  }

  function setAllImportDuplicateSelection(checked){
    $$('.import-duplicate-check').forEach(cb => { cb.checked = !!checked; });
  }

  function importDuplicateActionLabel(action){
    if (action === 'replace') return 'substituir pela nova importação';
    if (action === 'new-dates') return 'importar apenas datas novas';
    return 'manter a importação atual';
  }

  function applyImportDuplicateDecision(dup, action){
    let resultMessage = '';
    if (dup.scope === 'DELIVERY' && action === 'replace') {
      const removed = removeCurrentDeliveryDuplicateRows(dup);
      const rows = sanitizeRowsForDuplicate(dup.pendingRows || []).map(r => ({...r, id:uid('del'), importedAt:new Date().toISOString()}));
      Store.data.deliveries ||= [];
      Store.data.deliveries.push(...rows);
      dup.status = 'SUBSTITUIDA_PELA_NOVA';
      resultMessage = `${fmt.format(removed)} item(ns) antigo(s) removido(s) e ${fmt.format(rows.length)} novo(s) importado(s).`;
    } else if (dup.scope === 'SALES' && action === 'replace') {
      const conflict = new Set(dup.conflictKeys || []);
      const before = (Store.data.sales || []).length;
      Store.data.sales = (Store.data.sales || []).filter(row => !conflict.has(salesConflictKey(row)) && !(dup.sameFileImportIds || []).includes(row.importId || row.fileId));
      const removed = before - (Store.data.sales || []).length;
      const added = appendSalesDuplicateImport(dup, 'replace');
      recalcSalesImportSummaries(Store.data);
      Store.data.salesImports = (Store.data.salesImports || []).filter(i => toNumber(i.records) > 0 || i.id === (dup.newImportId || ''));
      dup.status = 'SUBSTITUIDA_PELA_NOVA';
      resultMessage = `${fmt.format(removed)} registro(s) antigo(s) removido(s) e ${fmt.format(added)} novo(s) importado(s).`;
    } else if (dup.scope === 'SALES' && action === 'new-dates') {
      const added = appendSalesDuplicateImport(dup, 'new-dates');
      dup.status = 'IMPORTADAS_DATAS_NOVAS';
      resultMessage = added ? `${fmt.format(added)} registro(s) de datas novas importado(s).` : 'Não havia datas novas para importar.';
    } else {
      dup.status = 'MANTIDA_ATUAL';
      resultMessage = 'A importação atual foi mantida e a nova ficou recusada.';
    }
    dup.resolvedAt = new Date().toISOString();
    dup.resolvedBy = state.session?.usuario || 'sistema';
    dup.resolutionAction = action;
    dup.resolutionNote = resultMessage;
    return resultMessage;
  }

  async function resolveImportDuplicate(id, action){
    const dup = (Store.data.importDuplicates || []).find(d => d.id === id);
    if (!dup) return toast('Duplicidade não encontrada.', 'error');
    if (dup.status !== 'PENDENTE') return toast('Essa duplicidade já foi decidida.', 'warn');
    const label = importDuplicateActionLabel(action);
    if (!confirm(`Confirmar decisão: ${label}?`)) return;
    const resultMessage = applyImportDuplicateDecision(dup, action);
    await Store.save();
    closeModal();
    toast(`Duplicidade resolvida. ${resultMessage}`);
    render();
  }

  async function resolveSelectedImportDuplicates(action){
    const ids = selectedImportDuplicateIds();
    if (!ids.length) return toast('Selecione ao menos uma duplicidade.', 'warn');
    let selected = (Store.data.importDuplicates || []).filter(d => ids.includes(d.id));
    const alreadyResolved = selected.filter(d => d.status !== 'PENDENTE').length;
    selected = selected.filter(d => d.status === 'PENDENTE');
    if (action === 'new-dates') selected = selected.filter(d => d.scope === 'SALES');
    if (!selected.length) {
      return toast(action === 'new-dates' ? 'A ação “Importar só datas novas” vale apenas para Base de Vendas pendente.' : 'Nenhuma duplicidade pendente selecionada.', 'warn');
    }
    const label = importDuplicateActionLabel(action);
    const extra = alreadyResolved ? `\n\n${alreadyResolved} duplicidade(s) já resolvida(s) serão ignoradas.` : '';
    if (!confirm(`Você selecionou ${selected.length} duplicidade(s).\nDeseja ${label}?${extra}`)) return;
    const messages = [];
    selected.forEach(dup => messages.push(applyImportDuplicateDecision(dup, action)));
    Store.data.auditLog ||= [];
    Store.data.auditLog.push({
      id:uid('audit'),
      type:'DUPLICIDADE_LOTE',
      action,
      total:selected.length,
      user:state.session?.usuario || 'sistema',
      createdAt:new Date().toISOString()
    });
    await Store.save();
    toast(`${selected.length} duplicidade(s) processada(s) em lote.`);
    render();
  }

  async function clearSelectedImportDuplicates(){
    const ids = selectedImportDuplicateIds();
    if (!ids.length) return toast('Selecione ao menos uma duplicidade para limpar.', 'warn');
    if (!confirm(`Limpar ${ids.length} duplicidade(s) selecionada(s)?\n\nIsso remove apenas o registro da lista de duplicidades. Não importa dados novos e não apaga dados já importados.`)) return;
    const before = (Store.data.importDuplicates || []).length;
    Store.data.importDuplicates = (Store.data.importDuplicates || []).filter(d => !ids.includes(d.id));
    const removed = before - (Store.data.importDuplicates || []).length;
    Store.data.auditLog ||= [];
    Store.data.auditLog.push({id:uid('audit'), type:'DUPLICIDADE_LIMPEZA_LOTE', total:removed, user:state.session?.usuario || 'sistema', createdAt:new Date().toISOString()});
    await Store.save();
    toast(`${removed} duplicidade(s) removida(s) da lista.`);
    render();
  }


  function productSelectOptionsHtml(selected=''){
    const products = activeProducts(null).sort((a,b)=>String(a.nomeSistema||'').localeCompare(String(b.nomeSistema||''),'pt-BR'));
    return `<option value="">Selecionar produto...</option>${products.map(p=>`<option value="${escapeHtml(p.id)}" ${p.id===selected?'selected':''}>${escapeHtml(p.nomeSistema)} • ${escapeHtml(p.tipo || '')}</option>`).join('')}`;
  }

  function allKnownStoresForSelection(){
    const byId = new Map();
    const addStore = (store) => {
      if (!store || !store.id) return;
      const nome = store.nome || store.nomeSistema || store.name || store.id;
      const rede = store.rede || store.network || 'REDE';
      byId.set(store.id, {...store, nome, rede});
    };
    enrichStoreCnpjs(mergeCadastroById(Store.data?.stores || [], window.DEFAULT_STORES || [])).forEach(addStore);
    (window.DEFAULT_STORES || []).forEach(addStore);
    Object.values(STORE_CNPJ_INFO || {}).forEach(info => addStore({
      id: info.id,
      nome: info.nome,
      rede: info.rede,
      cnpjs: Object.entries(STORE_CNPJ_INFO || {})
        .filter(([, item]) => item?.id === info.id)
        .map(([cnpj]) => cnpj)
    }));
    return Array.from(byId.values())
      .filter(s => s?.id && s?.nome)
      .sort((a,b)=>`${a.rede} ${a.nome}`.localeCompare(`${b.rede} ${b.nome}`,'pt-BR'));
  }

  function storeSelectOptionsHtml(selected=''){
    const stores = allKnownStoresForSelection();
    const options = stores.map(s=>`<option value="${escapeHtml(s.id)}" ${s.id===selected?'selected':''}>${escapeHtml(s.rede)} • ${escapeHtml(s.nome)}</option>`).join('');
    if (!options) return `<option value="">Nenhuma loja carregada</option>`;
    return `<option value="">Selecionar loja...</option>${options}`;
  }


  function reconciliationInlineId(key){
    const text = String(key || '');
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return `alias-store-inline-${Math.abs(hash).toString(36)}`;
  }

  function importIssueProductRaw(issue){
    const text = String(issue?.detail || '');
    if (!/Produto não reconhecido/i.test(`${issue?.message || ''} ${text}`)) return '';
    const afterColon = text.includes(':') ? text.split(':').slice(1).join(':').trim() : text.trim();
    const cleaned = afterColon.replace(/\.$/,'').trim();
    if (!cleaned) return '';
    if (cleaned.includes('|')) return cleaned.split('|').pop().trim();
    return cleaned.replace(/\s+na loja\s+.+$/i,'').trim();
  }

  function importIssueStoreRaw(issue){
    const text = String(issue?.detail || '');
    if (!/Loja não reconhecida/i.test(`${issue?.message || ''} ${text}`)) return '';
    const afterColon = text.includes(':') ? text.split(':').slice(1).join(':').trim() : text.trim();
    return afterColon.replace(/\s*\(pedido.+$/i,'').replace(/\s*\|\s*CNPJ.+$/i,'').replace(/\.$/,'').trim();
  }


  function reconciliationCacheSignature(){
    const data = Store.data || {};
    const prodAliasCount = Object.keys(data.nameReconciliations?.products || {}).length;
    const storeAliasCount = Object.keys(data.nameReconciliations?.stores || {}).length;
    return [
      Array.isArray(data.sales) ? data.sales.length : 0,
      Array.isArray(data.importIssues) ? data.importIssues.length : 0,
      prodAliasCount,
      storeAliasCount,
      data._updatedAt || data.updatedAt || ''
    ].join('|');
  }

  function applyKnownStoreOverridesToSales(){
    const sales = Store.data?.sales || [];
    if (!Array.isArray(sales) || !sales.length) return 0;
    const stores = allKnownStoresForSelection();
    let changed = 0;
    for (const row of sales) {
      if (row.storeId) continue;
      const raw = row.storeRaw || row.storeName || '';
      if (!raw) continue;
      const rede = row.rede || '';
      const store = storeOverrideByKnownSalesName(raw, rede, stores);
      if (!store?.id) continue;
      const targetName = store.nome || store.nomeSistema || store.name || store.id;
      row.storeId = store.id;
      row.storeName = targetName;
      if (store.rede) row.rede = store.rede;
      changed++;
    }
    if (changed) {
      state.reconciliationCache = null;
      Store.queueSave({}, 1200);
    }
    return changed;
  }

  function buildReconciliationAliasCache(){
    const signature = reconciliationCacheSignature();
    if (state.reconciliationCache?.signature === signature) return state.reconciliationCache;
    const productMap = new Map();
    const storeMap = new Map();
    const addProduct = (raw, source, rede='', storeRaw='', qty=0, records=1, date='') => {
      const key = productAliasKeyFromRaw(raw);
      if (!key) return;
      const manual = resolveManualProductAlias(raw, Store.data.products || []);
      if (manual) return;
      if (!productMap.has(key)) productMap.set(key, {key, rawName:String(raw || '').trim(), source:new Set(), redes:new Set(), stores:new Set(), records:0, qty:0, dates:new Set()});
      const g = productMap.get(key);
      g.source.add(source || '');
      if (rede) g.redes.add(rede);
      if (storeRaw) g.stores.add(storeRaw);
      g.records += toNumber(records || 1);
      g.qty += toNumber(qty || 0);
      if (date) g.dates.add(date);
    };
    const addStore = (raw, rede, source, productRaw='', qty=0, records=1, date='') => {
      const key = storeAliasKeyFromRaw(raw, rede);
      if (!key) return;
      const manual = resolveManualStoreAlias(raw, rede, Store.data.stores || []);
      if (manual) return;
      const known = storeOverrideByKnownSalesName(raw, rede, allKnownStoresForSelection());
      if (known) return;
      if (!storeMap.has(key)) storeMap.set(key, {key, rawName:String(raw || '').trim(), rede:rede || '', source:new Set(), products:new Set(), records:0, qty:0, dates:new Set()});
      const g = storeMap.get(key);
      g.source.add(source || '');
      if (productRaw) g.products.add(productRaw);
      g.records += toNumber(records || 1);
      g.qty += toNumber(qty || 0);
      if (date) g.dates.add(date);
    };
    const sales = Store.data.sales || [];
    const issues = Store.data.importIssues || [];
    sales.forEach(r => {
      if (!r.productId) addProduct(r.productRaw || r.productName, 'Base de Venda', r.rede, r.storeRaw || r.storeName, r.qty, r.sourceRecords || 1, r.date);
      if (!r.storeId) addStore(r.storeRaw || r.storeName, r.rede, 'Base de Venda', r.productRaw || r.productName, r.qty, r.sourceRecords || 1, r.date);
    });
    issues.forEach(i => {
      const productRaw = importIssueProductRaw(i);
      if (productRaw) addProduct(productRaw, i.type || i.source || 'XML/PDF', '', '', 0, 1, '');
      const storeRaw = importIssueStoreRaw(i);
      if (storeRaw && !importIssueCnpj(i)) addStore(storeRaw, '', i.type || i.source || 'XML/PDF', '', 0, 1, '');
    });
    const cache = {
      signature,
      products: Array.from(productMap.values()).sort((a,b)=> b.records - a.records || a.rawName.localeCompare(b.rawName,'pt-BR')),
      stores: Array.from(storeMap.values()).sort((a,b)=> b.records - a.records || a.rawName.localeCompare(b.rawName,'pt-BR'))
    };
    state.reconciliationCache = cache;
    return cache;
  }

  function pendingProductAliasGroups(){
    return buildReconciliationAliasCache().products;
  }

  function pendingStoreAliasGroups(){
    return buildReconciliationAliasCache().stores;
  }

  function reconciliationRows(type){
    const map = type === 'store' ? (Store.data.nameReconciliations?.stores || {}) : (Store.data.nameReconciliations?.products || {});
    return Object.entries(map).map(([key, rec]) => ({key, ...(typeof rec === 'string' ? {targetId:rec} : rec)})).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  }

  function applyManualNameReconciliations(){
    let changed = 0;
    Store.data.sales = (Store.data.sales || []).map(r => {
      let next = {...r};
      const store = resolveManualStoreAlias(next.storeRaw || next.storeName, next.rede, Store.data.stores || []);
      const product = resolveManualProductAlias(next.productRaw || next.productName, Store.data.products || []);
      if (store && next.storeId !== store.id) { next.storeId = store.id; next.storeName = store.nome; changed++; }
      if (product && next.productId !== product.id) { next.productId = product.id; next.productName = product.nomeSistema; changed++; }
      return next;
    });
    reconcileSalesReferences(Store.data);
    return changed;
  }

  function sameReconciliationRede(rowRede='', redeHint=''){
    if (!redeHint) return true;
    const a = normalize(rowRede || '');
    const b = normalize(redeHint || '');
    if (!a || !b) return true;
    return a === b || a.includes(b) || b.includes(a) || a.split(' ')[0] === b.split(' ')[0];
  }

  function applySingleStoreNameReconciliation(rawName, store, redeHint=''){
    const rawOnlyKey = storeAliasKeyFromRaw(rawName, '');
    if (!rawOnlyKey || !store?.id) return {rows:0, records:0};
    let rows = 0;
    let records = 0;
    const targetName = store.nome || store.nomeSistema || store.name || store.id;
    const targetRede = store.rede || store.network || redeHint || '';
    (Store.data.sales || []).forEach(r => {
      const rowRaw = r.storeRaw || r.storeName || '';
      if (storeAliasKeyFromRaw(rowRaw, '') !== rawOnlyKey) return;
      if (!sameReconciliationRede(r.rede || '', redeHint || targetRede || '')) return;
      if (r.storeId !== store.id || r.storeName !== targetName || (targetRede && r.rede !== targetRede)) {
        r.storeId = store.id;
        r.storeName = targetName;
        if (targetRede) r.rede = targetRede;
        rows++;
        records += toNumber(r.sourceRecords || 1);
      }
    });
    return {rows, records};
  }

  async function applySingleStoreNameReconciliationAsync(rawName, store, redeHint=''){
    const rawOnlyKey = storeAliasKeyFromRaw(rawName, '');
    if (!rawOnlyKey || !store?.id) return {rows:0, records:0};
    let rows = 0;
    let records = 0;
    const targetName = store.nome || store.nomeSistema || store.name || store.id;
    const targetRede = store.rede || store.network || redeHint || '';
    const sales = Store.data.sales || [];
    const chunkSize = 2500;
    for (let i = 0; i < sales.length; i += chunkSize) {
      const limit = Math.min(i + chunkSize, sales.length);
      for (let j = i; j < limit; j++) {
        const r = sales[j];
        const rowRaw = r.storeRaw || r.storeName || '';
        if (storeAliasKeyFromRaw(rowRaw, '') !== rawOnlyKey) continue;
        if (!sameReconciliationRede(r.rede || '', redeHint || targetRede || '')) continue;
        if (r.storeId !== store.id || r.storeName !== targetName || (targetRede && r.rede !== targetRede)) {
          r.storeId = store.id;
          r.storeName = targetName;
          if (targetRede) r.rede = targetRede;
          rows++;
          records += toNumber(r.sourceRecords || 1);
        }
      }
      if (sales.length > chunkSize) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return {rows, records};
  }

  function applySingleProductNameReconciliation(rawName, product){
    const key = productAliasKeyFromRaw(rawName);
    if (!key || !product?.id) return {rows:0, records:0};
    let rows = 0;
    let records = 0;
    (Store.data.sales || []).forEach(r => {
      const rowRaw = r.productRaw || r.productName || '';
      if (productAliasKeyFromRaw(rowRaw) !== key) return;
      if (r.productId !== product.id || r.productName !== product.nomeSistema) {
        r.productId = product.id;
        r.productName = product.nomeSistema;
        rows++;
        records += toNumber(r.sourceRecords || 1);
      }
    });
    return {rows, records};
  }

  function clearProductIssuesByRaw(rawName){
    const key = productAliasKeyFromRaw(rawName);
    const before = (Store.data.importIssues || []).length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => productAliasKeyFromRaw(importIssueProductRaw(i)) !== key);
    return before - (Store.data.importIssues || []).length;
  }

  function clearStoreIssuesByRaw(rawName, rede=''){
    const key = storeAliasKeyFromRaw(rawName, rede);
    const rawOnly = storeAliasKeyFromRaw(rawName, '');
    const before = (Store.data.importIssues || []).length;
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => {
      const raw = importIssueStoreRaw(i);
      if (!raw) return true;
      const issueKey = storeAliasKeyFromRaw(raw, rede);
      const issueRawOnly = storeAliasKeyFromRaw(raw, '');
      return issueKey !== key && issueRawOnly !== rawOnly;
    });
    return before - (Store.data.importIssues || []).length;
  }

  async function saveProductNameReconciliation(){
    const rawName = String($('#aliasProductRaw')?.value || '').trim();
    const targetId = $('#aliasProductTarget')?.value || '';
    const product = productById(targetId);
    if (!rawName) return toast('Informe o nome do produto como aparece na planilha/XML/PDF.', 'warn');
    if (!product) return toast('Selecione o produto correto do cadastro.', 'warn');
    const key = productAliasKeyFromRaw(rawName);
    const recs = nameReconciliationStore();
    recs.products[key] = {rawName, targetId:product.id, targetName:product.nomeSistema, createdAt:recs.products[key]?.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString(), user:state.session?.usuario || 'sistema'};
    const affected = applySingleProductNameReconciliation(rawName, product);
    const removed = clearProductIssuesByRaw(rawName);
    state.reconciliationCache = null;
    await Store.save();
    toast(`Produto conciliado: ${rawName} → ${product.nomeSistema}. ${fmt.format(affected.records || affected.rows)} registro(s) atualizado(s), ${fmt.format(removed)} erro(s) igual(is) limpo(s).`);
    render();
  }

  async function saveStoreNameReconciliationByValues(rawNameValue, targetIdValue, redeHint='', options={}){
    const rawName = String(rawNameValue || '').trim();
    const targetId = String(targetIdValue || '').trim();
    const store = storeById(targetId) || allKnownStoresForSelection().find(s => s.id === targetId);
    if (!rawName) { toast('Informe o nome da loja como aparece na planilha/XML/PDF.', 'warn'); return false; }
    if (!store) { toast('Selecione a loja correta do cadastro.', 'warn'); return false; }
    const normalizedStore = {
      ...store,
      id: store.id,
      nome: store.nome || store.nomeSistema || store.name || store.id,
      rede: store.rede || store.network || redeHint || ''
    };
    if (!storeById(normalizedStore.id)) {
      Store.data.stores = enrichStoreCnpjs(mergeCadastroById(Store.data.stores || [], [normalizedStore]));
    }
    const effectiveRede = redeHint || normalizedStore.rede || '';
    const key = storeAliasKeyFromRaw(rawName, effectiveRede);
    const recs = nameReconciliationStore();
    recs.stores[key] = {rawName, rede:effectiveRede, targetId:normalizedStore.id, targetName:normalizedStore.nome, createdAt:recs.stores[key]?.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString(), user:state.session?.usuario || 'sistema'};
    toast(`Aplicando conciliação de loja: ${rawName} → ${normalizedStore.nome}...`);
    const affected = await applySingleStoreNameReconciliationAsync(rawName, normalizedStore, effectiveRede);
    const removed = clearStoreIssuesByRaw(rawName, effectiveRede);
    state.reconciliationCache = null;
    await Store.save();
    toast(`Loja conciliada: ${rawName} → ${normalizedStore.nome}. ${fmt.format(affected.records || affected.rows)} registro(s) atualizado(s), ${fmt.format(removed)} erro(s) igual(is) limpo(s).`);
    if (options.closeModal !== false) closeModal();
    if (options.render !== false) render();
    return true;
  }

  async function saveStoreNameReconciliation(){
    await saveStoreNameReconciliationByValues($('#aliasStoreRaw')?.value || '', $('#aliasStoreTarget')?.value || '', $('#aliasStoreRedeHint')?.value || '');
  }

  async function saveStoreNameReconciliationFromModal(){
    await saveStoreNameReconciliationByValues($('#aliasStoreModalRaw')?.value || '', $('#aliasStoreModalTarget')?.value || '', $('#aliasStoreModalRede')?.value || '');
  }


  async function saveStoreNameReconciliationInline(rawName, redeHint, inlineKey, buttonEl=null){
    const fieldId = reconciliationInlineId(inlineKey || storeAliasKeyFromRaw(rawName, redeHint || ''));
    const select = document.getElementById(fieldId);
    const targetId = select?.value || '';
    if (!targetId) return toast('Selecione a loja correta nesta linha antes de salvar.', 'warn');
    const btn = buttonEl || null;
    if (btn) { btn.disabled = true; btn.dataset.originalText ||= btn.textContent; btn.textContent = 'Salvando...'; }
    try {
      await saveStoreNameReconciliationByValues(rawName, targetId, redeHint || '', {closeModal:false, render:true});
    } finally {
      if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Salvar'; }
    }
  }

  async function deleteNameReconciliation(type, key){
    const recs = nameReconciliationStore();
    const map = type === 'store' ? recs.stores : recs.products;
    if (!map[key]) return toast('Conciliação não encontrada.', 'warn');
    if (!confirm('Excluir esta conciliação? As próximas importações voltarão a depender do reconhecimento automático.')) return;
    delete map[key];
    state.reconciliationCache = null;
    Store.queueSave({}, 900);
    toast('Conciliação removida.');
    render();
  }

  function fillProductReconciliation(rawName){
    go('conciliacao');
    setTimeout(()=>{
      const input = $('#aliasProductRaw');
      if (input) { input.value = rawName || ''; input.focus(); input.scrollIntoView({behavior:'smooth', block:'center'}); }
    }, 50);
  }

  function guessStoreForReconciliation(rawName, redeHint=''){
    const stores = allKnownStoresForSelection();
    return matchStoreInData(rawName, redeHint, stores) || null;
  }

  function fillStoreReconciliation(rawName, redeHint=''){
    const guess = guessStoreForReconciliation(rawName, redeHint);
    const selectedId = guess?.id || '';
    const cleanRaw = String(rawName || '').trim();
    openModal('Conciliar loja', `
      <div class="issue-detail-box">
        <div><span>Nome recebido</span><strong>${escapeHtml(cleanRaw || '—')}</strong></div>
        <div><span>Rede informada</span><strong>${escapeHtml(redeHint || '—')}</strong></div>
        <div><span>Sugestão automática</span><strong>${escapeHtml(guess ? `${guess.rede} • ${guess.nome}` : 'Selecione manualmente')}</strong></div>
      </div>
      <div class="panel" style="margin-top:12px">
        <div class="form-grid compact-grid">
          <label>Nome da loja na planilha/XML/PDF<input id="aliasStoreModalRaw" value="${escapeHtml(cleanRaw)}"></label>
          <label>Loja correta no cadastro<select id="aliasStoreModalTarget">${storeSelectOptionsHtml(selectedId)}</select></label>
        </div>
        <input type="hidden" id="aliasStoreModalRede" value="${escapeHtml(redeHint || '')}">
        <p class="muted small">Selecione a loja correta uma vez. O sistema corrigirá todos os registros com esse mesmo nome recebido e usará essa regra nas próximas importações.</p>
        <div class="actions modal-actions">
          <button class="btn" type="button" onclick="App.closeModal()">Cancelar</button>
          <button class="btn btn-primary" type="button" onclick="App.saveStoreNameReconciliationFromModal()">Salvar conciliação da loja</button>
        </div>
      </div>`);
    setTimeout(()=>$('#aliasStoreModalTarget')?.focus(), 80);
  }

  function renderNameReconciliationPanel(){
    const autoResolvedStores = applyKnownStoreOverridesToSales();
    const productPendencies = pendingProductAliasGroups().slice(0,120);
    const storePendencies = pendingStoreAliasGroups().slice(0,120);
    const productAliases = reconciliationRows('product');
    const storeAliases = reconciliationRows('store');
    const manualCount = productAliases.length + storeAliases.length;
    const pendingCount = productPendencies.length + storePendencies.length;
    return `
      <div class="card reconciliation-shell">
        <div class="reconciliation-hero">
          <div class="reconciliation-hero-main">
            <span class="eyebrow">Padronização inteligente</span>
            <h2>Central de conciliação de nomes</h2>
            <p>Padronize nomes divergentes de loja e produto. Cada conciliação salva vira uma regra automática para as próximas importações e também corrige a base já carregada.</p>
          </div>
          <div class="metric-strip">
            <div class="metric-mini"><span>Pendências</span><strong>${fmt.format(pendingCount)}</strong><small>nomes aguardando conciliação</small></div>
            <div class="metric-mini"><span>Regras ativas</span><strong>${fmt.format(manualCount)}</strong><small>atalhos já aprendidos pelo sistema</small></div>
            <div class="metric-mini"><span>Lojas carregadas</span><strong>${fmt.format(allKnownStoresForSelection().length)}</strong><small>${autoResolvedStores ? `${fmt.format(autoResolvedStores)} corrigida(s) automaticamente` : 'disponíveis para seleção'}</small></div>
          </div>
        </div>
        <div class="reconciliation-form-grid">
          <section class="reconciliation-form-card">
            <div class="section-tag">Produto</div>
            <h4>Conciliar produto</h4>
            <p class="section-subtitle">Use quando o nome do produto vier com marca, código ou grafia diferente do cadastro.</p>
            <div class="form-grid compact-grid">
              <label>Nome do produto na planilha/XML/PDF<input id="aliasProductRaw" placeholder="Ex.: BROCOLIS SÓ FOLHAS AMERICANO"></label>
              <label>Produto correto no cadastro<select id="aliasProductTarget">${productSelectOptionsHtml()}</select></label>
            </div>
            <div class="footer-actions"><button class="btn btn-primary" type="button" onclick="App.saveProductNameReconciliation()">Salvar conciliação do produto</button></div>
            <p class="muted small conciliation-example">Exemplo: BROCOLIS SÓ FOLHAS AMERICANO → BRÓCOLIS AMERICANO.</p>
          </section>
          <section class="reconciliation-form-card">
            <div class="section-tag">Loja</div>
            <h4>Conciliar loja</h4>
            <p class="section-subtitle">Use quando a base vier com código, abreviação ou nome diferente da loja oficial cadastrada.</p>
            <div class="form-grid compact-grid">
              <label>Nome da loja na planilha/XML/PDF<input id="aliasStoreRaw" placeholder="Ex.: 005-VALPARSO"></label>
              <label>Loja correta no cadastro<select id="aliasStoreTarget">${storeSelectOptionsHtml()}</select></label>
              <input type="hidden" id="aliasStoreRedeHint" value="">
            </div>
            <div class="footer-actions"><button class="btn btn-primary" type="button" onclick="App.saveStoreNameReconciliation()">Salvar conciliação da loja</button></div>
            <p class="muted small conciliation-example">Exemplo: 005-VALPARSO → COSTA VALPARAÍSO.</p>
          </section>
        </div>
      </div>
      <div class="grid two">
        <div class="card table-shell">
          <div class="panel-head table-headline"><div><h3>Produtos pendentes para conciliar</h3><p class="muted">Itens que ainda não foram vinculados a um produto oficial.</p></div><span class="badge amber">${fmt.format(productPendencies.length)}</span></div>
          <div class="table-wrap compact-table">
            <table><thead><tr><th>Nome recebido</th><th>Origem</th><th class="num">Registros</th><th class="num">Qtd</th><th></th></tr></thead><tbody>
            ${productPendencies.map(g=>`<tr><td><strong>${escapeHtml(g.rawName)}</strong><br><span class="muted small">${Array.from(g.redes).slice(0,3).map(escapeHtml).join(', ')}</span></td><td>${Array.from(g.source).map(escapeHtml).join(', ')}</td><td class="num">${fmt.format(g.records)}</td><td class="num">${fmt.format(g.qty)}</td><td><button class="btn btn-sm btn-soft" type="button" onclick="App.fillProductReconciliation(${jsArg(g.rawName)})">Conciliar</button></td></tr>`).join('') || `<tr><td colspan="5" class="center muted">Sem produto pendente de conciliação.</td></tr>`}
            </tbody></table>
          </div>
        </div>
        <div class="card table-shell">
          <div class="panel-head table-headline"><div><h3>Lojas pendentes para conciliar</h3><p class="muted">Lojas vindas com código, abreviação ou variação de grafia.</p></div><span class="badge amber">${fmt.format(storePendencies.length)}</span></div>
          <div class="table-wrap compact-table">
            <table><thead><tr><th>Nome recebido</th><th>Rede</th><th>Origem</th><th class="num">Registros</th><th>Loja correta no cadastro</th><th>Ação</th></tr></thead><tbody>
            ${storePendencies.map(g=>{
              const rowId = reconciliationInlineId(g.key);
              const guess = guessStoreForReconciliation(g.rawName, g.rede || '');
              return `<tr><td><strong>${escapeHtml(g.rawName)}</strong></td><td>${escapeHtml(g.rede || '—')}</td><td>${Array.from(g.source).map(escapeHtml).join(', ')}</td><td class="num">${fmt.format(g.records)}</td><td><select id="${escapeHtml(rowId)}" class="inline-reconciliation-select">${storeSelectOptionsHtml(guess?.id || '')}</select><div class="muted small">${guess ? `Sugestão: ${escapeHtml(guess.rede)} • ${escapeHtml(guess.nome)}` : 'Selecione a loja correta para este nome.'}</div></td><td><button class="btn btn-sm btn-primary js-inline-store-save" type="button" data-raw="${escapeHtml(g.rawName)}" data-rede="${escapeHtml(g.rede || '')}" data-inline-key="${escapeHtml(g.key)}">Salvar</button><button class="btn btn-sm btn-ghost" type="button" onclick="App.fillStoreReconciliation(${jsArg(g.rawName)}, ${jsArg(g.rede || '')})">Detalhar</button></td></tr>`;
            }).join('') || `<tr><td colspan="6" class="center muted">Sem loja pendente de conciliação.</td></tr>`}
            </tbody></table>
          </div>
        </div>
      </div>
      <div class="grid two">
        <div class="card table-shell">
          <div class="panel-head table-headline"><div><h3>Produtos já conciliados</h3><p class="muted">Regras manuais já salvas para reaproveitar automaticamente.</p></div><span class="badge green">${fmt.format(productAliases.length)}</span></div>
          <div class="table-wrap compact-table">
            <table><thead><tr><th>Nome original</th><th>Produto oficial</th><th>Última atualização</th><th class="num">Ação</th></tr></thead><tbody>
            ${productAliases.map(r=>`<tr><td>${escapeHtml(r.rawName || r.key)}</td><td><strong>${escapeHtml(r.targetName || productById(r.targetId)?.nomeSistema || r.targetId || '')}</strong></td><td>${escapeHtml(r.user || '—')}<br><span class="muted small">${formatDateTime(r.updatedAt || r.createdAt)}</span></td><td class="num"><button class="btn btn-sm btn-danger" type="button" onclick="App.deleteNameReconciliation('product', ${jsArg(r.key)})">Excluir</button></td></tr>`).join('') || `<tr><td colspan="4" class="center muted">Nenhum produto conciliado manualmente.</td></tr>`}
            </tbody></table>
          </div>
        </div>
        <div class="card table-shell">
          <div class="panel-head table-headline"><div><h3>Lojas já conciliadas</h3><p class="muted">Mapeamentos salvos para reaproveitar em novas importações.</p></div><span class="badge green">${fmt.format(storeAliases.length)}</span></div>
          <div class="table-wrap compact-table">
            <table><thead><tr><th>Nome original</th><th>Loja oficial</th><th>Última atualização</th><th class="num">Ação</th></tr></thead><tbody>
            ${storeAliases.map(r=>`<tr><td>${escapeHtml(r.rawName || r.key)}</td><td><strong>${escapeHtml(r.targetName || storeById(r.targetId)?.nome || r.targetId || '')}</strong><br><span class="muted small">${escapeHtml(r.rede || '')}</span></td><td>${escapeHtml(r.user || '—')}<br><span class="muted small">${formatDateTime(r.updatedAt || r.createdAt)}</span></td><td class="num"><button class="btn btn-sm btn-danger" type="button" onclick="App.deleteNameReconciliation('store', ${jsArg(r.key)})">Excluir</button></td></tr>`).join('') || `<tr><td colspan="4" class="center muted">Nenhuma loja conciliada manualmente.</td></tr>`}
            </tbody></table>
          </div>
        </div>
      </div>`;
  }

  function renderConciliation(){
    setTitle('Conciliação da Base de Venda', 'Defina a data de entrega e escolha quais datas de venda serão usadas como base.');
    const allBaseDates = unique((Store.data.sales || []).map(s=>s.date)).sort();
    const deliveryDates = availableDeliveryDatesForConciliation();
    const redes = redesForDeliveryConciliation();
    const currentType = ['FOLHAGEM','BANDEJA'].includes(state.filters.tipo) ? state.filters.tipo : (state.adminType && state.adminType !== 'AMBOS' ? state.adminType : 'FOLHAGEM');
    const selectedDelivery = state.filters.dateFrom || Store.data.conciliation?.[currentType]?.orderDate || deliveryDates[deliveryDates.length-1] || todayISO();
    const selectedRede = state.filters.rede || redes[0] || '';
    const selectedPlan = orderAnalysisConciliation(currentType, selectedDelivery, selectedRede);
    const baseChecks = allBaseDates.map(d => `<label class="inline-check conciliation-date-option"><input type="checkbox" data-conc-base-date="${escapeHtml(d)}" ${selectedPlan.baseDates?.includes(d)?'checked':''}> <span>${formatDate(d)}</span></label>`).join('');
    const summaries = deliveryDates.slice().reverse().slice(0,90).map(date => {
      const byType = ['FOLHAGEM','BANDEJA'].map(type => deliveryConciliationSummary(type, date));
      const totalDone = byType.reduce((a,s)=>a+s.done.length,0);
      const total = byType.reduce((a,s)=>a+s.total,0);
      const badges = byType.map(s => `<span class="badge ${s.done.length===s.total && s.total ? 'green' : s.done.length ? 'amber' : 'gray'}">${typeLabelShort(s.type)}: ${s.done.length}/${s.total || 0}</span>`).join(' ');
      return `<div class="conciliation-calendar-day">
        <strong>${formatDate(date)}</strong>
        <span class="muted small">Conciliações: ${totalDone}/${total || 0}</span>
        <div class="pillbar">${badges}</div>
      </div>`;
    }).join('');
    $('#viewRoot').innerHTML = `
      ${renderNameReconciliationPanel()}
      <div class="card conciliation-workflow-card">
        <div class="panel-head">
          <div>
            <h3>Configurar base por data de entrega</h3>
            <p class="muted small">Escolha a entrega, a rede e selecione múltiplas datas base. Você pode marcar, desmarcar e trocar as datas sempre que necessário.</p>
          </div>
          <span class="badge blue">${fmt.format(allBaseDates.length)} datas base</span>
        </div>
        <div class="form-grid compact">
          <label>Tipo
            <select id="deliveryConcType"><option value="FOLHAGEM" ${currentType==='FOLHAGEM'?'selected':''}>Folhagens</option><option value="BANDEJA" ${currentType==='BANDEJA'?'selected':''}>Bandejas</option></select>
          </label>
          <label>Entrega
            <select id="deliveryConcDate">${deliveryDates.map(d=>`<option value="${escapeHtml(d)}" ${d===selectedDelivery?'selected':''}>${formatDate(d)}</option>`).join('')}</select>
          </label>
          <label>Rede
            <select id="deliveryConcRede">${redes.map(r=>`<option value="${escapeHtml(r)}" ${r===selectedRede?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select>
          </label>
          <label>Aumento (%)
            <input type="number" min="0" step="1" id="deliveryConcIncrease" value="${toNumber(selectedPlan.increasePct)}">
          </label>
        </div>
        <hr>
        <strong>Base de venda</strong>
        <div class="conciliation-base-list">${baseChecks || '<span class="muted">Importe uma base de vendas para liberar as datas base.</span>'}</div>
        <div class="footer-actions">
          <button class="btn btn-soft" type="button" id="clearDeliveryConcBase">Limpar seleção</button>
          <button class="btn btn-primary" type="button" id="saveDeliveryConc">Salvar conciliação da entrega</button>
        </div>
      </div>
      <div class="card conciliation-calendar-card">
        <div class="panel-head">
          <div><h3>Calendário de conciliações por entrega</h3><p class="muted small">A data abaixo é a data de entrega. O resumo mostra quantas redes já têm base de venda definida para cada entrega.</p></div>
        </div>
        <div class="conciliation-calendar-grid">${summaries || '<div class="empty">Nenhuma entrega encontrada para montar o calendário.</div>'}</div>
      </div>`;
    bindDeliveryConciliationControls(currentType, selectedDelivery, selectedRede);
    $$('.js-inline-store-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        await saveStoreNameReconciliationInline(btn.dataset.raw || '', btn.dataset.rede || '', btn.dataset.inlineKey || '', btn);
      });
    });
  }

  function typeLabelShort(type){ return type === 'BANDEJA' ? 'Bandejas' : 'Folhagens'; }

  function bindDeliveryConciliationControls(currentType, selectedDelivery, selectedRede){
    const rerender = () => {
      state.filters.tipo = $('#deliveryConcType')?.value || currentType;
      state.adminType = state.filters.tipo;
      state.filters.dateFrom = $('#deliveryConcDate')?.value || selectedDelivery;
      state.filters.dateTo = state.filters.dateFrom;
      state.filters.rede = $('#deliveryConcRede')?.value || selectedRede;
      renderConciliation();
    };
    $('#deliveryConcType')?.addEventListener('change', rerender);
    $('#deliveryConcDate')?.addEventListener('change', rerender);
    $('#deliveryConcRede')?.addEventListener('change', rerender);
    $('#clearDeliveryConcBase')?.addEventListener('click', () => {
      $$('[data-conc-base-date]').forEach(chk => chk.checked = false);
    });
    $('#saveDeliveryConc')?.addEventListener('click', async () => {
      const type = $('#deliveryConcType')?.value || currentType;
      const orderDate = $('#deliveryConcDate')?.value || selectedDelivery;
      const rede = $('#deliveryConcRede')?.value || selectedRede;
      const pct = toNumber($('#deliveryConcIncrease')?.value || 0);
      const baseDates = $$('[data-conc-base-date]').filter(chk => chk.checked).map(chk => chk.dataset.concBaseDate);
      if (!orderDate) return toast('Selecione a data de entrega.', 'warn');
      if (!rede) return toast('Selecione a rede.', 'warn');
      if (!baseDates.length) return toast('Selecione pelo menos uma data base.', 'warn');
      setDeliveryConciliation(type, orderDate, rede, baseDates, pct);
      state.filters.tipo = type;
      state.adminType = type;
      state.filters.dateFrom = orderDate;
      state.filters.dateTo = orderDate;
      state.filters.rede = rede;
      await Store.save();
      toast(`Conciliação salva para ${formatDate(orderDate)} • ${rede}.`);
      renderConciliation();
    });
  }

  function renderMissingQuality(){
    setTitle('Faltas e Qualidade', 'Lançamento exclusivo do ADM/comercial. Abate entrega e calcula valor pelo custo do PDF.');
    const dates = unique(Store.data.deliveries.map(d=>d.date)).sort().reverse();
    const stores = Store.data.stores;
    const selectedDate = $('#mqDate')?.value || dates[0] || todayISO();
    const selectedStore = $('#mqStore')?.value || stores[0]?.id || '';
    const rows = Store.data.deliveries.filter(d => (!selectedDate || d.date===selectedDate) && (!selectedStore || d.storeId===selectedStore));
    $('#viewRoot').innerHTML = `
      <div class="filter-row">
        <div class="filter">Data <select id="mqDate">${dates.map(d=>`<option value="${d}" ${d===selectedDate?'selected':''}>${formatDate(d)}</option>`).join('')}</select></div>
        <div class="filter">Loja <select id="mqStore">${stores.map(s=>`<option value="${s.id}" ${s.id===selectedStore?'selected':''}>${s.nome}</option>`).join('')}</select></div>
      </div>
      <div class="grid kpis">
        ${kpi('!','Valor faltas',money.format(rows.reduce((a,d)=>a+toNumber(d.faltaQty)*toNumber(d.unitCost),0)),'no filtro','red')}
        ${kpi('◇','Valor qualidade',money.format(rows.reduce((a,d)=>a+toNumber(d.qualidadeQty)*toNumber(d.unitCost),0)),'no filtro','amber')}
        ${kpi('▥','Entrega PDF',fmt.format(rows.reduce((a,d)=>a+toNumber(d.qtyPdf),0)),'unidades')}
        ${kpi('✓','Entrega válida',fmt.format(rows.reduce((a,d)=>a+validQty(d),0)),'unidades')}
        ${kpi('$','Venda válida',money.format(rows.reduce((a,d)=>a+validValue(d),0)),'após abates')}
        ${kpi('▧','Itens',rows.length,'itens no filtro')}
      </div>
      <div class="card">
        <h3>Lançar falta / qualidade</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Produto</th><th class="num">Qtd. PDF</th><th class="num">Custo unit.</th><th class="num">Falta</th><th class="num">Qualidade</th><th class="num">Entrega válida</th><th class="num">Valor falta</th><th class="num">Valor qualidade</th></tr></thead>
          <tbody>${rows.map(d=>`
            <tr>
              <td>${productById(d.productId)?.nomeSistema || d.productRaw}</td>
              <td class="num">${fmt.format(d.qtyPdf)}</td>
              <td class="num">${money.format(d.unitCost)}</td>
              <td class="num"><input class="input-xs" type="number" min="0" max="${d.qtyPdf}" data-mq-field="faltaQty" data-id="${d.id}" value="${toNumber(d.faltaQty)}"></td>
              <td class="num"><input class="input-xs" type="number" min="0" max="${d.qtyPdf}" data-mq-field="qualidadeQty" data-id="${d.id}" value="${toNumber(d.qualidadeQty)}"></td>
              <td class="num">${fmt.format(validQty(d))}</td>
              <td class="num">${money.format(toNumber(d.faltaQty)*toNumber(d.unitCost))}</td>
              <td class="num">${money.format(toNumber(d.qualidadeQty)*toNumber(d.unitCost))}</td>
            </tr>`).join('') || `<tr><td colspan="8" class="center muted">Nenhum PDF importado para o filtro.</td></tr>`}</tbody>
        </table></div>
      </div>`;
    $('#mqDate')?.addEventListener('change', renderMissingQuality);
    $('#mqStore')?.addEventListener('change', renderMissingQuality);
    $$('[data-mq-field]').forEach(inp=>inp.addEventListener('change', async e=>{
      const d = Store.data.deliveries.find(x=>x.id===e.target.dataset.id);
      const other = e.target.dataset.mqField === 'faltaQty' ? toNumber(d.qualidadeQty) : toNumber(d.faltaQty);
      const val = toNumber(e.target.value);
      if (val + other > toNumber(d.qtyPdf)) {
        e.target.value = d[e.target.dataset.mqField] || 0;
        return toast('Falta + qualidade não pode ultrapassar a quantidade do PDF.', 'error');
      }
      d[e.target.dataset.mqField] = val;
      d.adjustedAt = new Date().toISOString();
      await Store.save();
      renderMissingQuality();
    }));
  }

  function computePendencies(){
    const result = [];
    const bandejaOrders = Store.data.orders.filter(o=>o.type==='BANDEJA' && o.status==='ENVIADO');
    for (const o of bandejaOrders) {
      const deadline = addDays(o.date, Store.data.appConfig.bandejaDeadlineBufferDays);
      Object.values(o.lines||{}).forEach(line=>{
        const suggestion = toNumber(line.suggestion);
        if (suggestion <= 0) return;
        const delivered = Store.data.deliveries
          .filter(d => d.storeId===o.storeId && d.productId===line.productId && d.date>=o.date && d.date<=deadline)
          .reduce((a,d)=>a+validQty(d),0);
        const closed = Store.data.closedPendencies.find(c=>c.orderId===o.id && c.productId===line.productId);
        let pending = Math.max(0, suggestion - delivered - toNumber(closed?.qtyClosed));
        let status = pending <= 0 ? 'FINALIZADA' : (todayISO() > deadline ? 'NÃO ENTREGUE' : 'EM ABERTO');
        if (closed && pending<=0) status='ENCERRADA';
        result.push({order:o, productId:line.productId, suggestion, delivered, pending, deadline, status, closed});
      });
    }
    return result;
  }

  function renderPendencies(){
    setTitle('Carteira de Pendências de Bandejas', 'Acompanhe a data de entrega informada pela loja, o que chegou via PDF e o saldo pendente até a data limite.');
    const rows = computePendencies();
    $('#viewRoot').innerHTML = `<div class="card"><h3>Pendências de Bandejas</h3><div class="table-wrap"><table>
      <thead><tr><th>Data de entrega</th><th>Rede</th><th>Loja</th><th>Produto</th><th class="num">Sugestão loja</th><th class="num">Entregue válido</th><th class="num">Pendente</th><th>Prazo</th><th>Status</th><th>Ação</th></tr></thead>
      <tbody>${rows.map(r=>{
        const store = storeById(r.order.storeId);
        return `<tr><td>${formatDate(r.order.date)}</td><td>${store?.rede||''}</td><td>${store?.nome||''}</td><td>${productById(r.productId)?.nomeSistema||''}</td><td class="num">${fmt.format(r.suggestion)}</td><td class="num">${fmt.format(r.delivered)}</td><td class="num ${r.pending>0?'negative':'positive'}">${fmt.format(r.pending)}</td><td>${formatDate(r.deadline)}</td><td><span class="badge ${r.status==='NÃO ENTREGUE'?'red':r.status==='EM ABERTO'?'amber':'green'}">${r.status}</span></td><td>${r.pending>0?`<button class="btn btn-sm btn-danger" onclick="App.closePendency('${r.order.id}','${r.productId}',${r.pending})">Limpar</button>`:''}</td></tr>`;
      }).join('') || `<tr><td colspan="10" class="center muted">Sem pendências.</td></tr>`}</tbody>
    </table></div></div>`;
  }

  function closePendency(orderId, productId, pending){
    openModal('Limpar pendência', `<p>Informe o motivo para encerrar manualmente a pendência de <strong>${fmt.format(pending)}</strong> unidades.</p>
      <label>Quantidade a limpar<input id="closeQty" type="number" min="0" max="${pending}" value="${pending}"></label>
      <label>Motivo<select id="closeReason"><option>Pedido cancelado</option><option>Loja não precisa mais</option><option>Produto sem disponibilidade</option><option>Ajuste comercial</option><option>Erro de lançamento</option><option>Substituído por outro produto</option><option>Outro motivo</option></select></label>
      <label>Observação<textarea id="closeObs" placeholder="Descreva o alinhamento realizado..."></textarea></label>
      <div class="footer-actions"><button class="btn btn-primary" id="confirmClosePendency">Confirmar limpeza</button></div>`);
    $('#confirmClosePendency').addEventListener('click', async ()=>{
      Store.data.closedPendencies.push({id:uid('pendclose'), orderId, productId, qtyClosed:toNumber($('#closeQty').value), reason:$('#closeReason').value, obs:$('#closeObs').value, user:state.session.usuario, createdAt:new Date().toISOString()});
      await Store.save();
      closeModal();
      toast('Pendência encerrada manualmente.');
      render();
    });
  }

  function renderCriticalRuptureSettings(){
    setTitle('Itens Obrigatórios por Rede', 'Configure, por rede, quais produtos não podem ficar sem entrega e devem gerar alerta em Rupturas.');
    if (!state.criticalConfigRede) state.criticalConfigRede = getRedeOptions().find(Boolean) || '';
    const redes = getRedeOptions().filter(Boolean);
    const selectedRede = state.criticalConfigRede || redes[0] || '';
    if (selectedRede !== state.criticalConfigRede) state.criticalConfigRede = selectedRede;
    const selectedIds = new Set(criticalRuptureProductIds(selectedRede));
    const products = Store.data.products
      .filter(p => p.situacao === 'ATIVO')
      .sort((a,b)=>a.tipo.localeCompare(b.tipo) || a.nomeSistema.localeCompare(b.nomeSistema));
    const summaryRows = redes.map(rede => ({rede, qty: criticalRuptureProductIds(rede).length}));
    $('#viewRoot').innerHTML = `
      <div class="grid two">
        <div class="card">
          <h3>Configurar itens obrigatórios</h3>
          <p class="muted">Selecione a rede e marque os produtos que devem gerar alerta quando a loja tiver entrega no dia, mas esse item não for enviado.</p>
          <label>Rede
            <select id="criticalConfigRede">
              ${redes.map(r=>`<option value="${escapeHtml(r)}" ${r===selectedRede?'selected':''}>${escapeHtml(r)}</option>`).join('')}
            </select>
          </label>
          <label style="margin-top:12px">Itens que não podem faltar
            <select id="criticalConfigProducts" multiple size="16">
              ${products.map(p=>`<option value="${p.id}" ${selectedIds.has(p.id)?'selected':''}>${escapeHtml(p.tipo)} • ${escapeHtml(p.nomeSistema)}</option>`).join('')}
            </select>
            <small class="muted">Use Ctrl para selecionar mais de um item. Se a rede ficar sem nenhum item marcado, ela não gera alerta de item obrigatório.</small>
          </label>
          <div class="footer-actions">
            <button class="btn btn-ghost" id="clearCriticalProducts">Limpar rede</button>
            <button class="btn btn-primary" id="saveCriticalProducts">Salvar configuração</button>
          </div>
        </div>
        <div class="card">
          <h3>Resumo por rede</h3>
          <p class="muted">Quantidade de itens obrigatórios configurados em cada rede.</p>
          <div class="table-wrap"><table>
            <thead><tr><th>Rede</th><th class="num">Itens obrigatórios</th><th>Status</th></tr></thead>
            <tbody>${summaryRows.map(r=>`<tr><td>${escapeHtml(r.rede)}</td><td class="num">${r.qty}</td><td><span class="badge ${r.qty?'green':'gray'}">${r.qty?'Monitorando':'Sem alerta'}</span></td></tr>`).join('') || `<tr><td colspan="3" class="center muted">Nenhuma rede cadastrada.</td></tr>`}</tbody>
          </table></div>
          <div class="alert-box" style="margin-top:12px">
            <strong>Como funciona</strong><br>
            O alerta aparece na aba Rupturas quando uma loja da rede recebeu alguma entrega na data, mas não recebeu um item obrigatório configurado para aquela rede.
          </div>
        </div>
      </div>`;

    $('#criticalConfigRede')?.addEventListener('change', e => {
      state.criticalConfigRede = e.target.value;
      renderCriticalRuptureSettings();
    });
    $('#saveCriticalProducts')?.addEventListener('click', async () => {
      const rede = $('#criticalConfigRede')?.value || '';
      const ids = Array.from($('#criticalConfigProducts')?.selectedOptions || []).map(o=>o.value).filter(Boolean);
      Store.data.appConfig ||= {};
      Store.data.appConfig.criticalRuptureProductsByRede ||= {};
      Store.data.appConfig.criticalRuptureProductsByRede[rede] = unique(ids);
      await Store.save();
      toast('Itens obrigatórios da rede salvos.');
      renderCriticalRuptureSettings();
    });
    $('#clearCriticalProducts')?.addEventListener('click', async () => {
      const rede = $('#criticalConfigRede')?.value || '';
      if (!rede) return;
      Store.data.appConfig ||= {};
      Store.data.appConfig.criticalRuptureProductsByRede ||= {};
      Store.data.appConfig.criticalRuptureProductsByRede[rede] = [];
      await Store.save();
      toast('Rede sem itens obrigatórios. Nenhum alerta será gerado para ela.', 'warn');
      renderCriticalRuptureSettings();
    });
  }

  function criticalRuptureProductIds(rede=''){
    const byRede = Store.data.appConfig?.criticalRuptureProductsByRede || {};
    if (rede) {
      if (Object.prototype.hasOwnProperty.call(byRede, rede)) {
        return unique(byRede[rede] || []).filter(id => productById(id));
      }
      return unique(Store.data.appConfig?.criticalRuptureProductIds || []).filter(id => productById(id));
    }
    const allConfigured = Object.values(byRede).flat();
    return unique(allConfigured.length ? allConfigured : (Store.data.appConfig?.criticalRuptureProductIds || [])).filter(id => productById(id));
  }

  function criticalRuptureProductCount(filter={}){
    if (filter.rede) return criticalRuptureProductIds(filter.rede).length;
    const storeRedes = unique((Store.data.stores || [])
      .filter(st => !filter.loja || st.id === filter.loja)
      .map(st => st.rede)
      .filter(Boolean));
    return unique(storeRedes.flatMap(rede => criticalRuptureProductIds(rede))).length;
  }

  function criticalRuptureKey(date, storeId, productId){
    return `${date}|${storeId}|${productId}`;
  }

  function getCriticalRuptureJustification(date, storeId, productId){
    const key = criticalRuptureKey(date, storeId, productId);
    return (Store.data.criticalRuptureJustifications || []).find(j => j.key === key) || null;
  }

  function computeCriticalRuptureAlerts(filter={}){
    const rows = [];

    const deliveries = (Store.data.deliveries || []).filter(d => {
      const store = storeById(d.storeId);
      if (!store) return false;
      if (filter.rede && store.rede !== filter.rede) return false;
      if (filter.loja && d.storeId !== filter.loja) return false;
      if (!dateInRange(d.date, filter.dateFrom, filter.dateTo)) return false;
      return validQty(d) > 0;
    });

    const storeDateMap = new Map();
    deliveries.forEach(d => {
      const key = `${d.date}|${d.storeId}`;
      if (!storeDateMap.has(key)) storeDateMap.set(key, {date:d.date, storeId:d.storeId});
    });

    for (const pair of storeDateMap.values()) {
      const store = storeById(pair.storeId);
      if (!store) continue;
      const criticalIds = criticalRuptureProductIds(store.rede);
      if (!criticalIds.length) continue;
      for (const productId of criticalIds) {
        const product = productById(productId);
        if (!product || !isProductActiveForStore(store.id, product.id)) continue;
        const delivered = sumDeliveryQty(store.id, product.id, [pair.date]);
        if (delivered > 0) continue;
        const justification = getCriticalRuptureJustification(pair.date, store.id, product.id);
        if (filter.onlyPending && justification) continue;
        const lastDelivery = (Store.data.deliveries || [])
          .filter(d => d.storeId === store.id && d.productId === product.id && d.date < pair.date && validQty(d) > 0)
          .sort((a,b)=>b.date.localeCompare(a.date))[0];
        rows.push({
          key: criticalRuptureKey(pair.date, store.id, product.id),
          date: pair.date,
          store,
          product,
          lastDelivery: lastDelivery?.date || '',
          days: lastDelivery ? daysBetween(lastDelivery.date, pair.date) : null,
          justification,
          status: justification ? 'JUSTIFICADO' : 'PENDENTE'
        });
      }
    }
    return rows.sort((a,b)=>{
      if (a.status !== b.status) return a.status === 'PENDENTE' ? -1 : 1;
      return (b.date || '').localeCompare(a.date || '') || a.store.nome.localeCompare(b.store.nome) || a.product.nomeSistema.localeCompare(b.product.nomeSistema);
    });
  }

  function renderCriticalRuptureAlerts(rows){
    const pending = rows.filter(r => r.status === 'PENDENTE').length;
    const justified = rows.filter(r => r.status === 'JUSTIFICADO').length;
    return `<div class="card critical-rupture-card">
      <div class="panel-head">
        <div>
          <h3>🚨 Alerta de itens obrigatórios sem entrega</h3>
          <p class="muted">Itens críticos que não podem ficar sem entrega. Enquanto o comercial não justificar, o alerta permanece pendente.</p>
        </div>
        <div class="actions">
          <button class="btn btn-sm btn-soft" onclick="App.go('itens-obrigatorios')">Configurar itens</button>
          <span class="badge red">${pending} pendente(s)</span>
          <span class="badge green">${justified} justificado(s)</span>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Data</th><th>Rede</th><th>Loja</th><th>Item obrigatório</th><th>Última entrega</th><th class="num">Dias sem entrega</th><th>Status</th><th>Justificativa comercial</th><th>Ação</th></tr></thead>
        <tbody>${rows.map(r=>`<tr class="${r.status==='PENDENTE'?'warning-row':''}">
          <td>${formatDate(r.date)}</td>
          <td>${escapeHtml(r.store.rede)}</td>
          <td>${escapeHtml(r.store.nome)}</td>
          <td><strong>${escapeHtml(r.product.nomeSistema)}</strong></td>
          <td>${r.lastDelivery ? formatDate(r.lastDelivery) : 'Sem entrega anterior'}</td>
          <td class="num">${r.days ?? '—'}</td>
          <td><span class="badge ${r.status==='PENDENTE'?'red':'green'}">${r.status}</span></td>
          <td>${r.justification ? `<strong>${escapeHtml(r.justification.reason || 'Justificado')}</strong><br><span class="muted small">${escapeHtml(r.justification.text || '')}</span><br><span class="muted small">${formatDateTime(r.justification.createdAt)} • ${escapeHtml(r.justification.user || '')}</span>` : '<span class="negative">Aguardando justificativa</span>'}</td>
          <td><button class="btn btn-sm ${r.status==='PENDENTE'?'btn-danger':'btn-soft'}" onclick="App.openCriticalRuptureJustification('${r.date}','${r.store.id}','${r.product.id}')">${r.status==='PENDENTE'?'Justificar':'Editar'}</button></td>
        </tr>`).join('') || `<tr><td colspan="9" class="center muted">Nenhum item obrigatório sem entrega no filtro selecionado.</td></tr>`}</tbody>
      </table></div>
    </div>`;
  }

  function openCriticalRuptureJustification(date, storeId, productId){
    const store = storeById(storeId);
    const product = productById(productId);
    const current = getCriticalRuptureJustification(date, storeId, productId);
    openModal('Justificar item obrigatório sem entrega', `
      <div class="alert-box">
        <strong>${escapeHtml(store?.nome || 'Loja')}</strong><br>
        <span>${formatDate(date)} • ${escapeHtml(product?.nomeSistema || 'Produto obrigatório')}</span>
      </div>
      <label>Motivo
        <select id="criticalReason">
          ${['Produto sem disponibilidade','Pedido ajustado com a loja','Substituído por outro item','Erro na sugestão/importação','Oferta ou ação comercial específica','Outro motivo'].map(r=>`<option ${current?.reason===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </label>
      <label>Justificativa do comercial
        <textarea id="criticalText" placeholder="Explique por que o item não foi enviado para esta loja nesta data...">${escapeHtml(current?.text || '')}</textarea>
      </label>
      <div class="footer-actions">
        ${current ? `<button class="btn btn-ghost" id="removeCriticalJustification">Remover justificativa</button>` : ''}
        <button class="btn btn-primary" id="saveCriticalJustification">Salvar justificativa</button>
      </div>`);

    $('#saveCriticalJustification').addEventListener('click', async ()=>{
      const text = String($('#criticalText').value || '').trim();
      if (!text) return toast('Informe a justificativa antes de salvar.', 'error');
      const key = criticalRuptureKey(date, storeId, productId);
      Store.data.criticalRuptureJustifications = (Store.data.criticalRuptureJustifications || []).filter(j => j.key !== key);
      Store.data.criticalRuptureJustifications.push({
        id: uid('critjust'), key, date, storeId, productId,
        reason: $('#criticalReason').value,
        text,
        user: state.session?.usuario || 'comercial',
        createdAt: new Date().toISOString()
      });
      await Store.save();
      closeModal();
      toast('Justificativa registrada.');
      render();
    });

    $('#removeCriticalJustification')?.addEventListener('click', async ()=>{
      const key = criticalRuptureKey(date, storeId, productId);
      Store.data.criticalRuptureJustifications = (Store.data.criticalRuptureJustifications || []).filter(j => j.key !== key);
      await Store.save();
      closeModal();
      toast('Justificativa removida. O alerta voltou para pendente.', 'warn');
      render();
    });
  }

  function computeRuptures(filter={}){
    const rows = [];
    const allowedTypes = selectedTypes(filter.tipo || 'AMBOS');
    const stores = Store.data.stores.filter(s => (!filter.rede || s.rede===filter.rede) && (!filter.loja || s.id===filter.loja));
    stores.forEach(store => {
      activeProducts().filter(p=>allowedTypes.includes(p.tipo)).forEach(p => {
        if (!isProductActiveForStore(store.id, p.id)) return;
        const conf = Store.data.conciliation[p.tipo] || {};
        const orderDate = conf.orderDate || todayISO();
        const order = Store.data.orders.find(o=>o.storeId===store.id && o.type===p.tipo && o.date===orderDate);
        const line = order?.lines?.[p.id] || {inventoryGross:0, quebraQty:0, suggestion:0};
        const invGood = getLineInventoryGood(line);
        const suggestion = toNumber(line.suggestion);
        const pending = computePendencies().some(x=>x.order.storeId===store.id && x.productId===p.id && x.pending>0 && x.status==='EM ABERTO');
        if (invGood === 0 && suggestion === 0 && !pending) {
          const lastDelivery = Store.data.deliveries.filter(d=>d.storeId===store.id && d.productId===p.id && validQty(d)>0).sort((a,b)=>b.date.localeCompare(a.date))[0];
          rows.push({store, product:p, lastDelivery:lastDelivery?.date || '', days:lastDelivery ? daysBetween(lastDelivery.date,todayISO()) : null, status:'RUPTURA'});
        } else if (invGood === 0 && suggestion > 0) {
          rows.push({store, product:p, lastDelivery:'', days:null, status:'RISCO'});
        }
      });
    });
    return rows;
  }
  function renderRuptures(){
    setTitle('Rupturas', 'Alertas de itens obrigatórios sem entrega e produtos ativos sem pedido/estoque.');
    const f = state.filters;
    const dayFilter = $('#ruptureDays')?.value || f.ruptureDays || 'ALL';
    f.ruptureDays = dayFilter;
    let rows = computeRuptures(f);
    rows = rows.filter(r=>{
      if (dayFilter === 'ALL') return true;
      if (dayFilter === 'SEM') return r.days == null;
      if (dayFilter === '4PLUS') return Number(r.days) >= 4;
      return Number(r.days) === Number(dayFilter);
    });
    const criticalRows = computeCriticalRuptureAlerts(f);
    const pendingCritical = criticalRows.filter(r=>r.status==='PENDENTE').length;
    const extra = `<div class="filter">Dias sem entrega <select id="ruptureDays"><option value="ALL" ${dayFilter==='ALL'?'selected':''}>Todos</option><option value="SEM" ${dayFilter==='SEM'?'selected':''}>Sem entrega registrada</option><option value="0" ${dayFilter==='0'?'selected':''}>0 dias</option><option value="1" ${dayFilter==='1'?'selected':''}>1 dia</option><option value="2" ${dayFilter==='2'?'selected':''}>2 dias</option><option value="3" ${dayFilter==='3'?'selected':''}>3 dias</option><option value="4PLUS" ${dayFilter==='4PLUS'?'selected':''}>4 dias ou mais</option></select></div>`;
    $('#viewRoot').innerHTML = `
      ${adminFiltersHtml('rupt', extra)}
      <div class="grid kpis">
        ${kpi('🚨','Itens obrigatórios pendentes',pendingCritical,'precisam de justificativa comercial',pendingCritical?'red':'')}
        ${kpi('☘','Itens críticos',criticalRuptureProductCount(f),'monitorados por rede')}
        ${kpi('⚠','Rupturas gerais',rows.filter(r=>r.status==='RUPTURA').length,'mix ativo sem estoque/pedido','amber')}
      </div>
      ${renderCriticalRuptureAlerts(criticalRows)}
      <div class="card"><h3>Alertas de ruptura geral</h3><p class="muted small">Produtos ativos no mix, sem inventário bom e sem pedido da loja.</p><div class="table-wrap"><table>
        <thead><tr><th>Rede</th><th>Loja</th><th>Produto</th><th>Última entrega</th><th class="num">Dias sem entrega</th><th>Status</th></tr></thead>
        <tbody>${rows.map(r=>`<tr><td>${r.store.rede}</td><td>${r.store.nome}</td><td>${r.product.nomeSistema}</td><td>${r.lastDelivery?formatDate(r.lastDelivery):'Sem entrega registrada'}</td><td class="num">${r.days??'—'}</td><td><span class="badge ${r.status==='RUPTURA'?'red':'amber'}">${r.status}</span></td></tr>`).join('') || `<tr><td colspan="6" class="center muted">Sem rupturas no filtro selecionado.</td></tr>`}</tbody>
      </table></div></div>`;
    bindAdminFilters('rupt');
    $('#ruptureDays')?.addEventListener('change', e=>{ state.filters.ruptureDays=e.target.value; });
  }


  function renderMix(){
    setTitle('Mix por Loja', 'Ative ou inative produtos por rede ou por loja. Produto inativo não gera ruptura; se aparecer no PDF, gera alerta.');
    const redes = unique(Store.data.stores.map(s=>s.rede));
    const selectedRede = $('#mixRede')?.value || state.filters.rede || redes[0] || '';
    const storesFromRede = Store.data.stores.filter(s=>!selectedRede || s.rede===selectedRede);
    const currentStoreId = $('#mixStore')?.value || state.filters.loja || '';
    const storeId = storesFromRede.some(s=>s.id===currentStoreId) ? currentStoreId : '';
    const type = $('#mixType')?.value || state.filters.tipo || 'AMBOS';
    const types = selectedTypes(type);
    const products = Store.data.products.filter(p=>p.situacao==='ATIVO' && types.includes(p.tipo));
    const scopeText = storeId ? `somente na loja ${storeById(storeId)?.nome}` : `em todas as lojas da rede ${selectedRede}`;
    $('#viewRoot').innerHTML = `
      <div class="filter-toggle-row">
        <button class="btn btn-ghost" id="mixToggle">☰ Filtros</button>
        <span class="muted small">Clique para exibir ou ocultar os filtros disponíveis.</span>
      </div>
      <div class="filter-row collapsible-filters hidden" id="mixPanel">
        <div class="filter">Rede <select id="mixRede">${redes.map(r=>`<option value="${r}" ${r===selectedRede?'selected':''}>${r}</option>`).join('')}</select></div>
        <div class="filter">Loja <select id="mixStore"><option value="" ${!storeId?'selected':''}>Todas as lojas</option>${storesFromRede.map(s=>`<option value="${s.id}" ${s.id===storeId?'selected':''}>${s.nome}</option>`).join('')}</select></div>
        <div class="filter">Tipo <select id="mixType"><option value="AMBOS" ${type==='AMBOS'?'selected':''}>Ambos</option><option value="FOLHAGEM" ${type==='FOLHAGEM'?'selected':''}>Folhagens</option><option value="BANDEJA" ${type==='BANDEJA'?'selected':''}>Bandejas</option></select></div>
        <button class="btn btn-primary" id="mixApply">Aplicar filtros</button>
      </div>
      <div class="card"><h3>Produtos ativos/inativos no mix</h3><p class="muted small">A ação será aplicada ${scopeText}. Produto inativo não gera ruptura; se aparecer no PDF, gera alerta.</p><div class="table-wrap"><table>
        <thead><tr><th>Produto</th><th>Tipo</th><th>Situação geral</th><th>Status no filtro</th><th>Ação</th></tr></thead>
        <tbody>${products.map(p=>{
          const storesToCheck = storeId ? [storeById(storeId)] : storesFromRede;
          const activeCount = storesToCheck.filter(st=>st && isProductActiveForStore(st.id,p.id)).length;
          const active = activeCount === storesToCheck.length && storesToCheck.length>0;
          const partial = activeCount > 0 && activeCount < storesToCheck.length;
          const label = partial ? 'PARCIAL' : active ? 'ATIVO' : 'INATIVO';
          return `<tr><td>${p.nomeSistema}</td><td>${p.tipo}</td><td>${p.situacao}</td><td><span class="badge ${active?'green':partial?'amber':'red'}">${label}</span></td><td><button class="btn btn-sm ${active?'btn-danger':'btn-soft'}" data-mix-toggle="${p.id}">${active?'Inativar':'Ativar'}</button></td></tr>`;
        }).join('')}</tbody>
      </table></div></div>`;
    $('#mixToggle').addEventListener('click',()=>$('#mixPanel').classList.toggle('hidden'));
    $('#mixRede').addEventListener('change', e=>{state.filters.rede=e.target.value; state.filters.loja=''; renderMix();});
    $('#mixStore').addEventListener('change', e=>{state.filters.loja=e.target.value;});
    $('#mixType').addEventListener('change', e=>{state.filters.tipo=e.target.value;});
    $('#mixApply').addEventListener('click', renderMix);
    $$('[data-mix-toggle]').forEach(btn=>btn.addEventListener('click', async ()=>{
      const productId = btn.dataset.mixToggle;
      const targets = storeId ? Store.data.stores.filter(s=>s.id===storeId) : Store.data.stores.filter(s=>s.rede===selectedRede);
      const currentlyAllActive = targets.length && targets.every(st=>isProductActiveForStore(st.id, productId));
      const newStatus = !currentlyAllActive;
      targets.forEach(st=>{ Store.data.storeMix[`${st.id}|${productId}`] = newStatus; });
      await Store.save();
      toast(`${productById(productId)?.nomeSistema || 'Produto'} ${newStatus?'ativado':'inativado'} ${storeId?'na loja selecionada':'em todas as lojas da rede '+selectedRede}.`, 'ok');
      renderMix();
    }));
  }

  const TICKET_TYPES = ['Erro de sistema','Pedido baixo','Pedido alto/excesso','Divergência de importação','Problema em PDF/XML','Problema na Base de Vendas','Oferta não aplicada','Ruptura / item obrigatório','Inventário de saída','Solicitação comercial','Outro'];
  const TICKET_PRIORITIES = ['Baixa','Média','Alta','Urgente'];

  function currentUserLabel(){
    if (!state.session) return 'Sistema';
    if (state.session.role === 'store') return storeById(state.session.storeId)?.nome || state.session.nome || state.session.usuario;
    return state.session.nome || state.session.usuario || 'Usuário';
  }

  function nextTicketId(){
    const day = todayISO().replace(/-/g,'');
    const prefix = `CH-${day}-`;
    const max = (Store.data.tickets || []).reduce((acc, t) => {
      const id = String(t.id || '');
      if (!id.startsWith(prefix)) return acc;
      const n = parseInt(id.slice(prefix.length), 10);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return prefix + String(max + 1).padStart(4, '0');
  }

  function ticketStatusLabel(status){
    return ({ABERTO:'Aberto', EM_ATENDIMENTO:'Em atendimento', RESOLVIDO:'Resolvido', CANCELADO:'Cancelado'}[status] || status || 'Aberto');
  }

  function ticketStatusClass(status){
    return status === 'RESOLVIDO' ? 'green' : status === 'EM_ATENDIMENTO' ? 'blue' : status === 'CANCELADO' ? 'gray' : 'amber';
  }

  function ticketPriorityClass(priority){
    return priority === 'Urgente' ? 'red' : priority === 'Alta' ? 'amber' : priority === 'Média' ? 'blue' : 'gray';
  }

  function ticketStoreOptionsHtml(rede='', selectedId=''){
    const stores = (Store.data.stores || [])
      .filter(st => !rede || st.rede === rede)
      .sort((a,b)=>a.nome.localeCompare(b.nome));
    return `<option value="">Selecione a loja</option>${stores.map(st => `<option value="${st.id}" ${st.id===selectedId?'selected':''}>${escapeHtml(st.nome)}</option>`).join('')}`;
  }

  function refreshTicketStoreOptions(){
    const rede = $('#ticketRede')?.value || '';
    const select = $('#ticketStore');
    if (!select) return;
    const current = select.value;
    select.innerHTML = ticketStoreOptionsHtml(rede, current);
    if (current && !select.value) select.value = '';
  }

  function openSupportTicketModal(){
    const sessionStore = state.session?.role === 'store' ? storeById(state.session.storeId) : null;
    const defaultRede = sessionStore?.rede || '';
    const defaultStoreId = sessionStore?.id || '';
    const redes = getRedeOptions().filter(Boolean);
    const products = (Store.data.products || [])
      .filter(p => p.situacao === 'ATIVO')
      .sort((a,b)=>a.tipo.localeCompare(b.tipo) || a.nomeSistema.localeCompare(b.nomeSistema));

    openModal('Abrir chamado', `
      <form id="ticketForm" class="ticket-form">
        <p class="muted">Registre erros de sistema, pedidos baixos, divergências ou solicitações comerciais. O chamado aparecerá na aba Chamados para os assistentes e ADM.</p>
        <div class="form-grid">
          <label>Tipo do chamado
            <select id="ticketType" required>
              ${TICKET_TYPES.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
            </select>
          </label>
          <label>Prioridade
            <select id="ticketPriority">
              ${TICKET_PRIORITIES.map(p=>`<option value="${escapeHtml(p)}" ${p==='Média'?'selected':''}>${escapeHtml(p)}</option>`).join('')}
            </select>
          </label>
          <label>Rede
            <select id="ticketRede" ${sessionStore?'disabled':''}>
              <option value="">Selecione a rede</option>
              ${redes.map(r=>`<option value="${escapeHtml(r)}" ${r===defaultRede?'selected':''}>${escapeHtml(r)}</option>`).join('')}
            </select>
          </label>
          <label>Loja
            <select id="ticketStore" ${sessionStore?'disabled':''}>
              ${ticketStoreOptionsHtml(defaultRede, defaultStoreId)}
            </select>
          </label>
          <label>Produto relacionado
            <select id="ticketProduct">
              <option value="">Sem produto específico</option>
              ${products.map(p=>`<option value="${p.id}">${escapeHtml(p.tipo)} • ${escapeHtml(p.nomeSistema)}</option>`).join('')}
            </select>
          </label>
          <label>Data do problema
            <input type="date" id="ticketProblemDate" value="${todayISO()}">
          </label>
        </div>
        <label style="margin-top:12px">Descrição do problema
          <textarea id="ticketDescription" required placeholder="Explique o que aconteceu. Ex.: pedido abaixo da média, erro em PDF/XML, loja sem produto obrigatório, tela travando..."></textarea>
        </label>
        <div class="actions modal-actions">
          <button class="btn btn-primary" type="submit">Abrir chamado</button>
          <button class="btn btn-ghost" type="button" onclick="App.closeModal()">Cancelar</button>
        </div>
      </form>
    `);
    $('#ticketRede')?.addEventListener('change', refreshTicketStoreOptions);
    $('#ticketForm')?.addEventListener('submit', createTicketFromSupport);
  }

  async function createTicketFromSupport(e){
    e?.preventDefault?.();
    const sessionStore = state.session?.role === 'store' ? storeById(state.session.storeId) : null;
    const storeId = sessionStore?.id || $('#ticketStore')?.value || '';
    const store = storeId ? storeById(storeId) : null;
    const rede = sessionStore?.rede || $('#ticketRede')?.value || store?.rede || '';
    const type = $('#ticketType')?.value || 'Outro';
    const priority = $('#ticketPriority')?.value || 'Média';
    const productId = $('#ticketProduct')?.value || '';
    const description = $('#ticketDescription')?.value.trim() || '';
    const problemDate = $('#ticketProblemDate')?.value || todayISO();

    if (!type || !description) return toast('Informe o tipo e a descrição do chamado.', 'warn');

    const ticket = {
      id: nextTicketId(),
      createdAt: new Date().toISOString(),
      createdBy: state.session?.usuario || '',
      createdByName: currentUserLabel(),
      type,
      priority,
      status: 'ABERTO',
      rede,
      storeId,
      storeName: store?.nome || '',
      productId,
      productName: productId ? (productById(productId)?.nomeSistema || '') : '',
      problemDate,
      description,
      assignedTo: '',
      assignedToName: '',
      assignedAt: '',
      resolvedAt: '',
      resolutionNote: ''
    };
    Store.data.tickets ||= [];
    Store.data.tickets.push(ticket);
    await Store.save();
    closeModal();
    toast(`Chamado ${ticket.id} aberto com sucesso.`);
    state.page = 'chamados';
    render();
  }

  function filteredTickets(){
    const f = state.tickets || {};
    const term = normalize(f.search || '');
    return (Store.data.tickets || []).filter(t => {
      if (!ticketVisibleToSession(t)) return false;
      if (f.status && t.status !== f.status) return false;
      if (f.type && t.type !== f.type) return false;
      if (f.priority && t.priority !== f.priority) return false;
      if (term) {
        const hay = normalize([t.id, t.type, t.priority, t.status, t.rede, t.storeName || storeById(t.storeId)?.nome, t.productName || productById(t.productId)?.nomeSistema, t.description, t.createdByName, t.assignedToName].join(' '));
        if (!hay.includes(term)) return false;
      }
      return true;
    }).sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function renderTickets(){
    const storeUser = state.session?.role === 'store';
    setTitle('Chamados', storeUser ? 'Abra e acompanhe os chamados da sua loja.' : 'Acompanhe chamados abertos, aceite atendimentos e finalize com responsável registrado.');
    const all = (Store.data.tickets || []).filter(t => ticketVisibleToSession(t));
    const rows = filteredTickets();
    const open = all.filter(t => t.status === 'ABERTO').length;
    const inProgress = all.filter(t => t.status === 'EM_ATENDIMENTO').length;
    const resolved = all.filter(t => t.status === 'RESOLVIDO').length;
    $('#viewRoot').innerHTML = `
      <div class="grid three">
        ${kpi('✉','Chamados abertos',open,'aguardando aceite','amber')}
        ${kpi('↻','Em atendimento',inProgress,'com responsável definido','blue')}
        ${kpi('✓','Resolvidos',resolved,'finalizados','')}
      </div>
      <div class="card" style="margin-top:14px">
        <div class="view-head" style="margin-bottom:12px">
          <div>
            <h3>Central de chamados</h3>
            <p class="muted">${storeUser ? 'Acompanhe os chamados abertos pela sua loja e veja quem assumiu a tratativa.' : 'Chamados criados pelo botão Abrir atendimento ficam disponíveis para ADM e assistentes comerciais.'}</p>
          </div>
          <div class="actions">
            <button class="btn btn-primary" id="openTicketFromPage">Abrir chamado</button>
          </div>
        </div>
        <div class="filter-row compact">
          <div class="filter">Status
            <select id="ticketFilterStatus">
              <option value="">Todos</option>
              <option value="ABERTO" ${state.tickets.status==='ABERTO'?'selected':''}>Aberto</option>
              <option value="EM_ATENDIMENTO" ${state.tickets.status==='EM_ATENDIMENTO'?'selected':''}>Em atendimento</option>
              <option value="RESOLVIDO" ${state.tickets.status==='RESOLVIDO'?'selected':''}>Resolvido</option>
            </select>
          </div>
          <div class="filter">Tipo
            <select id="ticketFilterType">
              <option value="">Todos</option>
              ${TICKET_TYPES.map(t=>`<option value="${escapeHtml(t)}" ${state.tickets.type===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}
            </select>
          </div>
          <div class="filter">Prioridade
            <select id="ticketFilterPriority">
              <option value="">Todas</option>
              ${TICKET_PRIORITIES.map(p=>`<option value="${escapeHtml(p)}" ${state.tickets.priority===p?'selected':''}>${escapeHtml(p)}</option>`).join('')}
            </select>
          </div>
          <div class="filter">Buscar
            <input id="ticketFilterSearch" value="${escapeHtml(state.tickets.search || '')}" placeholder="número, loja, produto, descrição...">
          </div>
        </div>
        <div class="ticket-list">
          ${rows.map(renderTicketCard).join('') || '<div class="empty">Nenhum chamado encontrado para os filtros selecionados.</div>'}
        </div>
      </div>
    `;
    $('#openTicketFromPage')?.addEventListener('click', openSupportTicketModal);
    $('#ticketFilterStatus')?.addEventListener('change', e => { state.tickets.status = e.target.value; renderTickets(); });
    $('#ticketFilterType')?.addEventListener('change', e => { state.tickets.type = e.target.value; renderTickets(); });
    $('#ticketFilterPriority')?.addEventListener('change', e => { state.tickets.priority = e.target.value; renderTickets(); });
    $('#ticketFilterSearch')?.addEventListener('change', e => { state.tickets.search = e.target.value; renderTickets(); });
    bindTicketActionButtons();
  }

  function bindTicketActionButtons(){
    $$('.ticket-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.ticketId || '';
        const action = btn.dataset.ticketAction || '';
        if (!id) return toast('Chamado não identificado.', 'error');
        if (action === 'accept') {
          btn.disabled = true;
          btn.textContent = 'Aceitando...';
          await acceptTicket(id);
          return;
        }
        if (action === 'resolve-open') {
          openResolveTicket(id);
        }
      });
    });
  }

  function renderTicketCard(t){
    const store = t.storeName || storeById(t.storeId)?.nome || '—';
    const product = t.productName || productById(t.productId)?.nomeSistema || '—';
    const isAssignedToMe = normalizeLogin(t.assignedTo) === normalizeLogin(state.session?.usuario || '');
    const backoffice = isBackofficeUser();
    const canAccept = backoffice && t.status === 'ABERTO';
    const canResolve = backoffice && t.status === 'EM_ATENDIMENTO' && (isAssignedToMe || state.session?.role === 'admin');
    return `
      <div class="ticket-card">
        <div class="ticket-card-head">
          <div>
            <strong>${escapeHtml(t.id)}</strong>
            <span class="muted small">Aberto por ${escapeHtml(t.createdByName || t.createdBy || '—')} em ${formatDateTime(t.createdAt)}</span>
          </div>
          <div class="actions">
            <span class="badge ${ticketStatusClass(t.status)}">${ticketStatusLabel(t.status)}</span>
            <span class="badge ${ticketPriorityClass(t.priority)}">${escapeHtml(t.priority || 'Média')}</span>
          </div>
        </div>
        <div class="ticket-meta">
          <span><b>Tipo:</b> ${escapeHtml(t.type || '—')}</span>
          <span><b>Data:</b> ${formatDate(t.problemDate)}</span>
          <span><b>Rede:</b> ${escapeHtml(t.rede || '—')}</span>
          <span><b>Loja:</b> ${escapeHtml(store)}</span>
          <span><b>Produto:</b> ${escapeHtml(product)}</span>
          <span><b>Responsável:</b> ${escapeHtml(t.assignedToName || 'Sem responsável')}</span>
        </div>
        <p class="ticket-description">${escapeHtml(t.description || '')}</p>
        ${t.resolutionNote ? `<div class="ticket-resolution"><strong>Resolução:</strong> ${escapeHtml(t.resolutionNote)} <span class="muted small">(${formatDateTime(t.resolvedAt)})</span></div>` : ''}
        <div class="actions ticket-actions">
          ${canAccept ? `<button type="button" class="btn btn-sm btn-primary ticket-action-btn" data-ticket-action="accept" data-ticket-id="${escapeHtml(t.id)}">Aceitar chamado</button>` : ''}
          ${canResolve ? `<button type="button" class="btn btn-sm btn-soft ticket-action-btn" data-ticket-action="resolve-open" data-ticket-id="${escapeHtml(t.id)}">Marcar como resolvido</button>` : ''}
        </div>
      </div>`;
  }

  async function acceptTicket(id){
    if (!isBackofficeUser()) return toast('Somente ADM ou assistentes comerciais podem aceitar chamados.', 'warn');
    const t = (Store.data.tickets || []).find(x => String(x.id || '') === String(id || ''));
    if (!t) return toast('Chamado não encontrado.', 'error');
    if (t.status !== 'ABERTO') return toast('Esse chamado já foi aceito ou finalizado.', 'warn');
    t.status = 'EM_ATENDIMENTO';
    t.assignedTo = state.session?.usuario || '';
    t.assignedToName = currentUserLabel();
    t.assignedAt = new Date().toISOString();
    toast(`Chamado ${t.id} aceito por ${t.assignedToName}.`);
    render();
    await Store.save();
  }

  function openResolveTicket(id){
    const t = (Store.data.tickets || []).find(x => String(x.id || '') === String(id || ''));
    if (!t) return toast('Chamado não encontrado.', 'error');
    const isAssignedToMe = normalizeLogin(t.assignedTo) === normalizeLogin(state.session?.usuario || '');
    if (t.status !== 'EM_ATENDIMENTO' || (!isAssignedToMe && state.session?.role !== 'admin')) return toast('Somente o responsável ou ADM pode finalizar esse chamado.', 'warn');
    openModal(`Resolver chamado ${escapeHtml(t.id)}`, `
      <p><strong>Responsável:</strong> ${escapeHtml(t.assignedToName || '—')}</p>
      <p class="muted">Informe como o chamado foi tratado antes de marcar como resolvido.</p>
      <label>Observação de resolução
        <textarea id="ticketResolutionNote" placeholder="Ex.: Pedido corrigido, erro validado, loja orientada..."></textarea>
      </label>
      <div class="actions modal-actions">
        <button type="button" class="btn btn-primary" id="ticketResolveConfirm" data-ticket-id="${escapeHtml(t.id)}">Salvar como resolvido</button>
        <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
      </div>
    `);
    $('#ticketResolveConfirm')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = 'Salvando...';
      await resolveTicket(e.currentTarget.dataset.ticketId || id);
    });
  }

  async function resolveTicket(id){
    const t = (Store.data.tickets || []).find(x => String(x.id || '') === String(id || ''));
    if (!t) return toast('Chamado não encontrado.', 'error');
    const isAssignedToMe = normalizeLogin(t.assignedTo) === normalizeLogin(state.session?.usuario || '');
    if (t.status !== 'EM_ATENDIMENTO' || (!isAssignedToMe && state.session?.role !== 'admin')) return toast('Somente o responsável ou ADM pode finalizar esse chamado.', 'warn');
    const note = $('#ticketResolutionNote')?.value.trim() || '';
    t.status = 'RESOLVIDO';
    t.resolutionNote = note || 'Chamado resolvido.';
    t.resolvedAt = new Date().toISOString();
    closeModal();
    toast(`Chamado ${t.id} resolvido.`);
    render();
    await Store.save();
  }

  function getUserByLogin(login){
    return (Store.data.users || []).find(u => normalizeLogin(u.usuario) === normalizeLogin(login));
  }

  function renderPermissionChecks(user){
    const selected = new Set(sanitizePermissions(user.permissions || []));
    return `<div class="permission-grid">${ADMIN_PAGES.filter(p => !p.adminOnly).map(p => `
      <label class="permission-option">
        <input type="checkbox" data-permission-check="${p.id}" ${selected.has(p.id) ? 'checked' : ''}>
        <span><strong>${p.label}</strong><small>${p.id}</small></span>
      </label>`).join('')}</div>`;
  }

  function openUserPermissions(login){
    const u = getUserByLogin(login);
    if (!u || u.role !== 'commercial') return toast('Permissões disponíveis apenas para usuários comerciais.', 'warn');
    openModal(`Permissões - ${escapeHtml(u.nome || u.usuario)}`, `
      <p class="muted">Marque somente as funções que este assistente comercial poderá acessar. A aba Usuários permanece exclusiva do acesso gerenciacomercial.</p>
      ${renderPermissionChecks(u)}
      <div class="actions modal-actions">
        <button class="btn btn-primary" onclick="App.saveUserPermissions('${escapeHtml(u.usuario)}')">Salvar permissões</button>
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
      </div>
    `);
  }

  async function saveUserPermissions(login){
    const u = getUserByLogin(login);
    if (!u || u.role !== 'commercial') return;
    u.permissions = sanitizePermissions($$('[data-permission-check]', $('#modalBody')).filter(c=>c.checked).map(c=>c.dataset.permissionCheck));
    if (!u.permissions.length) return toast('Selecione pelo menos uma função para este usuário.', 'warn');
    if (state.session && normalizeLogin(state.session.usuario) === normalizeLogin(u.usuario)) {
      state.session.permissions = [...u.permissions];
      if (!userCanAccessPage(state.page, state.session)) state.page = firstAccessibleAdminPage(state.session);
    }
    await Store.save();
    closeModal();
    toast('Permissões atualizadas.');
    renderUsers();
  }

  async function createCommercialUser(){
    const nome = $('#newUserName')?.value.trim();
    const usuario = $('#newUserLogin')?.value.trim();
    const senha = $('#newUserPass')?.value.trim();
    if (!nome || !usuario || !senha) return toast('Preencha nome, usuário e senha.', 'warn');
    if (getUserByLogin(usuario)) return toast('Já existe um usuário com esse login.', 'error');
    const user = normalizeSystemUser({nome, usuario, senha, role:'commercial', active:true, permissions:[...DEFAULT_COMMERCIAL_PERMISSIONS]});
    Store.data.deletedCommercialUsers = (Store.data.deletedCommercialUsers || []).filter(u => normalizeLogin(u) !== normalizeLogin(usuario));
    Store.data.users.push(user);
    await Store.save();
    toast('Usuário comercial criado. Clique em Permissões para ajustar as funções.');
    renderUsers();
  }

  async function saveCommercialUser(login){
    const u = getUserByLogin(login);
    if (!u || u.role !== 'commercial') return;
    const row = $(`[data-commercial-row="${CSS.escape(normalizeLogin(login))}"]`);
    u.nome = row?.querySelector('[data-commercial-name]')?.value.trim() || u.nome;
    u.usuario = row?.querySelector('[data-commercial-login]')?.value.trim() || u.usuario;
    u.senha = row?.querySelector('[data-commercial-pass]')?.value.trim() || u.senha;
    u.active = !!row?.querySelector('[data-commercial-active]')?.checked;
    u.permissions = sanitizePermissions(u.permissions || DEFAULT_COMMERCIAL_PERMISSIONS);
    Store.data.users = syncUsersWithStores(Store.data.users, Store.data.stores, Store.data.deletedCommercialUsers || []);
    await Store.save();
    toast('Usuário atualizado.');
    renderUsers();
  }

  async function deleteCommercialUser(login){
    const u = getUserByLogin(login);
    if (!u || u.role !== 'commercial') return;
    if (!confirm(`Excluir o usuário ${u.nome || u.usuario}?`)) return;
    Store.data.users = (Store.data.users || []).filter(x => normalizeLogin(x.usuario) !== normalizeLogin(login));
    Store.data.deletedCommercialUsers ||= [];
    Store.data.deletedCommercialUsers = unique([...Store.data.deletedCommercialUsers, normalizeLogin(login)]);
    await Store.save();
    toast('Usuário comercial excluído.');
    renderUsers();
  }

  function renderUsers(){
    setTitle('Usuários e permissões', 'Crie usuários comerciais e defina quais funções cada assistente pode acessar.');
    const commercial = (Store.data.users || []).filter(u=>u.role==='commercial');
    const storeUsers = (Store.data.users || []).filter(u=>u.role==='store');
    const admin = (Store.data.users || []).find(u=>u.role==='admin') || ADMIN_USER;
    $('#viewRoot').innerHTML = `
      <div class="grid two">
        <div class="card">
          <h3>Usuário principal</h3>
          <p class="muted">Este é o seu acesso geral. Ele sempre terá todas as funções do sistema.</p>
          <div class="user-admin-card">
            <strong>${escapeHtml(admin.nome || ADMIN_USER.nome)}</strong>
            <span>Usuário: <b>${escapeHtml(ADMIN_USER.usuario)}</b></span>
            <span class="badge green">Acesso total</span>
          </div>
        </div>
        <div class="card">
          <h3>Criar usuário comercial</h3>
          <div class="filter-row compact">
            <div class="filter">Nome <input id="newUserName" placeholder="Nome do assistente"></div>
            <div class="filter">Usuário <input id="newUserLogin" placeholder="ex: nome.sobrenome"></div>
            <div class="filter">Senha <input id="newUserPass" placeholder="senha"></div>
            <button class="btn btn-primary" id="createCommercialUserBtn">Criar usuário</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Usuários comerciais</h3>
        <p class="muted small">Clique em Permissões para selecionar as funções liberadas para cada assistente.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Ativo</th><th>Nome</th><th>Usuário</th><th>Senha</th><th>Funções liberadas</th><th>Ações</th></tr></thead>
          <tbody>${commercial.map(u=>{
            const key = normalizeLogin(u.usuario);
            const permissionLabels = (u.permissions || []).map(id => ADMIN_PAGES.find(p=>p.id===id)?.label || id);
            return `<tr data-commercial-row="${key}">
              <td><input type="checkbox" data-commercial-active ${u.active !== false ? 'checked' : ''}></td>
              <td><input value="${escapeHtml(u.nome || '')}" data-commercial-name></td>
              <td><input value="${escapeHtml(u.usuario || '')}" data-commercial-login></td>
              <td><input value="${escapeHtml(u.senha || '')}" data-commercial-pass></td>
              <td><span class="muted small">${permissionLabels.length ? permissionLabels.join(', ') : 'Nenhuma função'}</span></td>
              <td class="actions">
                <button class="btn btn-sm btn-soft" data-permissions-user="${escapeHtml(u.usuario)}">Permissões</button>
                <button class="btn btn-sm btn-primary" data-save-commercial="${escapeHtml(u.usuario)}">Salvar</button>
                <button class="btn btn-sm btn-danger" data-delete-commercial="${escapeHtml(u.usuario)}">Excluir</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>

      <div class="card">
        <h3>Usuários das lojas</h3>
        <p class="muted small">Usuários vinculados às lojas continuam com acesso apenas às telas de pedido da própria loja.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Rede</th><th>Loja</th><th>Usuário</th><th>Senha</th><th>Ação</th></tr></thead>
          <tbody>${storeUsers.map(u=>{
            const s=storeById(u.storeId);
            return `<tr><td>${escapeHtml(s?.rede||'')}</td><td>${escapeHtml(s?.nome||'')}</td><td>${escapeHtml(u.usuario)}</td><td><input value="${escapeHtml(u.senha)}" data-user-pass="${escapeHtml(u.usuario)}"></td><td><button class="btn btn-sm btn-soft" data-save-user="${escapeHtml(u.usuario)}">Salvar senha</button></td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;

    $('#createCommercialUserBtn')?.addEventListener('click', createCommercialUser);
    $$('[data-permissions-user]').forEach(btn=>btn.addEventListener('click',()=>openUserPermissions(btn.dataset.permissionsUser)));
    $$('[data-save-commercial]').forEach(btn=>btn.addEventListener('click',()=>saveCommercialUser(btn.dataset.saveCommercial)));
    $$('[data-delete-commercial]').forEach(btn=>btn.addEventListener('click',()=>deleteCommercialUser(btn.dataset.deleteCommercial)));
    $$('[data-save-user]').forEach(btn=>btn.addEventListener('click', async ()=>{
      const u = Store.data.users.find(x=>x.usuario===btn.dataset.saveUser);
      if (!u) return;
      u.senha = $(`[data-user-pass="${CSS.escape(u.usuario)}"]`).value;
      await Store.save();
      toast('Senha atualizada.');
    }));
  }

  function renderHistory(){
    setTitle('Histórico e Auditoria', 'Registros importados, ajustes e ações do sistema.');
    const byStore = deliverySummaryByStore().slice(0,150);
    const byRede = deliverySummaryByRede().slice(0,80);
    $('#viewRoot').innerHTML = `
      <div class="grid two">
        <div class="card"><h3>Resumo por loja/nota</h3>${renderStoreDeliverySummary(byStore)}</div>
        <div class="card"><h3>Resumo consolidado por rede</h3>${renderRedeDeliverySummary(byRede)}</div>
      </div>
      <div class="card" style="margin-top:14px"><h3>Solicitações de correção</h3>${renderCorrectionsTable(Store.data.corrections)}</div>`;
  }

  function deliverySummaryByStore(){
    const map = new Map();
    for (const d of Store.data.deliveries) {
      const key = `${d.date}|${d.rede}|${d.storeId}|${d.orderNumber||d.fileName||''}`;
      if (!map.has(key)) map.set(key,{key,date:d.date,rede:d.rede,storeId:d.storeId,orderNumber:d.orderNumber||'—',items:0,qty:0,value:0,importedAt:d.importedAt});
      const g=map.get(key);
      g.items += 1;
      g.qty += validQty(d);
      g.value += validValue(d);
      if (d.importedAt > g.importedAt) g.importedAt = d.importedAt;
    }
    return Array.from(map.values()).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (a.rede||'').localeCompare(b.rede||''));
  }

  function deliverySummaryByRede(){
    const map = new Map();
    for (const d of Store.data.deliveries) {
      const key = `${d.date}|${d.rede}`;
      if (!map.has(key)) map.set(key,{key,date:d.date,rede:d.rede,stores:new Set(),notes:new Set(),items:0,qty:0,value:0});
      const g=map.get(key);
      g.stores.add(d.storeId); g.notes.add(d.orderNumber||d.fileName||d.id);
      g.items += 1; g.qty += validQty(d); g.value += validValue(d);
    }
    return Array.from(map.values()).map(g=>({...g, storesCount:g.stores.size, notesCount:g.notes.size})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  }

  function renderStoreDeliverySummary(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Rede</th><th>Loja</th><th>Nº nota/pedido</th><th class="num">Qtd. itens</th><th class="num">Qtd. produtos enviados</th><th class="num">Valor total</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${formatDate(r.date)}</td><td>${r.rede}</td><td>${storeById(r.storeId)?.nome||''}</td><td>${escapeHtml(r.orderNumber)}</td><td class="num">${fmt.format(r.items)}</td><td class="num">${fmt.format(r.qty)}</td><td class="num">${money.format(r.value)}</td></tr>`).join('') || `<tr><td colspan="7" class="center muted">Sem entregas importadas.</td></tr>`}
    </tbody></table></div>`;
  }

  function renderRedeDeliverySummary(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Rede</th><th class="num">Lojas/notas</th><th class="num">Qtd. itens</th><th class="num">Qtd. produtos enviados</th><th class="num">Valor total</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${formatDate(r.date)}</td><td>${r.rede}</td><td class="num">${fmt.format(r.storesCount)} lojas / ${fmt.format(r.notesCount)} notas</td><td class="num">${fmt.format(r.items)}</td><td class="num">${fmt.format(r.qty)}</td><td class="num">${money.format(r.value)}</td></tr>`).join('') || `<tr><td colspan="6" class="center muted">Sem entregas importadas.</td></tr>`}
    </tbody></table></div>`;
  }

  function openCorrectionModal(storeId, productId, field){
    openModal('Solicitar correção', `
      <label>Campo/assunto<input id="corrField" value="${escapeHtml(field||'Correção')}" /></label>
      <label>Correção solicitada<textarea id="corrText" placeholder="Descreva o que está errado e qual deve ser a correção..."></textarea></label>
      <div class="footer-actions"><button class="btn btn-primary" id="sendCorrection">Enviar solicitação</button></div>`);
    $('#sendCorrection').addEventListener('click', async ()=>{
      Store.data.corrections.push({id:uid('corr'), storeId, productId, field:$('#corrField').value, text:$('#corrText').value, status:'PENDENTE', createdAt:new Date().toISOString(), user:state.session.usuario});
      await Store.save();
      closeModal();
      toast('Solicitação enviada ao ADM.');
      render();
    });
  }

  function renderCorrectionsTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Loja</th><th>Produto</th><th>Campo</th><th>Solicitação</th><th>Status</th><th>Ação</th></tr></thead><tbody>
    ${rows.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(c=>`<tr><td>${formatDateTime(c.createdAt)}</td><td>${storeById(c.storeId)?.nome||''}</td><td>${productById(c.productId)?.nomeSistema||'—'}</td><td>${escapeHtml(c.field)}</td><td>${escapeHtml(c.text||'')}</td><td><span class="badge ${c.status==='PENDENTE'?'amber':'green'}">${c.status}</span></td><td>${state.session?.role==='admin'&&c.status==='PENDENTE'?`<button class="btn btn-sm btn-soft" onclick="App.resolveCorrection('${c.id}')">Marcar resolvida</button>`:''}</td></tr>`).join('') || `<tr><td colspan="7" class="center muted">Sem solicitações.</td></tr>`}
    </tbody></table></div>`;
  }
  function resolveCorrection(id){
    const c=Store.data.corrections.find(x=>x.id===id);
    c.status='RESOLVIDA'; c.resolvedAt=new Date().toISOString(); c.resolvedBy=state.session.usuario;
    Store.save().then(()=>{toast('Solicitação resolvida.'); render();});
  }

  function computeMetrics(f={}){
    const allowedTypes = selectedTypes(f.tipo || 'AMBOS');
    const deliveries = Store.data.deliveries.filter(d=>{
      const s=storeById(d.storeId);
      const p=productById(d.productId);
      return (!f.rede || s?.rede===f.rede) && (!f.loja || d.storeId===f.loja) && (!p || allowedTypes.includes(p.tipo)) && dateInRange(d.date, f.dateFrom, f.dateTo);
    });
    const vendaValida = deliveries.reduce((a,d)=>a+validValue(d),0);
    const faltas = deliveries.reduce((a,d)=>a+toNumber(d.faltaQty)*toNumber(d.unitCost),0);
    const qualidade = deliveries.reduce((a,d)=>a+toNumber(d.qualidadeQty)*toNumber(d.unitCost),0);
    const quebra = computeBreakageValue(f);
    return {vendaValida, faltas, qualidade, quebra};
  }
  function computeBreakageValue(f={}){
    let total = 0;
    for (const o of Store.data.orders) {
      const s=storeById(o.storeId);
      if (f.rede && s?.rede!==f.rede) continue;
      if (f.loja && o.storeId!==f.loja) continue;
      if (!dateInRange(o.date, f.dateFrom, f.dateTo)) continue;
      if (!selectedTypes(f.tipo || 'AMBOS').includes(o.type)) continue;
      for (const line of Object.values(o.lines||{})) {
        const cost = latestCost(o.storeId,line.productId,o.date);
        total += toNumber(line.quebraQty) * cost;
      }
    }
    return total;
  }
  function computeTopQuebra(f={}){
    return storesForGlobalFilters().map(store=>{
      const ff={...f, loja:store.id};
      return {store, quebra:computeBreakageValue(ff), venda:Store.data.deliveries.filter(d=>d.storeId===store.id && dateInRange(d.date,f.dateFrom,f.dateTo)).reduce((a,d)=>a+validValue(d),0)};
    }).filter(r=>r.quebra>0).sort((a,b)=>b.quebra-a.quebra);
  }

  function renderSimpleChart(f={}){
    const allowedTypes = selectedTypes(f.tipo || 'AMBOS');
    const dates = unique((Store.data.deliveries || []).filter(d=>{
      const s = storeById(d.storeId);
      const p = productById(d.productId);
      return (!f.rede || s?.rede === f.rede)
        && (!f.loja || d.storeId === f.loja)
        && (!p || allowedTypes.includes(p.tipo))
        && dateInRange(d.date,f.dateFrom,f.dateTo);
    }).map(d=>d.date)).sort().slice(-7);
    if (!dates.length) return `<div class="empty">Não há XML/PDF importado para os filtros atuais.</div>`;
    const values = dates.map(date=>{
      const ff={...f,dateFrom:date,dateTo:date};
      const m=computeMetrics(ff);
      return {date, venda:m.vendaValida, quebra:m.quebra};
    });
    const max = Math.max(...values.map(v=>v.venda),1);
    return `<div class="barchart">${values.map(v=>`<div class="bar"><span style="height:${Math.max(8,(v.venda/max)*170)}px"></span><label>${formatDateShort(v.date)}</label></div>`).join('')}</div>
      <div class="metrics-line">${values.map(v=>`<span>${money.format(v.venda)} / ${money.format(v.quebra)}</span>`).join('')}</div>`;
  }

  function renderDeliveryTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Rede</th><th>Loja</th><th>Produto</th><th class="num">Qtd. PDF</th><th class="num">Falta</th><th class="num">Qualidade</th><th class="num">Entrega válida</th><th class="num">Custo</th></tr></thead><tbody>
      ${rows.map(d=>`<tr><td>${formatDate(d.date)}</td><td>${d.rede}</td><td>${storeById(d.storeId)?.nome||''}</td><td>${productById(d.productId)?.nomeSistema||d.productRaw}</td><td class="num">${fmt.format(d.qtyPdf)}</td><td class="num">${fmt.format(d.faltaQty||0)}</td><td class="num">${fmt.format(d.qualidadeQty||0)}</td><td class="num">${fmt.format(validQty(d))}</td><td class="num">${money.format(d.unitCost)}</td></tr>`).join('') || `<tr><td colspan="9" class="center muted">Sem entregas importadas.</td></tr>`}
    </tbody></table></div>`;
  }
  function renderOrdersTable(rows){
    return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Status</th><th>Enviado em</th><th class="num">Itens</th></tr></thead><tbody>
      ${rows.map(o=>`<tr><td>${formatDate(o.date)}</td><td>${o.type}</td><td><span class="badge ${o.status==='ENVIADO'?'green':'gray'}">${o.status}</span></td><td>${o.submittedAt?formatDateTime(o.submittedAt):'—'}</td><td class="num">${Object.keys(o.lines||{}).length}</td></tr>`).join('') || `<tr><td colspan="5" class="center muted">Sem pedidos.</td></tr>`}
    </tbody></table></div>`;
  }

  function kpi(icon,title,value,sub,type=''){
    return `<div class="card kpi ${type}"><div class="kpi-icon">${icon}</div><div><div class="muted">${title}</div><div class="value">${value}</div><div class="small muted">${sub||''}</div></div></div>`;
  }
  function miniPanel(title, body){
    return `<div class="card"><h3>${title}</h3>${body}</div>`;
  }
  function renderPendenciesSummary(){
    const p=computePendencies();
    return `<p>Pendências abertas <strong class="negative">${p.filter(x=>x.pending>0).length}</strong></p><p>Não entregues <strong>${p.filter(x=>x.status==='NÃO ENTREGUE').length}</strong></p><button class="btn btn-sm btn-soft" onclick="App.go('pendencias')">Ver todas</button>`;
  }
  function renderRupturesSummary(){
    const r=computeRuptures();
    const critical = computeCriticalRuptureAlerts({onlyPending:true});
    return `<p>Itens obrigatórios pendentes <strong class="negative">${critical.length}</strong></p><p>Rupturas abertas <strong class="negative">${r.filter(x=>x.status==='RUPTURA').length}</strong></p><p>Em risco <strong class="positive">${r.filter(x=>x.status==='RISCO').length}</strong></p><button class="btn btn-sm btn-soft" onclick="App.go('rupturas')">Ver painel</button>`;
  }

  function renderInactiveDeliveriesSummary(){
    const rows = Store.data.deliveries.filter(d=>!isProductActiveForStore(d.storeId,d.productId));
    const value = rows.reduce((a,d)=>a+validValue(d),0);
    return `<p>Itens inativos entregues <strong>${rows.length}</strong></p><p>Valor impactado <strong>${money.format(value)}</strong></p><button class="btn btn-sm btn-soft" onclick="App.go('mix')">Ver mix</button>`;
  }
  function renderCorrectionsSummary(){
    const pending = Store.data.corrections.filter(c=>c.status==='PENDENTE').length;
    return `<p>Aguardando resposta <strong class="negative">${pending}</strong></p><p>Respondidas <strong>${Store.data.corrections.filter(c=>c.status==='RESOLVIDA').length}</strong></p><button class="btn btn-sm btn-soft" onclick="App.go('historico')">Ver solicitações</button>`;
  }
  function renderMissingQualityMini(){
    const rows = Store.data.deliveries.filter(d=>toNumber(d.faltaQty)>0 || toNumber(d.qualidadeQty)>0).slice(-5);
    return `<table><thead><tr><th>Produto</th><th class="num">Falta R$</th><th class="num">Qualidade R$</th></tr></thead><tbody>${rows.map(d=>`<tr><td>${productById(d.productId)?.nomeSistema}</td><td class="num">${money.format(toNumber(d.faltaQty)*toNumber(d.unitCost))}</td><td class="num">${money.format(toNumber(d.qualidadeQty)*toNumber(d.unitCost))}</td></tr>`).join('') || `<tr><td colspan="3" class="center muted">Sem ocorrências</td></tr>`}</tbody></table><button class="btn btn-sm btn-soft" onclick="App.go('faltas')">Ver relatório</button>`;
  }

  function daysBetween(a,b){
    const da = new Date(a+'T12:00:00'), db = new Date(b+'T12:00:00');
    return Math.max(0, Math.round((db-da)/(1000*60*60*24)));
  }
  function formatDate(d){
    if (!d) return '—';
    const [y,m,day] = String(d).slice(0,10).split('-');
    return day && m && y ? `${day}/${m}/${y}` : d;
  }
  function formatDateShort(d){
    if (!d) return '—';
    const [y,m,day] = String(d).slice(0,10).split('-');
    return day && m ? `${day}/${m}` : d;
  }
  function formatDateTime(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR');
  }
  function escapeHtml(str){
    return String(str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function jsArg(value){
    return JSON.stringify(String(value ?? ''));
  }
  function openModal(title, body){
    const modal = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = body;
    try {
      if (typeof modal.showModal === 'function') {
        if (modal.open) modal.close();
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
    } catch(err) {
      console.warn('Falha ao abrir modal. Usando abertura simples.', err);
      modal.setAttribute('open', '');
    }
  }
  function closeModal(){
    const modal = $('#modal');
    if (!modal) return;
    try { modal.open ? modal.close() : modal.removeAttribute('open'); }
    catch(_) { modal.removeAttribute('open'); }
  }

  function bindGlobal(){
    $('#loginForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const user = normalizeLogin($('#loginUser').value);
      const pass = $('#loginPass').value.trim();

      let found = null;

      try {
        // Garante que o cadastro principal exista mesmo se Firebase/localStorage vier vazio ou corrompido.
        if (!Store.data || typeof Store.data !== 'object') Store.data = Store.seed();
        Store.data.stores = enrichStoreCnpjs(mergeCadastroById(Store.data.stores, window.DEFAULT_STORES || []));
        Store.data.deletedCommercialUsers ||= [];
        Store.data.users = syncUsersWithStores(Store.data.users || [], Store.data.stores || [], Store.data.deletedCommercialUsers || []);
        found = (Store.data.users || []).find(u => normalizeLogin(u.usuario) === user && String(u.senha || '') === pass);
      } catch(loginDataError) {
        console.warn('Falha ao preparar base de usuários. Usando acessos padrão.', loginDataError);
        try { Store.data = migrate(Store.seed()); } catch(_) { Store.data = Store.seed(); }
      }

      // Acesso ADM de recuperação: nunca depende da nuvem, cache ou cadastro salvo.
      if (!found && user === normalizeLogin(ADMIN_USER.usuario) && pass === ADMIN_USER.senha) {
        found = normalizeSystemUser({ ...ADMIN_USER });
      }

      // Recuperação dos usuários comerciais padrão quando a nuvem/cache vier sem eles.
      if (!found) {
        const defCommercial = DEFAULT_COMMERCIAL_USERS.find(u => normalizeLogin(u.usuario) === user && String(u.senha || '') === pass);
        if (defCommercial) found = normalizeSystemUser({...defCommercial, permissions:[...(defCommercial.permissions || [])]});
      }

      // Recuperação dos usuários de loja/promotor pelo cadastro padrão.
      if (!found) {
        const defStore = (window.DEFAULT_STORES || []).find(s => normalizeLogin(s.usuario) === user && String(s.senha || '') === pass);
        if (defStore) found = normalizeSystemUser({ usuario:defStore.usuario, senha:defStore.senha, nome:defStore.nome, role:'store', storeId:defStore.id, active:defStore.ativo !== false });
      }

      if (!found) return toast('Usuário ou senha inválidos.', 'error');
      if (found.active === false) return toast('Usuário inativo. Fale com o administrador.', 'error');

      // Atualiza a base em segundo plano, mas não bloqueia a entrada do usuário.
      try {
        Store.data ||= Store.seed();
        Store.data.users = syncUsersWithStores(Store.data.users || [], Store.data.stores || [], Store.data.deletedCommercialUsers || []);
        const exists = (Store.data.users || []).some(u => normalizeLogin(u.usuario) === normalizeLogin(found.usuario));
        if (!exists) Store.data.users.push(found);
        const skipCloudDuringStartup = !!(Store._initializing && Store.usingCloud && !Store._cloudReadComplete);
        Store.save({skipCloud: skipCloudDuringStartup}).catch(err => console.warn('Falha ao salvar recuperação de usuário.', err));
      } catch(saveLoginUserError) {
        console.warn('Falha ao persistir usuário recuperado.', saveLoginUserError);
      }

      state.session = normalizeSystemUser({ ...found });
      state.page = isBackofficeUser(state.session) ? firstAccessibleAdminPage(state.session) : 'inicio-loja';
      render();
    });
    $('#logoutBtn').addEventListener('click',()=>{state.session=null; state.mobileMode=false; document.body.classList.remove('store-user','admin-user','store-mobile','sidebar-open'); renderLogin();});
    $('#sidebarToggle').addEventListener('click',(e)=>{ e.stopPropagation(); document.body.classList.toggle('sidebar-open'); });
    $('.sidebar')?.addEventListener('click', e=>e.stopPropagation());
    document.addEventListener('click', e=>{
      if (!document.body.classList.contains('sidebar-open')) return;
      if (e.target.closest('.sidebar') || e.target.closest('#sidebarToggle')) return;
      document.body.classList.remove('sidebar-open');
    });
    $('#mobileModeBtn')?.addEventListener('click',()=>{
      if (isBackofficeUser()) return;
      state.mobileMode = !state.mobileMode;
      document.body.classList.toggle('store-mobile', state.mobileMode);
      $('#mobileModeBtn').textContent = state.mobileMode ? '🖥️ Fechar modo mobile' : '📱 Abrir modo mobile';
      toast(state.mobileMode ? 'Modo mobile ativado para acesso pelo celular.' : 'Modo mobile desativado.');
    });
    document.addEventListener('click', e=>{
      const actionButton = e.target.closest('[data-app-action]');
      if (actionButton) {
        e.preventDefault();
        e.stopPropagation();
        const action = actionButton.dataset.appAction || '';
        const key = decodeIssueKeyFromAttr(actionButton.dataset.key || '');
        try {
          if (action === 'toggle-pdf-history') return togglePdfHistory(key);
          if (action === 'delete-delivery-batch') return deleteDeliveryBatch(key);
          if (action === 'delete-delivery-import') return deleteDeliveryImport(key);
          if (action === 'delete-sales-import') return deleteSalesImport(key);
          if (action === 'show-sales-pendencies') return showSalesImportPendencies(key);
          if (action === 'show-import-alert') return showImportAlert(actionButton.dataset.scope || '', key);
          if (action === 'go') return go(actionButton.dataset.page || key);
        } catch(actionError) {
          console.error('Falha ao executar ação do botão.', action, actionError);
          toast('Falha ao executar esta ação. Recarregue a página com Ctrl+F5 e tente novamente.', 'error');
        }
        return;
      }

      const issueButton = e.target.closest('[data-import-issue-action="open"]');
      if (issueButton) {
        e.preventDefault();
        e.stopPropagation();
        const key = decodeIssueKeyFromAttr(issueButton.dataset.issueKey || '');
        openImportIssueOptions(key);
        return;
      }
      const issueRow = e.target.closest('[data-import-issue-row="1"]');
      if (issueRow && !e.target.closest('button,a,input,select,textarea')) {
        e.preventDefault();
        const key = decodeIssueKeyFromAttr(issueRow.dataset.issueKey || '');
        openImportIssueOptions(key);
      }
    });
    $('[data-action="open-support"]')?.addEventListener('click', e=>{
      e.preventDefault();
      openSupportTicketModal();
    });
  }

  function go(page){
    if (state.session && !userCanAccessPage(page)) return toast('Seu usuário não tem permissão para essa função.', 'warn');
    state.page=page;
    render();
  }

  function togglePdfHistory(key){
    state.expandedPdfImports[key] = !state.expandedPdfImports[key];
    render();
  }

  function changePdfCalendarMonth(delta){
    const base = currentPdfCalendarMonth();
    const d = new Date(`${base}-01T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    state.pdfCalendarMonth = d.toISOString().slice(0,7);
    state.pdfCalendarSelectedDate = '';
    render();
  }

  function selectPdfCalendarDay(date){
    state.pdfCalendarSelectedDate = date;
    state.pdfCalendarMonth = String(date || todayISO()).slice(0,7);
    render();
  }

  async function saveAndRender(successMessage, {errorMessage='A ação foi aplicada nesta tela, mas houve falha ao salvar. Verifique o Firebase/IndexedDB.', rerender=true}={}){
    try {
      await Store.save();
      if (successMessage) toast(successMessage, 'ok');
    } catch(err) {
      console.warn('Falha ao salvar após ação do operador.', err);
      toast(errorMessage, 'warn');
    } finally {
      if (rerender) render();
    }
  }

  function showImportAlert(scope, key){
    const details = scope === 'batch' ? alertDetailsForBatch(key) : alertDetailsForNote(key);
    openModal('Motivo do alerta', `
      ${details.length
        ? `<ul class="alert-list">${details.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul>`
        : '<p class="muted">Nenhuma divergência real encontrada para este registro.</p>'}
    `);
  }

  function detectSalesRedeFromSheet(sheetName){
    const n = normalize(sheetName);
    if (n.includes('DIA A DIA') || n === 'DIA A DIA' || n.includes('REDE DIA')) return 'DIA A DIA';
    if (n.includes('COSTA')) return 'COSTA ATACADÃO';
    if (n.includes('COMPER') || n.includes('FORT') || n.includes('GRUPO PEREIRA')) return 'COMPER/FORT';
    return '';
  }

  function cleanSalesProductName(value){
    return String(value || '').split('|')[0].trim();
  }

  function getRowValue(row, names){
    const keys = Object.keys(row || {});
    const byNorm = new Map(keys.map(k => [normalize(k), k]));
    for (const name of names) {
      const key = byNorm.get(normalize(name));
      if (key != null && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
    }
    return '';
  }

  function updateSalesProgress(current, total, message){
    const el = $('#salesImportLog');
    if (!el) return;
    const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    el.innerHTML = `
      <div class="pdf-progress-box">
        <div class="pdf-progress-head"><strong>Importando base de vendas</strong><span>${pct}%</span></div>
        <div class="pdf-progress-bar"><span style="width:${pct}%"></span></div>
        <div class="pdf-progress-text">${escapeHtml(message || 'Processando planilha...')}</div>
        <div class="muted small">Processamento em lote para evitar travamento. Aguarde até concluir.</div>
      </div>`;
  }

  function pushLimitedIssue(list, issue, limit=250){
    if (!Array.isArray(list)) return;
    if (list.length < limit) list.push(issue);
  }

  function sheetCellValue(sheet, r, c){
    const cell = sheet[XLSX.utils.encode_cell({r, c})];
    if (!cell) return '';
    if (cell.t === 'd' && cell.v instanceof Date) return cell.v;
    if (cell.v !== undefined && cell.v !== null) return cell.v;
    return cell.w || '';
  }

  function findSalesHeader(sheet, range){
    const maxRows = Math.min(range.e.r, range.s.r + 15);
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

  function salesDateSummary(filters={}){
    const rede = filters.rede || '';
    const month = filters.month || '';
    const map = new Map();
    (Store.data.sales || []).forEach(r => {
      if (rede && r.rede !== rede) return;
      if (month && !String(r.date || '').startsWith(month)) return;
      const key = `${r.date}|${r.rede}`;
      if (!map.has(key)) map.set(key, {date:r.date, rede:r.rede, records:0, stores:new Set(), products:new Set(), qty:0, unmatchedStores:0, unmatchedProducts:0});
      const item = map.get(key);
      item.records += 1;
      if (r.storeId) item.stores.add(r.storeId); else item.unmatchedStores += 1;
      if (r.productId) item.products.add(r.productId); else item.unmatchedProducts += 1;
      item.qty += toNumber(r.qty);
    });
    return Array.from(map.values()).sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (a.rede||'').localeCompare(b.rede||''));
  }

  function salesImportSummaryRows(){
    return (Store.data.salesImports || []).slice().sort((a,b)=>String(b.importedAt||'').localeCompare(String(a.importedAt||'')));
  }

  function availableSalesMonths(){
    return unique((Store.data.sales || []).map(r => String(r.date || '').slice(0,7)).filter(Boolean)).sort().reverse();
  }

  function availableSalesDatesForFilter(rede='', storeId='', productId=''){
    return unique((Store.data.sales || [])
      .filter(r => (!rede || r.rede === rede) && (!storeId || r.storeId === storeId) && (!productId || r.productId === productId))
      .map(r => r.date)).sort();
  }

  function salesPeriodReplaceOptions(){
    const enabled = !!$('#salesReplacePeriod')?.checked;
    const from = $('#salesReplaceFrom')?.value || '';
    const to = $('#salesReplaceTo')?.value || '';
    const rede = $('#salesReplaceRede')?.value || '';
    return {enabled, from, to, rede};
  }

  function removeSalesRowsByPeriod({from='', to='', rede=''}){
    if (!from || !to) return {removed:0, affectedImports:0};
    const affected = new Set();
    const before = (Store.data.sales || []).length;
    Store.data.sales = (Store.data.sales || []).filter(row => {
      const inPeriod = row.date >= from && row.date <= to;
      const inRede = !rede || row.rede === rede;
      if (inPeriod && inRede) {
        if (row.importId || row.fileId) affected.add(row.importId || row.fileId);
        return false;
      }
      return true;
    });
    recalcSalesImportSummaries(Store.data);
    Store.data.salesImports = (Store.data.salesImports || []).filter(i => toNumber(i.records) > 0 || !affected.has(i.id));
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => !affected.has(i.importId));
    return {removed: before - (Store.data.sales || []).length, affectedImports: affected.size};
  }

  function appendSalesRows(rows){
    Store.data.sales ||= [];
    if (!rows?.length) return;
    Store.data.sales = Store.data.sales.concat(rows);
  }

  function processSalesExcelWithWorker(file, importId, importedAt){
    return new Promise(async (resolve, reject) => {
      if (!window.Worker) return reject(new Error('Web Worker indisponível'));
      let worker;
      try {
        worker = new Worker('sales-worker.js?v=69');
      } catch(e) {
        return reject(e);
      }
      const timeout = setTimeout(() => {
        try { worker.terminate(); } catch(_) {}
        reject(new Error('Tempo de importação excedido'));
      }, 1000 * 60 * 8);
      worker.onmessage = (event) => {
        const msg = event.data || {};
        if (msg.type === 'progress') {
          updateSalesProgress(msg.current || 0, msg.total || 100, msg.message || 'Processando base de vendas...');
        } else if (msg.type === 'done') {
          clearTimeout(timeout);
          worker.terminate();
          resolve(msg.result);
        } else if (msg.type === 'error') {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(msg.message || 'Erro no processamento em segundo plano'));
        }
      };
      worker.onerror = (e) => {
        clearTimeout(timeout);
        try { worker.terminate(); } catch(_) {}
        reject(e.error || new Error(e.message || 'Erro no Worker'));
      };
      try {
        const buffer = await file.arrayBuffer();
        worker.postMessage({
          type:'process-sales-excel',
          buffer,
          fileName:file.name,
          importId,
          importedAt,
          stores: Store.data.stores || [],
          products: Store.data.products || [],
          nameReconciliations: Store.data.nameReconciliations || {products:{}, stores:{}}
        }, [buffer]);
      } catch(e) {
        clearTimeout(timeout);
        try { worker.terminate(); } catch(_) {}
        reject(e);
      }
    });
  }

  async function importSalesExcel(file){
    if (!file) return;
    if (!window.XLSX) return toast('Biblioteca Excel ainda não carregou. Tente novamente em alguns segundos.', 'error');
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) return toast('Selecione uma planilha Excel (.xlsx ou .xls).', 'error');

    const period = salesPeriodReplaceOptions();
    let periodRemoval = {removed:0, affectedImports:0};
    if (period.enabled) {
      if (!period.from || !period.to) return toast('Informe data inicial e final para enviar o período à conferência de duplicidade.', 'error');
      if (period.from > period.to) return toast('A data inicial não pode ser maior que a final.', 'error');
      toast('A substituição agora é decidida na aba Duplicidades. A base será recusada se houver período já importado.', 'warn');
    }

    const importId = uid('sales');
    const importedAt = new Date().toISOString();
    const startedAt = performance.now();
    updateSalesProgress(0, 100, 'Enviando planilha para processamento em segundo plano...');
    await yieldToBrowser();

    let result;
    try {
      result = await processSalesExcelWithWorker(file, importId, importedAt);
    } catch(e) {
      console.warn('Importação em segundo plano falhou. Usando importador legado.', e);
      toast('Processamento em segundo plano indisponível. Usando importação normal.', 'warn');
      return importSalesExcelLegacy(file);
    }

    const rows = result?.rows || [];
    const issues = result?.issues || [];
    if (!rows.length) {
      $('#salesImportLog') && ($('#salesImportLog').innerHTML = '<div class="empty">Nenhuma linha válida encontrada na planilha.</div>');
      Store.data.importIssues ||= [];
      Store.data.importIssues.push(...issues.map(i => ({...i, id:uid('issue'), importId, source:'BASE_VENDA', createdAt:importedAt})));
      await Store.save();
      return toast('Nenhuma venda válida foi importada.', 'error');
    }

    updateSalesProgress(96, 100, 'Verificando duplicidade de datas na base...');
    await yieldToBrowser();

    const salesDuplicate = buildSalesDuplicate(importId, file.name, rows, {...(result.importSummary || {}), optimized:true, worker:true, consolidated:true, replacePeriod: period.enabled ? period : null}, issues, {importedAt});
    if (salesDuplicate) {
      upsertImportDuplicate(salesDuplicate);
      await Store.save({onProgress:(current,total,message)=>{
        const pct = 97 + Math.min(2, Math.ceil((current / Math.max(total, 1)) * 2));
        updateSalesProgress(pct, 100, message || 'Salvando duplicidade para decisão do operador...');
      }});
      $('#salesImportLog') && ($('#salesImportLog').innerHTML = `<div class="pdf-progress-box duplicate-import-log"><div class="pdf-progress-head"><strong>Planilha não importada por duplicidade</strong><span>100%</span></div><div class="pdf-progress-bar"><span style="width:100%"></span></div><div class="pdf-progress-text"><strong>Esta base NÃO foi somada ao sistema.</strong><br>Foram encontradas datas/períodos já importados. A planilha foi enviada para a aba Duplicidades para decisão do operador.</div><div class="footer-actions"><button class="btn btn-primary" onclick="App.go('duplicidades')">Abrir Duplicidades</button></div></div>`);
      toast('Base recusada por duplicidade. Decida na aba Duplicidades.', 'warn');
      render();
      return;
    }

    appendSalesRows(rows);
    Store.data.salesImports ||= [];
    Store.data.salesImports.push({
      ...(result.importSummary || {}),
      id: importId,
      fileName:file.name,
      importedAt,
      replacePeriod: period.enabled ? period : null,
      replacedRows: periodRemoval.removed,
      optimized:true,
      worker:true,
      consolidated:true
    });
    Store.data.importIssues ||= [];
    Store.data.importIssues.push(...issues.map(i => ({...i, id:uid('issue'), importId, source:'BASE_VENDA', createdAt:importedAt})));
    await Store.save({onProgress:(current,total,message)=>{
      const pct = 97 + Math.min(2, Math.ceil((current / Math.max(total, 1)) * 2));
      updateSalesProgress(pct, 100, message || 'Salvando base no navegador em lotes...');
    }});

    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1).replace('.', ',');
    const log = $('#salesImportLog');
    if (log) log.innerHTML = `
      <div class="pdf-progress-box">
        <div class="pdf-progress-head"><strong>Base importada com sucesso</strong><span>100%</span></div>
        <div class="pdf-progress-bar"><span style="width:100%"></span></div>
        <div class="pdf-progress-text">${fmt.format(rows.length)} combinações salvas a partir de ${fmt.format(result.processedRows || 0)} linhas lidas em ${seconds}s.</div>
        ${periodRemoval.removed ? `<div class="muted small">Substituição de período: ${fmt.format(periodRemoval.removed)} registro(s) antigo(s) removido(s).</div>` : ''}
        ${Store.lastSaveWarning ? `<div class="muted small negative">${escapeHtml(Store.lastSaveWarning)}</div>` : ''}
        <div class="muted small">A leitura foi feita em segundo plano e a base foi salva consolidada por data, rede, loja e produto.</div>
      </div>`;
    toast(`Base de venda importada: ${fmt.format(rows.length)} registros consolidados.`);
    render();
  }

  async function importSalesExcelLegacy(file){
    if (!file) return;
    if (!window.XLSX) return toast('Biblioteca Excel ainda não carregou. Tente novamente em alguns segundos.', 'error');
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) return toast('Selecione uma planilha Excel (.xlsx ou .xls).', 'error');

    const existing = (Store.data.salesImports || []).filter(i => i.fileName === file.name);
    if (existing.length) {
      const replace = confirm(`Já existe base importada com o nome "${file.name}". Deseja substituir a base anterior?`);
      if (replace) {
        const ids = new Set(existing.map(i => i.id));
        Store.data.sales = (Store.data.sales || []).filter(r => !ids.has(r.importId));
        Store.data.salesImports = (Store.data.salesImports || []).filter(i => !ids.has(i.id));
        Store.data.importIssues = (Store.data.importIssues || []).filter(i => !ids.has(i.importId));
      }
    }

    const startedAt = performance.now();
    updateSalesProgress(0, 100, 'Lendo arquivo Excel...');
    await yieldToBrowser();

    let workbook;
    try {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, {type:'array', cellDates:true, raw:true});
    } catch(e) {
      console.error(e);
      $('#salesImportLog') && ($('#salesImportLog').innerHTML = `<div class="empty">Não foi possível ler a planilha. Verifique se o arquivo está aberto/corrompido e tente novamente.</div>`);
      return toast('Erro ao ler a planilha.', 'error');
    }

    const importId = uid('sales');
    const importedAt = new Date().toISOString();
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
      const chunk = 1200;
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
        if (store === undefined) { store = matchStore(filialText, rede); storeCache.set(storeKey, store || null); }
        let product = productCache.get(prodKey);
        if (product === undefined) { product = matchProduct(productRaw); productCache.set(prodKey, product || null); }
        if (!store) unmatchedStores++;
        if (!product) unmatchedProducts++;

        const key = salesRowKey(date, rede, store, filialText, product, cleanProduct);
        let row = aggregate.get(key);
        if (!row) {
          row = {
            id: '', importId, fileName:file.name, sheet:sheetName, rede,
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

        if (processedRows % chunk === 0) {
          updateSalesProgress(processedRows, totalCandidateRows, `Processando ${sheetName}: ${fmt.format(processedRows)} de ${fmt.format(totalCandidateRows)} linhas...`);
          await yieldToBrowser();
        }
      }
      sheetSummaries.push({sheetName, rede, records:accepted, skipped, qtyTotal, unmatchedStores, unmatchedProducts});
      updateSalesProgress(processedRows, totalCandidateRows, `Aba ${sheetName} concluída. Agregando vendas por data, loja e produto...`);
      await yieldToBrowser();
    }

    const rows = Array.from(aggregate.values()).map((row, idx) => ({...row, id:`${importId}_${idx+1}`}));
    if (ignoredIssueCount > issues.length) {
      issues.push({kind:'Resumo de linhas ignoradas', message:`${fmt.format(ignoredIssueCount)} linha(s) foram ignoradas; exibindo apenas as primeiras ocorrências.`, detail:'A limitação evita travamento da tela em bases muito grandes.', sheet:'Geral'});
    }

    if (!rows.length) {
      $('#salesImportLog') && ($('#salesImportLog').innerHTML = '<div class="empty">Nenhuma linha válida encontrada na planilha.</div>');
      Store.data.importIssues ||= [];
      Store.data.importIssues.push(...issues.map(i => ({...i, id:uid('issue'), importId, source:'BASE_VENDA', createdAt:importedAt})));
      await Store.save();
      return toast('Nenhuma venda válida foi importada.', 'error');
    }

    updateSalesProgress(98, 100, 'Verificando duplicidade de datas na base...');
    await yieldToBrowser();

    const range = salesImportDateRange(rows);
    const matchedProducts = rows.filter(r => r.productId).length;
    const matchedStores = rows.filter(r => r.storeId).length;
    const legacySummary = {dateFrom:range.from, dateTo:range.to, dates:range.dates, records:rows.length, sourceRecords:rows.reduce((a,r)=>a+toNumber(r.sourceRecords),0), qtyTotal:rows.reduce((a,r)=>a+toNumber(r.qty),0), matchedProducts, unmatchedProducts:rows.length - matchedProducts, matchedStores, unmatchedStores:rows.length - matchedStores, sheets:sheetSummaries, optimized:false};
    const salesDuplicate = buildSalesDuplicate(importId, file.name, rows, legacySummary, issues, {importedAt});
    if (salesDuplicate) {
      upsertImportDuplicate(salesDuplicate);
      await Store.save({onProgress:(current,total,message)=>{
        const pct = 98 + Math.min(1, Math.ceil((current / Math.max(total, 1)) * 1));
        updateSalesProgress(pct, 100, message || 'Salvando duplicidade para decisão do operador...');
      }});
      $('#salesImportLog') && ($('#salesImportLog').innerHTML = `<div class="pdf-progress-box duplicate-import-log"><div class="pdf-progress-head"><strong>Planilha não importada por duplicidade</strong><span>100%</span></div><div class="pdf-progress-bar"><span style="width:100%"></span></div><div class="pdf-progress-text"><strong>Esta base NÃO foi somada ao sistema.</strong><br>Foram encontradas datas/períodos já importados. A planilha foi enviada para a aba Duplicidades para decisão do operador.</div><div class="footer-actions"><button class="btn btn-primary" onclick="App.go('duplicidades')">Abrir Duplicidades</button></div></div>`);
      toast('Base recusada por duplicidade. Decida na aba Duplicidades.', 'warn');
      render();
      return;
    }

    Store.data.sales ||= [];
    Store.data.sales.push(...rows);
    Store.data.salesImports ||= [];
    Store.data.salesImports.push({
      id: importId, fileName:file.name, importedAt,
      dateFrom: range.from, dateTo: range.to, dates: range.dates,
      records: rows.length,
      sourceRecords: rows.reduce((a,r)=>a+toNumber(r.sourceRecords),0),
      qtyTotal: rows.reduce((a,r)=>a+toNumber(r.qty),0),
      matchedProducts, unmatchedProducts: rows.length - matchedProducts,
      matchedStores, unmatchedStores: rows.length - matchedStores,
      sheets: sheetSummaries,
      optimized:true
    });
    Store.data.importIssues ||= [];
    Store.data.importIssues.push(...issues.map(i => ({...i, id:uid('issue'), importId, source:'BASE_VENDA', createdAt:importedAt})));
    await Store.save({onProgress:(current,total,message)=>{
      const pct = 98 + Math.min(1, Math.ceil((current / Math.max(total, 1)) * 1));
      updateSalesProgress(pct, 100, message || 'Salvando base no navegador em lotes...');
    }});

    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1).replace('.', ',');
    const log = $('#salesImportLog');
    if (log) log.innerHTML = `
      <div class="pdf-progress-box">
        <div class="pdf-progress-head"><strong>Base importada com sucesso</strong><span>100%</span></div>
        <div class="pdf-progress-bar"><span style="width:100%"></span></div>
        <div class="pdf-progress-text">${fmt.format(rows.length)} combinações salvas a partir de ${fmt.format(processedRows)} linhas lidas em ${seconds}s.</div>
        ${Store.lastSaveWarning ? `<div class="muted small negative">${escapeHtml(Store.lastSaveWarning)}</div>` : ''}
        <div class="muted small">A base foi agregada por data, loja e produto para evitar travamento e manter a conciliação leve.</div>
      </div>`;
    toast(`Base de venda importada: ${fmt.format(rows.length)} registros consolidados.`);
    render();
  }

  function salesImportPendingGroups(importId){
    const rows = (Store.data.sales || []).filter(r => (r.importId === importId || r.fileId === importId) && (!r.storeId || !r.productId));
    const map = new Map();
    rows.forEach(r => {
      const type = !r.storeId ? 'Loja' : 'Produto';
      const key = `${type}|${r.rede}|${r.storeRaw || r.storeName}|${r.productRaw || r.productName}`;
      if (!map.has(key)) map.set(key, {
        type, rede:r.rede || '—',
        storeRaw:r.storeRaw || r.storeName || '—',
        productRaw:r.productRaw || r.productName || '—',
        records:0, qty:0, dates:new Set()
      });
      const g = map.get(key);
      g.records += toNumber(r.sourceRecords || 1);
      g.qty += toNumber(r.qty);
      if (r.date) g.dates.add(r.date);
    });
    return Array.from(map.values()).sort((a,b)=> b.records - a.records);
  }

  function showSalesImportPendencies(importId){
    const imp = (Store.data.salesImports || []).find(i => i.id === importId);
    if (!imp) return toast('Base não encontrada.', 'error');
    const groups = salesImportPendingGroups(importId);
    const total = groups.length;
    const body = groups.length ? `
      <p class="muted">Pendências consolidadas da base <strong>${escapeHtml(imp.fileName)}</strong>. Corrija o cadastro/aliases ou reimporte a base se necessário.</p>
      <div class="table-wrap" style="max-height:60vh;overflow:auto"><table>
        <thead><tr><th>Tipo</th><th>Rede</th><th>Loja da planilha</th><th>Produto da planilha</th><th class="num">Linhas</th><th class="num">Qtd</th><th>Datas</th></tr></thead>
        <tbody>${groups.slice(0,500).map(g => `<tr>
          <td><span class="badge amber">${escapeHtml(g.type)}</span></td>
          <td>${escapeHtml(g.rede)}</td>
          <td>${escapeHtml(g.storeRaw)}</td>
          <td>${escapeHtml(g.productRaw)}</td>
          <td class="num">${fmt.format(g.records)}</td>
          <td class="num">${fmt.format(g.qty)}</td>
          <td>${Array.from(g.dates).sort().slice(0,8).map(formatDate).join(', ')}${g.dates.size > 8 ? '...' : ''}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      ${total > 500 ? `<p class="muted small">Exibindo 500 de ${fmt.format(total)} grupos para manter a tela leve.</p>` : ''}
    ` : `
      <div class="empty">Nenhuma pendência encontrada nesta base. Se o alerta ainda aparecer, a base será recalculada ao atualizar a página ou reimportar.</div>
    `;
    openModal('Pendências da base de vendas', body);
  }

  function renderSalesImportsTable(imports){
    return `<div class="table-wrap"><table>
      <thead><tr><th>Arquivo</th><th>Período</th><th>Abas</th><th class="num">Registros</th><th class="num">Qtd vendida</th><th>Atenção</th><th></th></tr></thead>
      <tbody>${imports.map(i => `<tr>
        <td><strong>${escapeHtml(i.fileName)}</strong><br><span class="muted small">${formatDateTime(i.importedAt)}</span></td>
        <td>${formatDate(i.dateFrom)} a ${formatDate(i.dateTo)}<br><span class="muted small">${fmt.format((i.dates||[]).length)} data(s)</span></td>
        <td>${(i.sheets||[]).map(s => `<span class="badge blue">${escapeHtml(s.rede)} • ${fmt.format(s.records)}</span>`).join(' ') || '—'}</td>
        <td class="num">${fmt.format(i.records || 0)}</td>
        <td class="num">${fmt.format(i.qtyTotal || 0)}</td>
        <td>${toNumber(i.unmatchedStores)+toNumber(i.unmatchedProducts) ? `<button class="badge amber" style="border:none;cursor:pointer" type="button" data-app-action="show-sales-pendencies" data-key="${escapeHtml(encodeIssueKeyForAttr(i.id))}">${fmt.format(toNumber(i.unmatchedStores)+toNumber(i.unmatchedProducts))} pendências</button>` : '<span class="badge green">OK</span>'}</td>
        <td class="num"><button class="btn btn-sm btn-danger" type="button" data-app-action="delete-sales-import" data-key="${escapeHtml(encodeIssueKeyForAttr(i.id))}">Excluir</button></td>
      </tr>`).join('') || `<tr><td colspan="7" class="center muted">Nenhuma base importada.</td></tr>`}</tbody>
    </table></div>`;
  }

  function renderSalesDateConciliation(rows){
    return `<div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Rede</th><th>Status</th><th class="num">Lojas</th><th class="num">Produtos</th><th class="num">Registros</th><th class="num">Qtd vendida</th></tr></thead>
      <tbody>${rows.map(r => {
        const issueCount = toNumber(r.unmatchedStores) + toNumber(r.unmatchedProducts);
        return `<tr>
          <td><strong>${formatDate(r.date)}</strong></td>
          <td>${escapeHtml(r.rede || '—')}</td>
          <td>${issueCount ? `<span class="badge amber">Atenção: ${fmt.format(issueCount)}</span>` : '<span class="badge green">OK</span>'}</td>
          <td class="num">${fmt.format(r.stores.size)}</td>
          <td class="num">${fmt.format(r.products.size)}</td>
          <td class="num">${fmt.format(r.records)}</td>
          <td class="num">${fmt.format(r.qty)}</td>
        </tr>`;
      }).join('') || `<tr><td colspan="7" class="center muted">Nenhuma data encontrada no filtro.</td></tr>`}</tbody>
    </table></div>`;
  }

  function renderSalesSimulator(){
    const redes = unique((Store.data.sales || []).map(r=>r.rede).filter(Boolean)).sort();
    const rede = state.baseSales.rede || redes[0] || '';
    const stores = Store.data.stores.filter(s => !rede || s.rede === rede);
    const storeId = state.baseSales.storeId || stores[0]?.id || '';
    const products = activeProducts(null);
    const productId = state.baseSales.productId || products[0]?.id || '';
    const pct = toNumber(state.baseSales.simulatorPct || 0);
    const dates = availableSalesDatesForFilter(rede, storeId, productId);
    if (!state.baseSales.simulatorDates?.length && dates.length) state.baseSales.simulatorDates = dates.slice(-4);
    const selected = unique(state.baseSales.simulatorDates || []).filter(d => dates.includes(d)).sort();
    const calc = storeId && productId ? salesAverageCalc(storeId, productId, selected, pct) : {detail:[], total:0, average:0, suggestion:0, daysWithSales:0, selectedCount:selected.length, missingDates:[]};
    return `<div class="card">
      <h3>Simulador de média por datas</h3>
      <p class="muted">Use para conferir a regra: soma somente datas com venda, divide pelos dias com venda, aplica o % e arredonda para cima.</p>
      <div class="form-grid">
        <label>Rede<select id="salesSimRede">${redes.map(r=>`<option value="${escapeHtml(r)}" ${r===rede?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></label>
        <label>Loja<select id="salesSimStore">${stores.map(s=>`<option value="${s.id}" ${s.id===storeId?'selected':''}>${escapeHtml(s.nome)}</option>`).join('')}</select></label>
        <label>Produto<select id="salesSimProduct">${products.map(p=>`<option value="${p.id}" ${p.id===productId?'selected':''}>${escapeHtml(p.nomeSistema)}</option>`).join('')}</select></label>
        <label>% aumento<input id="salesSimPct" type="number" min="0" step="0.01" value="${pct}"></label>
      </div>
      <strong>Datas disponíveis</strong>
      <div class="pillbar date-pillbar" style="margin-top:8px">${dates.map(d => `<label class="badge ${selected.includes(d)?'green':'gray'}"><input type="checkbox" class="sales-sim-date" value="${d}" ${selected.includes(d)?'checked':''}> ${formatDate(d)}</label>`).join('') || '<span class="muted">Não há venda para esta loja/produto.</span>'}</div>
      <div class="grid kpis" style="margin-top:14px">
        ${kpi('∑','Soma com venda',fmt.format(calc.total || 0),`${fmt.format(calc.daysWithSales || 0)} dia(s) com venda`)}
        ${kpi('÷','Média',fmt.format(calc.average || 0),`${fmt.format(calc.selectedCount || 0)} data(s) selecionada(s)`)}
        ${kpi('%','Aumento',`${String(pct).replace('.',',')}%`,'aplicado sobre a média')}
        ${kpi('✓','Sugestão final',fmt.format(calc.suggestion || 0),'arredondada para cima')}
      </div>
      ${calc.missingDates?.length ? `<div class="alert-list"><div><strong>Atenção:</strong> sem venda em ${fmt.format(calc.missingDates.length)} data(s): ${calc.missingDates.map(formatDate).join(', ')}. Essas datas não entram na divisão.</div></div>` : ''}
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Data</th><th class="num">Venda</th><th>Entra na média?</th></tr></thead><tbody>${(calc.detail||[]).map(d=>`<tr><td>${formatDate(d.date)}</td><td class="num">${fmt.format(d.qty)}</td><td>${d.qty>0?'<span class="badge green">Sim</span>':'<span class="badge gray">Não</span>'}</td></tr>`).join('') || `<tr><td colspan="3" class="center muted">Selecione datas para simular.</td></tr>`}</tbody></table></div>
    </div>`;
  }

  function bindSalesPageEvents(){
    $('#salesImportFile')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (file) await importSalesExcel(file);
    });
    $('#salesFilterRede')?.addEventListener('change', e => { state.baseSales.rede = e.target.value; render(); });
    $('#salesFilterMonth')?.addEventListener('change', e => { state.baseSales.month = e.target.value; render(); });
    $('#salesSimRede')?.addEventListener('change', e => { state.baseSales.rede = e.target.value; state.baseSales.storeId = ''; state.baseSales.simulatorDates = []; render(); });
    $('#salesSimStore')?.addEventListener('change', e => { state.baseSales.storeId = e.target.value; state.baseSales.simulatorDates = []; render(); });
    $('#salesSimProduct')?.addEventListener('change', e => { state.baseSales.productId = e.target.value; state.baseSales.simulatorDates = []; render(); });
    $('#salesSimPct')?.addEventListener('input', e => { state.baseSales.simulatorPct = toNumber(e.target.value); renderImportSales(); });
    $$('.sales-sim-date').forEach(inp => inp.addEventListener('change', () => {
      const set = new Set(state.baseSales.simulatorDates || []);
      inp.checked ? set.add(inp.value) : set.delete(inp.value);
      state.baseSales.simulatorDates = Array.from(set).sort();
      renderImportSales();
    }));
  }

  function renderImportSales(){
    setTitle('Bases de Venda', 'Importe a base, concilie datas e simule médias para sugestão comercial.');
    const imports = salesImportSummaryRows();
    const months = availableSalesMonths();
    if (!state.baseSales.month && months.length) state.baseSales.month = months[0];
    const redes = unique((Store.data.sales || []).map(r => r.rede).filter(Boolean)).sort();
    const dateRows = salesDateSummary({rede: state.baseSales.rede || '', month: state.baseSales.month || ''});
    const totalRows = Store.data.sales || [];
    const totalQty = totalRows.reduce((a,r)=>a+toNumber(r.qty),0);
    const unmatchedStores = totalRows.filter(r=>!r.storeId).length;
    const unmatchedProducts = totalRows.filter(r=>!r.productId).length;
    $('#viewRoot').innerHTML = `
      <div class="grid kpis">
        ${kpi('▤','Bases importadas',fmt.format(imports.length),'arquivos Excel')}
        ${kpi('▥','Registros',fmt.format(totalRows.length),'linhas de venda')}
        ${kpi('∑','Qtd vendida',fmt.format(totalQty),'unidades')}
        ${kpi('!','Pendências',fmt.format(unmatchedStores + unmatchedProducts),'lojas/produtos não reconhecidos', unmatchedStores + unmatchedProducts ? 'amber' : 'green')}
      </div>
      <div class="panel">
        <div class="panel-head">
          <div><h3>Importar base Excel</h3><p class="muted">Reconhece abas como REDE DIA A DIA e REDE COSTA, usando Filial, Produto, Qtd. Faturada e Date.</p></div>
        </div>
        <div class="import-box">
          <input id="salesImportFile" type="file" accept=".xlsx,.xls">
          <p class="muted small">A base será lida em segundo plano, consolidada por data + rede + loja + produto e salva no histórico.</p>
          <div class="inline-check" style="margin-top:10px">
            <label><input id="salesReplacePeriod" type="checkbox"> Substituir dados existentes de um período antes de importar</label>
          </div>
          <div class="form-grid compact-grid" style="margin-top:8px">
            <label>Data inicial<input id="salesReplaceFrom" type="date"></label>
            <label>Data final<input id="salesReplaceTo" type="date"></label>
            <label>Rede<select id="salesReplaceRede"><option value="">Todas</option>${redes.map(r=>`<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('')}</select></label>
          </div>
          <p class="muted small">Use a substituição quando for reimportar um mês/período para evitar duplicidade.</p>
        </div>
        <div id="salesImportLog"></div>
      </div>
      <div class="card">
        <h3>Histórico das bases importadas</h3>
        ${renderSalesImportsTable(imports)}
      </div>
      <div class="card">
        <div class="panel-head">
          <div><h3>Conciliação de datas importadas</h3><p class="muted">Confira se cada data/rede entrou corretamente antes de usar na sugestão.</p></div>
        </div>
        <div class="filter-row">
          <div class="filter">Rede <select id="salesFilterRede"><option value="">Todas</option>${redes.map(r=>`<option value="${escapeHtml(r)}" ${state.baseSales.rede===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select></div>
          <div class="filter">Mês <select id="salesFilterMonth"><option value="">Todos</option>${months.map(m=>`<option value="${m}" ${state.baseSales.month===m?'selected':''}>${m.split('-').reverse().join('/')}</option>`).join('')}</select></div>
        </div>
        ${renderSalesDateConciliation(dateRows)}
      </div>
      ${renderSalesSimulator()}
    `;
    bindSalesPageEvents();
  }

  async function deleteSalesImport(id){
    if (!id) return toast('Base não identificada para exclusão.', 'error');
    if (!confirm('Excluir esta base de venda e todos os registros vinculados a ela?')) return;
    const key = String(id);
    const before = (Store.data.sales || []).length;
    Store.data.sales = (Store.data.sales || []).filter(s => s.importId !== key && s.fileId !== key);
    Store.data.salesImports = (Store.data.salesImports || []).filter(i => i.id !== key);
    Store.data.importIssues = (Store.data.importIssues || []).filter(i => i.importId !== key);
    Store.data.importDuplicates = (Store.data.importDuplicates || []).filter(dup => dup.importId !== key && dup.newImportId !== key);
    Store.data.deletedImports ||= [];
    Store.data.deletedImports.push({id:uid('delsales'), type:'BASE_VENDA', key, removed:before-(Store.data.sales || []).length, user:state.session?.usuario || 'sistema', createdAt:new Date().toISOString()});
    await saveAndRender('Base de venda removida.');
  }

  window.App = {
    go, closeModal, openCorrectionModal, openImportDuplicate, resolveImportDuplicate, resolveSelectedImportDuplicates, clearSelectedImportDuplicates, setAllImportDuplicateSelection, closePendency, resolveCorrection, togglePdfHistory, changePdfCalendarMonth, selectPdfCalendarDay, showImportAlert, openImportIssueOptions, clearImportIssues, cleanResolvedImportIssues, clearSingleImportIssue, clearImportIssuesByFile, clearSimilarImportIssues, setAllImportIssueSelection, clearSelectedImportIssues, clearSelectedSimilarImportIssues, copySelectedImportIssueDetails, linkImportIssueCnpjToStore, linkImportIssueProductToProduct, openCriticalRuptureJustification, openUserPermissions, saveUserPermissions, deleteDeliveryImport, deleteDeliveryBatch, deleteSalesImport, showSalesImportPendencies, saveProductNameReconciliation, saveStoreNameReconciliation, saveStoreNameReconciliationFromModal, saveStoreNameReconciliationInline, deleteNameReconciliation, fillProductReconciliation, fillStoreReconciliation, deleteOffer, deleteInventoryLimit, acceptTicket, openResolveTicket, resolveTicket,
    resetSystem: async () => { if(confirm('Apagar dados operacionais e restaurar base inicial?')) { await Store.reset(); toast('Sistema resetado.'); render(); } },
    exportBackup: () => {
      const blob = new Blob([JSON.stringify(Store.data,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup_so_folhas_'+todayISO()+'.json'; a.click();
    },
    importBackup: (file) => {
      const reader = new FileReader();
      reader.onload = async () => { Store.data = migrate(JSON.parse(reader.result)); await Store.save(); toast('Backup importado.'); render(); };
      reader.readAsText(file);
    }
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    // Liga o formulário de login imediatamente. Assim o acesso ADM/loja funciona mesmo
    // se Firestore, IndexedDB ou cache demorarem para iniciar em segundo plano.
    try {
      bindGlobal();
      renderLogin();
    } catch(bindError) {
      console.error('Falha ao ligar tela de login.', bindError);
    }

    Store.init()
      .then(() => {
        $('#syncPill') && ($('#syncPill').textContent = Store.usingCloud ? 'Firestore ativo' : 'Modo local');
        if (state.session) render();
      })
      .catch(async e => {
        console.warn('Falha ao iniciar dados. Usando base inicial local para liberar login.', e);
        try {
          Store._initializing = false;
          Store._cloudReadComplete = false;
          Store.usingCloud = false;
          Store.cloud = null;
          Store.data = migrate(Store.seed());
          await persistLocalSnapshot(Store.data);
          $('#syncPill') && ($('#syncPill').textContent = 'Modo local');
          if (state.session) render();
        } catch(seedError) {
          console.error('Falha crítica ao criar base inicial.', seedError);
        }
      });
  });
})();
