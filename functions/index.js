const functions = require('firebase-functions/v1');
const { defineString, defineSecret } = require('firebase-functions/params');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const webpush = require('web-push');

initializeApp();

const auth = getAuth();
const db = getFirestore();
const messaging = getMessaging();

// Versão: 1.6 - Chave privada VAPID protegida pelo Secret Manager
// Consulte functions/.env.example para instruções de configuração.

// Definição dos parâmetros de ambiente
const VAPID_PUBLIC_KEY = defineString('VAPID_PUBLIC_KEY', {
  default: 'BOD3066MNR-gYBI6qquZcm2RxlN_ia_dQtADtGZGhan7SeuxcN6T8WwWB0sEnMpWpQ0aS0OkwoItlgYza1MkiRg',
  description: 'Chave pública VAPID para Web Push',
});

const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');

const VAPID_MAILTO = defineString('VAPID_MAILTO', {
  default: 'mailto:contato@saposleague.com',
  description: 'Email de contato para Web Push',
});

const SUPABASE_PROJECT_URL = defineString('SUPABASE_PROJECT_URL', {
  default: 'https://yaapgjkvkhsfsskkbmso.supabase.co',
  description: 'URL pública do projeto Supabase',
});

const SUPABASE_ADMIN_KEY = defineSecret('SUPABASE_ADMIN_KEY');

const ADMIN_FIREBASE_UIDS = defineString('ADMIN_FIREBASE_UIDS', {
  default: 'HClXNJyivTWibYcrirCYxhM96Ze2',
  description: 'UIDs Firebase autorizados, separados por vírgula',
});

// Configurar Web Push VAPID
// Os valores são resolvidos em runtime quando a função é invocada
function initWebPush() {
  const privateKey = VAPID_PRIVATE_KEY.value().trim();
  if (!privateKey) {
    throw new Error('VAPID_PRIVATE_KEY não configurada no Secret Manager');
  }
  webpush.setVapidDetails(
    VAPID_MAILTO.value().trim(),
    VAPID_PUBLIC_KEY.value().trim(),
    privateKey
  );
}

/**
 * Autoriza endpoints administrativos manuais.
 * Requer POST, Firebase ID token e a custom claim `admin: true`.
 */
async function requireAdminRequest(req, res) {
  res.set('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.set('Allow', 'POST');
    res.status(405).json({
      success: false,
      error: 'Método não permitido. Use POST.'
    });
    return null;
  }

  const authorization = req.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.status(401).json({
      success: false,
      error: 'Token de autenticação ausente.'
    });
    return null;
  }

  try {
    const decodedToken = await auth.verifyIdToken(match[1], true);
    const allowedUids = new Set(
      ADMIN_FIREBASE_UIDS.value()
        .split(',')
        .map(uid => uid.trim())
        .filter(Boolean)
    );
    const isBootstrapAdmin = allowedUids.has(decodedToken.uid);

    if (decodedToken.admin !== true && !isBootstrapAdmin) {
      res.status(403).json({
        success: false,
        error: 'Permissão administrativa necessária.'
      });
      return null;
    }

    // O UID inicial funciona como bootstrap. Na primeira chamada válida,
    // a claim é persistida sem apagar outras claims existentes.
    if (decodedToken.admin !== true && isBootstrapAdmin) {
      const user = await auth.getUser(decodedToken.uid);
      await auth.setCustomUserClaims(decodedToken.uid, {
        ...(user.customClaims || {}),
        admin: true
      });
      console.log(`✅ Claim administrativa configurada para ${decodedToken.uid}`);
    }

    return decodedToken;
  } catch (error) {
    console.warn('⚠️ Requisição administrativa rejeitada:', error.code || error.message);
    res.status(401).json({
      success: false,
      error: 'Token de autenticação inválido ou expirado.'
    });
    return null;
  }
}

const ADMIN_ALLOWED_ORIGINS = new Set([
  'https://saposleague.github.io',
  'https://sapos-league.web.app',
  'https://sapos-league.firebaseapp.com'
]);

const ADMIN_TABLE_FIELDS = {
  jogadores: new Set(['id', 'nome', 'time_id', 'data_cadastro', 'nivel']),
  presencas: new Set(['id', 'jogador_id', 'data_pelada', 'created_at', 'observacoes']),
  jogadores_aptos: new Set(['id', 'jogador_id', 'data_marcacao'])
};

function configureAdminCors(req, res) {
  const origin = req.get('Origin');
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || '');

  if (origin && (ADMIN_ALLOWED_ORIGINS.has(origin) || isLocalOrigin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    if (origin && !ADMIN_ALLOWED_ORIGINS.has(origin) && !isLocalOrigin) {
      res.status(403).end();
    } else {
      res.status(204).end();
    }
    return false;
  }

  if (origin && !ADMIN_ALLOWED_ORIGINS.has(origin) && !isLocalOrigin) {
    res.status(403).json({
      success: false,
      error: 'Origem não autorizada.'
    });
    return false;
  }

  return true;
}

function assertPlainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

function normalizePositiveInteger(value, field, nullable = false) {
  if (nullable && (value === null || value === '')) return null;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${field} deve ser um número inteiro positivo.`);
  }
  return normalized;
}

function normalizeOptionalText(value, field, maxLength) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`${field} deve ser um texto.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${field} excede o limite de ${maxLength} caracteres.`);
  }
  return normalized || null;
}

function normalizePlayerNameKey(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function duplicatePlayerNameError(existingName) {
  const error = new Error(`Já existe um jogador cadastrado com o nome "${existingName}".`);
  error.code = 'duplicate_player_name';
  return error;
}

function createSupabaseAdminHeaders(adminKey, prefer = null) {
  const headers = {
    apikey: adminKey,
    'Content-Type': 'application/json'
  };

  if (prefer) headers.Prefer = prefer;
  if (!adminKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${adminKey}`;
  }
  return headers;
}

async function assertUniquePlayerNames({ operation, values, filters, baseUrl, adminKey }) {
  if (!['insert', 'update'].includes(operation)) return;

  const rows = (Array.isArray(values) ? values : [values])
    .filter(row => row && row.nome !== undefined);
  if (rows.length === 0) return;

  const namesInRequest = new Map();
  for (const row of rows) {
    const key = normalizePlayerNameKey(row.nome);
    if (namesInRequest.has(key)) {
      throw duplicatePlayerNameError(namesInRequest.get(key));
    }
    namesInRequest.set(key, row.nome);
  }

  const existingUrl = new URL(`${baseUrl}/rest/v1/jogadores`);
  existingUrl.searchParams.set('select', 'id,nome');

  const response = await fetch(existingUrl, {
    method: 'GET',
    headers: createSupabaseAdminHeaders(adminKey)
  });

  if (!response.ok) {
    const error = new Error('Não foi possível verificar jogadores já cadastrados.');
    error.code = `supabase_${response.status}`;
    throw error;
  }

  const existingPlayers = await response.json();
  const ignoredId = operation === 'update'
    ? filters.find(filter => filter.operator === 'eq' && filter.column === 'id')?.value
    : null;

  for (const row of rows) {
    const key = normalizePlayerNameKey(row.nome);
    const duplicate = existingPlayers.find(player => (
      String(player.id) !== String(ignoredId ?? '') &&
      normalizePlayerNameKey(player.nome) === key
    ));
    if (duplicate) throw duplicatePlayerNameError(duplicate.nome);
  }
}

function normalizeIsoDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} deve estar no formato AAAA-MM-DD.`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${field} contém uma data inválida.`);
  }
  return value;
}

function rejectUnknownFields(row, allowedFields) {
  const unknownFields = Object.keys(row).filter(field => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new Error(`Campos não permitidos: ${unknownFields.join(', ')}.`);
  }
}

function normalizeMutationRow(table, row, operation) {
  assertPlainObject(row, 'Cada registro deve ser um objeto.');

  if (table === 'jogadores') {
    rejectUnknownFields(row, new Set(['nome', 'time_id', 'data_cadastro', 'nivel']));
    const normalized = {};

    if (row.nome !== undefined) {
      if (typeof row.nome !== 'string') {
        throw new Error('nome deve ter entre 2 e 60 caracteres.');
      }
      const nome = row.nome.trim().replace(/\s+/g, ' ');
      if (nome.length < 2 || nome.length > 60) {
        throw new Error('nome deve ter entre 2 e 60 caracteres.');
      }
      normalized.nome = nome;
    }
    if (row.time_id !== undefined) {
      normalized.time_id = normalizePositiveInteger(row.time_id, 'time_id', true);
    }
    if (row.data_cadastro !== undefined) {
      normalized.data_cadastro = normalizeIsoDate(row.data_cadastro, 'data_cadastro');
    }
    if (row.nivel !== undefined) {
      const nivel = Number(row.nivel);
      if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) {
        throw new Error('nivel deve ser um número inteiro entre 1 e 5.');
      }
      normalized.nivel = nivel;
    }
    if (operation === 'insert' && normalized.nome === undefined) {
      throw new Error('nome é obrigatório para cadastrar um jogador.');
    }
    return normalized;
  }

  if (table === 'presencas') {
    rejectUnknownFields(row, new Set(['jogador_id', 'data_pelada', 'observacoes']));
    const normalized = {};

    if (row.jogador_id !== undefined) {
      normalized.jogador_id = normalizePositiveInteger(row.jogador_id, 'jogador_id', true);
    }
    if (row.data_pelada !== undefined) {
      normalized.data_pelada = normalizeIsoDate(row.data_pelada, 'data_pelada');
    }
    if (row.observacoes !== undefined) {
      normalized.observacoes = normalizeOptionalText(row.observacoes, 'observacoes', 1000);
    }
    if (operation === 'insert' && normalized.data_pelada === undefined) {
      throw new Error('data_pelada é obrigatória para cadastrar uma presença.');
    }
    return normalized;
  }

  if (table === 'jogadores_aptos') {
    rejectUnknownFields(row, new Set(['jogador_id']));
    if (row.jogador_id === undefined) {
      throw new Error('jogador_id é obrigatório.');
    }
    return {
      jogador_id: normalizePositiveInteger(row.jogador_id, 'jogador_id')
    };
  }

  throw new Error('Tabela não permitida.');
}

function normalizeMutationValues(table, operation, values) {
  if (operation === 'delete') {
    if (values !== null && values !== undefined) {
      throw new Error('DELETE não aceita valores.');
    }
    return null;
  }

  const rows = Array.isArray(values) ? values : [values];
  if (rows.length === 0 || rows.length > 100) {
    throw new Error('A operação deve conter entre 1 e 100 registros.');
  }
  if (operation === 'update' && rows.length !== 1) {
    throw new Error('UPDATE aceita somente um registro por chamada.');
  }

  const normalizedRows = rows.map(row => normalizeMutationRow(table, row, operation));
  if (operation === 'update' && Object.keys(normalizedRows[0]).length === 0) {
    throw new Error('Nenhum campo válido foi informado para atualização.');
  }

  return Array.isArray(values) ? normalizedRows : normalizedRows[0];
}

function normalizeMutationFilters(table, operation, filters) {
  const normalizedFilters = Array.isArray(filters) ? filters : [];

  if (operation === 'insert') {
    if (normalizedFilters.length !== 0) {
      throw new Error('INSERT não aceita filtros.');
    }
    return [];
  }

  if (normalizedFilters.length !== 1) {
    throw new Error(`${operation.toUpperCase()} exige exatamente um filtro permitido.`);
  }

  const filter = normalizedFilters[0];
  assertPlainObject(filter, 'Filtro inválido.');

  if (table === 'jogadores' && filter.operator === 'eq' && filter.column === 'id') {
    return [{
      operator: 'eq',
      column: 'id',
      value: normalizePositiveInteger(filter.value, 'id')
    }];
  }

  if (table === 'presencas' && filter.operator === 'eq' && filter.column === 'id') {
    return [{
      operator: 'eq',
      column: 'id',
      value: normalizePositiveInteger(filter.value, 'id')
    }];
  }

  if (
    table === 'presencas' &&
    operation === 'delete' &&
    filter.operator === 'eq' &&
    filter.column === 'data_pelada'
  ) {
    return [{
      operator: 'eq',
      column: 'data_pelada',
      value: normalizeIsoDate(filter.value, 'data_pelada')
    }];
  }

  if (
    table === 'jogadores_aptos' &&
    operation === 'delete' &&
    filter.operator === 'in' &&
    filter.column === 'jogador_id' &&
    Array.isArray(filter.value) &&
    filter.value.length <= 500
  ) {
    return [{
      operator: 'in',
      column: 'jogador_id',
      value: filter.value.map(value => normalizePositiveInteger(value, 'jogador_id'))
    }];
  }

  throw new Error('Combinação de tabela, operação e filtro não permitida.');
}

function normalizeSelect(table, select) {
  if (select === null || select === undefined || select === '') return null;
  if (typeof select !== 'string') throw new Error('Seleção de retorno inválida.');

  const fields = select.split(',').map(field => field.trim()).filter(Boolean);
  const allowedFields = ADMIN_TABLE_FIELDS[table];
  if (
    fields.length === 0 ||
    fields.length > allowedFields.size ||
    fields.some(field => !allowedFields.has(field))
  ) {
    throw new Error('A seleção contém colunas não permitidas.');
  }
  return fields.join(',');
}

async function executeSupabaseMutation(request) {
  assertPlainObject(request, 'Corpo da requisição inválido.');

  const table = request.table;
  const operation = request.operation;
  if (!ADMIN_TABLE_FIELDS[table]) throw new Error('Tabela não permitida.');
  if (!['insert', 'update', 'delete'].includes(operation)) {
    throw new Error('Operação não permitida.');
  }
  if (table === 'jogadores_aptos' && operation === 'update') {
    throw new Error('Atualização direta de jogadores aptos não é permitida.');
  }

  const values = normalizeMutationValues(table, operation, request.values);
  const filters = normalizeMutationFilters(table, operation, request.filters);
  const select = normalizeSelect(table, request.select);
  const single = request.single === true;
  if (single && !select) throw new Error('single exige uma seleção de retorno.');

  // Um IN vazio representa uma exclusão sem alvos e deve ser um no-op.
  if (filters.some(filter => filter.operator === 'in' && filter.value.length === 0)) {
    return single ? null : [];
  }

  const baseUrl = SUPABASE_PROJECT_URL.value().replace(/\/+$/, '');
  const url = new URL(`${baseUrl}/rest/v1/${table}`);

  for (const filter of filters) {
    if (filter.operator === 'eq') {
      url.searchParams.set(filter.column, `eq.${filter.value}`);
    } else {
      url.searchParams.set(filter.column, `in.(${filter.value.join(',')})`);
    }
  }
  if (select) url.searchParams.set('select', select);

  const method = {
    insert: 'POST',
    update: 'PATCH',
    delete: 'DELETE'
  }[operation];

  const adminKey = SUPABASE_ADMIN_KEY.value();
  if (!adminKey) {
    throw new Error('SUPABASE_ADMIN_KEY não está configurada.');
  }

  if (table === 'jogadores') {
    await assertUniquePlayerNames({ operation, values, filters, baseUrl, adminKey });
  }

  // Chaves novas sb_secret_ usam somente apikey. A service_role legada
  // continua exigindo também o Bearer JWT.
  const headers = createSupabaseAdminHeaders(
    adminKey,
    select ? 'return=representation' : 'return=minimal'
  );

  const response = await fetch(url, {
    method,
    headers,
    body: operation === 'delete' ? undefined : JSON.stringify(values)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.message || errorBody.hint || 'Erro ao gravar no Supabase.');
    error.code = errorBody.code || `supabase_${response.status}`;
    throw error;
  }

  if (!select) return null;
  const data = await response.json();
  return single ? (data[0] || null) : data;
}

/**
 * Escritas administrativas no Supabase.
 * Leituras públicas permanecem no navegador sob RLS; qualquer mutação passa
 * por token Firebase, claim/UID administrativo e validação de payload.
 */
exports.adminSupabaseWrite = onRequest(
  {
    region: 'us-central1',
    secrets: [SUPABASE_ADMIN_KEY],
    timeoutSeconds: 30,
    memory: '256MiB',
    invoker: 'public'
  },
  async (req, res) => {
    if (!configureAdminCors(req, res)) return;

    const caller = await requireAdminRequest(req, res);
    if (!caller) return;

    try {
      const data = await executeSupabaseMutation(req.body);
      console.log(`✅ ${caller.uid}: ${req.body.operation} em ${req.body.table}`);
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error(`❌ Escrita administrativa rejeitada para ${caller.uid}:`, error);
      res.status(400).json({
        success: false,
        code: error.code || 'invalid_admin_mutation',
        error: error.message
      });
    }
  }
);

/**
 * Notificações de Segunda a Quarta às 08:00
 * Avisa sobre jogos de quinta-feira
 */
exports.notifyWeekGames = functions.runWith({ secrets: [VAPID_PRIVATE_KEY] }).pubsub
  .schedule('0 8 * * 1,2,3') // Segunda, Terça, Quarta às 08:00
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('📅 Verificando jogos da semana (quinta-feira)...');
    
    try {
      // Calcular data atual no fuso de Brasília (UTC-3)
      const now = new Date();
      const brasiliaOffset = -3 * 60; // UTC-3 em minutos
      const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - now.getTimezoneOffset()) * 60000);
      const dayOfWeek = brasiliaTime.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui
      
      console.log(`📅 Dia da semana em Brasília: ${dayOfWeek} (1=Seg, 2=Ter, 3=Qua)`);
      
      let daysUntilThursday;
      if (dayOfWeek === 1) daysUntilThursday = 3; // Segunda -> Quinta
      else if (dayOfWeek === 2) daysUntilThursday = 2; // Terça -> Quinta
      else if (dayOfWeek === 3) daysUntilThursday = 1; // Quarta -> Quinta
      else {
        console.log(`⚠️ Dia inesperado (${dayOfWeek}), abortando`);
        return null;
      }
      
      const thursday = new Date(brasiliaTime);
      thursday.setDate(brasiliaTime.getDate() + daysUntilThursday);
      // Formatar data como YYYY-MM-DD usando o fuso de Brasília
      const year = thursday.getFullYear();
      const month = String(thursday.getMonth() + 1).padStart(2, '0');
      const day = String(thursday.getDate()).padStart(2, '0');
      const thursdayString = `${year}-${month}-${day}`;
      
      console.log(`🔍 Buscando jogos para quinta-feira: ${thursdayString}`);
      
      // Buscar jogos de quinta-feira
      const games = await getGamesForDate(thursdayString);
      
      if (games.length === 0) {
        console.log('📭 Nenhum jogo encontrado para quinta-feira');
        return null;
      }
      
      console.log(`⚽ ${games.length} jogo(s) encontrado(s) para quinta-feira`);
      
      // Criar mensagem
      const title = games.length === 1 
        ? `Jogo Quinta-Feira - ${games[0].rodada}ª Rodada`
        : `Jogos Quinta-Feira - ${games[0].rodada}ª Rodada`;
      const body = games.map(g => `${g.timeA} x ${g.timeB} às ${g.hora}`).join('\n');
      
      // Enviar notificação
      await sendNotificationToAll(title, body);
      
      return { success: true, games: games.length };
      
    } catch (error) {
      console.error('❌ Erro ao enviar notificações da semana:', error);
      throw error;
    }
  });

/**
 * Notificações de Quinta às 00:00, 12:00 e 19:00
 * Avisa sobre jogos de hoje
 */
exports.notifyTodayGames = functions.runWith({ secrets: [VAPID_PRIVATE_KEY] }).pubsub
  .schedule('0 0,12,19 * * 4') // Quinta às 00:00, 12:00 e 19:00
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('🔔 Verificando jogos de hoje (quinta-feira)...');
    
    try {
      // Calcular data atual no fuso de Brasília (UTC-3)
      const now = new Date();
      const brasiliaOffset = -3 * 60; // UTC-3 em minutos
      const brasiliaTime = new Date(now.getTime() + (brasiliaOffset - now.getTimezoneOffset()) * 60000);
      const year = brasiliaTime.getFullYear();
      const month = String(brasiliaTime.getMonth() + 1).padStart(2, '0');
      const day = String(brasiliaTime.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;
      
      console.log(`🔍 Buscando jogos para hoje: ${todayString}`);
      
      // Buscar jogos de hoje
      const games = await getGamesForDate(todayString);
      
      if (games.length === 0) {
        console.log('📭 Nenhum jogo encontrado para hoje');
        return null;
      }
      
      console.log(`⚽ ${games.length} jogo(s) encontrado(s) para hoje`);
      
      // Criar mensagem
      const title = games.length === 1 
        ? `Jogo Hoje - ${games[0].rodada}ª Rodada`
        : `Jogos Hoje - ${games[0].rodada}ª Rodada`;
      const body = games.map(g => `${g.timeA} x ${g.timeB} às ${g.hora}`).join('\n');
      
      // Enviar notificação
      await sendNotificationToAll(title, body);
      
      return { success: true, games: games.length };
      
    } catch (error) {
      console.error('❌ Erro ao enviar notificações de hoje:', error);
      throw error;
    }
  });

/**
 * Busca jogos para uma data específica
 */
async function getGamesForDate(dateString) {
  const fases = ['rodadas2026_fase1', 'rodadas2026_fase2', 'rodadas2026_final'];
  let games = [];
  let times = {};
  
  // Carregar times
  const timesSnapshot = await db.collection('times').get();
  timesSnapshot.forEach(doc => {
    times[doc.id] = doc.data().nome;
  });
  
  // Buscar jogos em todas as fases
  for (const fase of fases) {
    const rodadasSnapshot = await db.collection(fase).get();
    
    rodadasSnapshot.forEach(doc => {
      const rodada = doc.data();
      const rodadaNumero = parseInt(doc.id.replace('rodada', ''));
      
      if (rodada.jogos) {
        rodada.jogos.forEach(jogo => {
          if (jogo.data === dateString) {
            games.push({
              timeA: times[jogo.timeA] || jogo.timeA,
              timeB: times[jogo.timeB] || jogo.timeB,
              hora: jogo.hora,
              rodada: rodadaNumero
            });
          }
        });
      }
    });
  }
  
  // Ordenar por horário
  games.sort((a, b) => {
    const timeA = a.hora.split(':').map(Number);
    const timeB = b.hora.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });
  
  return games;
}

/**
 * Envia notificação para todos os dispositivos registrados
 */
async function sendNotificationToAll(title, body) {
  let totalSuccess = 0;
  let totalFailure = 0;

  // 1. ENVIAR PARA FCM (Android/Chrome)
  console.log('📱 Enviando para dispositivos FCM (Android/Chrome)...');
  const fcmResult = await sendToFCM(title, body);
  totalSuccess += fcmResult.success;
  totalFailure += fcmResult.failure;

  // 2. ENVIAR PARA WEB PUSH (iOS)
  console.log('🍎 Enviando para dispositivos iOS...');
  const iosResult = await sendToWebPush(title, body);
  totalSuccess += iosResult.success;
  totalFailure += iosResult.failure;

  console.log(`✅ Total enviadas: ${totalSuccess}`);
  console.log(`❌ Total falhas: ${totalFailure}`);
}

/**
 * Envia notificações via FCM (Android/Chrome)
 */
async function sendToFCM(title, body) {
  // Buscar todos os tokens FCM
  const tokensSnapshot = await db.collection('fcmTokens').get();
  
  if (tokensSnapshot.empty) {
    console.log('⚠️ Nenhum token FCM registrado');
    return { success: 0, failure: 0 };
  }
  
  const tokens = [];
  tokensSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.token) {
      tokens.push(data.token);
    }
  });
  
  console.log(`📱 Enviando para ${tokens.length} dispositivo(s) FCM`);
  
  if (tokens.length === 0) {
    return { success: 0, failure: 0 };
  }
  
  // Enviar notificação para cada token individualmente
  let successCount = 0;
  let failureCount = 0;
  const tokensToRemove = [];
  
  for (const token of tokens) {
    try {
      await messaging.send({
        notification: {
          title: title,
          body: body
        },
        android: {
          priority: 'high',
          notification: {
            color: '#2e7d32',
            channelId: 'sapos-league-games',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        webpush: {
          notification: {
            icon: 'https://saposleague.github.io/2026/images/web-app-manifest-192x192.png',
            badge: 'https://saposleague.github.io/2026/images/web-app-manifest-192x192.png',
            vibrate: [200, 100, 200],
            requireInteraction: false
          },
          fcmOptions: {
            link: 'https://saposleague.github.io/2026/'
          },
          data: {
            url: 'https://saposleague.github.io/2026/'
          }
        },
        data: {
          type: 'game-notification',
          url: 'https://saposleague.github.io/2026/',
          timestamp: Date.now().toString()
        },
        token: token
      });
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`❌ Erro ao enviar FCM: ${error.code}`);
      
      // Marcar tokens inválidos para remoção
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        tokensToRemove.push(token);
      }
    }
  }
  
  console.log(`✅ FCM enviadas: ${successCount}`);
  console.log(`❌ FCM falhas: ${failureCount}`);
  
  // Remover tokens inválidos do Firestore
  for (const token of tokensToRemove) {
    const tokenDoc = await db
      .collection('fcmTokens')
      .where('token', '==', token)
      .get();
    
    tokenDoc.forEach(doc => {
      doc.ref.delete();
      console.log(`🗑️ Token FCM inválido removido`);
    });
  }

  return { success: successCount, failure: failureCount };
}

/**
 * Envia notificações via Web Push (iOS)
 */
async function sendToWebPush(title, body) {
  // Inicializa o webpush com as credenciais do ambiente
  initWebPush();
  // Buscar todas as subscriptions
  const subscriptionsSnapshot = await db.collection('webPushSubscriptions').get();
  
  if (subscriptionsSnapshot.empty) {
    console.log('⚠️ Nenhuma subscription iOS registrada');
    return { success: 0, failure: 0 };
  }
  
  const subscriptions = [];
  subscriptionsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.subscription) {
      subscriptions.push({
        id: doc.id,
        subscription: data.subscription
      });
    }
  });
  
  console.log(`🍎 Enviando para ${subscriptions.length} dispositivo(s) iOS`);
  
  if (subscriptions.length === 0) {
    return { success: 0, failure: 0 };
  }
  
  // Criar payload da notificação (formato compatível com iOS e Android)
  const payload = JSON.stringify({
    notification: {
      title: title,
      body: body,
      icon: 'https://saposleague.github.io/2026/images/web-app-manifest-192x192.png',
      badge: 'https://saposleague.github.io/2026/images/favicon-96x96.png',
      tag: 'sapos-league',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    },
    data: {
      url: 'https://saposleague.github.io/2026/'
    }
  });
  
  // Enviar para cada subscription
  let successCount = 0;
  let failureCount = 0;
  const subscriptionsToRemove = [];
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`❌ Erro Web Push [${sub.id}]: ${error.statusCode} - ${error.body || error.message}`);
      
      // Marcar subscriptions inválidas para remoção (410 = Gone)
      if (error.statusCode === 410 || error.statusCode === 404) {
        subscriptionsToRemove.push(sub.id);
      }
    }
  }
  
  console.log(`✅ iOS enviadas: ${successCount}`);
  console.log(`❌ iOS falhas: ${failureCount}`);
  
  // Remover subscriptions inválidas
  for (const subId of subscriptionsToRemove) {
    await db.collection('webPushSubscriptions').doc(subId).delete();
    console.log(`🗑️ Subscription iOS inválida removida`);
  }

  return { success: successCount, failure: failureCount };
}

/**
 * Função para testar notificações manualmente
 */
exports.testNotification = functions.runWith({ secrets: [VAPID_PRIVATE_KEY] }).https.onRequest(async (req, res) => {
  const caller = await requireAdminRequest(req, res);
  if (!caller) return;

  try {
    console.log(`🧪 Teste manual de notificação iniciado por ${caller.uid}...`);
    
    // Buscar jogos de hoje
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    console.log(`📅 Buscando jogos para: ${todayString}`);
    
    const games = await getGamesForDate(todayString);
    
    console.log(`⚽ Jogos encontrados: ${games.length}`);
    
    if (games.length === 0) {
      res.json({
        success: false,
        message: 'Nenhum jogo encontrado para hoje',
        date: todayString
      });
      return;
    }
    
    // Criar mensagem
    const title = games.length === 1 
      ? `Jogo Hoje - ${games[0].rodada}ª Rodada`
      : `Jogos Hoje - ${games[0].rodada}ª Rodada`;
    const body = games.map(g => `${g.timeA} x ${g.timeB} às ${g.hora}`).join('\n');
    
    console.log(`📢 Título: ${title}`);
    console.log(`📝 Mensagem: ${body}`);
    
    // Contar dispositivos registrados
    const fcmTokensSnapshot = await db.collection('fcmTokens').get();
    const iosSubsSnapshot = await db.collection('webPushSubscriptions').get();
    
    const fcmCount = fcmTokensSnapshot.size;
    const iosCount = iosSubsSnapshot.size;
    
    console.log(`📱 Dispositivos FCM: ${fcmCount}`);
    console.log(`🍎 Dispositivos iOS: ${iosCount}`);
    
    if (fcmCount === 0 && iosCount === 0) {
      res.json({
        success: false,
        message: 'Nenhum dispositivo registrado',
        games: games.length
      });
      return;
    }
    
    // Enviar para FCM
    const fcmResult = await sendToFCM(title, body);
    
    // Enviar para iOS com captura de erros detalhados
    let iosResult = { success: 0, failure: 0 };
    const iosErrors = [];
    
    try {
      initWebPush();

      const subscriptions = [];
      iosSubsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.subscription) {
          subscriptions.push({
            id: doc.id,
            subscription: data.subscription
          });
        }
      });
      
      const payload = JSON.stringify({
        notification: {
          title: title,
          body: body,
          icon: 'https://saposleague.github.io/2026/images/web-app-manifest-192x192.png',
          badge: 'https://saposleague.github.io/2026/images/favicon-96x96.png',
          tag: 'sapos-league',
          requireInteraction: false,
          vibrate: [200, 100, 200]
        },
        data: {
          url: 'https://saposleague.github.io/2026/'
        }
      });
      
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          iosResult.success++;
        } catch (error) {
          iosResult.failure++;
          iosErrors.push({
            id: sub.id,
            statusCode: error.statusCode,
            message: error.message,
            body: error.body
          });
        }
      }
    } catch (error) {
      iosErrors.push({
        general: true,
        message: error.message,
        stack: error.stack
      });
    }
    
    const totalSent = fcmResult.success + iosResult.success;
    const totalFailed = fcmResult.failure + iosResult.failure;
    
    console.log(`✅ Total enviadas: ${totalSent}`);
    console.log(`❌ Total falhas: ${totalFailed}`);
    
    res.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      fcm: { sent: fcmResult.success, failed: fcmResult.failure, total: fcmCount },
      ios: { sent: iosResult.success, failed: iosResult.failure, total: iosCount, errors: iosErrors },
      games: games.length,
      date: todayString,
      title: title,
      body: body
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de teste:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Função para testar notificações de segunda a quarta manualmente
 */
exports.testWeekNotification = functions.runWith({ secrets: [VAPID_PRIVATE_KEY] }).https.onRequest(async (req, res) => {
  const caller = await requireAdminRequest(req, res);
  if (!caller) return;

  try {
    console.log(`🧪 Teste manual de notificação da semana iniciado por ${caller.uid}...`);
    
    // Calcular data da próxima quinta-feira
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui
    
    let daysUntilThursday;
    if (dayOfWeek === 0) daysUntilThursday = 4; // Domingo -> Quinta
    else if (dayOfWeek === 1) daysUntilThursday = 3; // Segunda -> Quinta
    else if (dayOfWeek === 2) daysUntilThursday = 2; // Terça -> Quinta
    else if (dayOfWeek === 3) daysUntilThursday = 1; // Quarta -> Quinta
    else if (dayOfWeek === 4) daysUntilThursday = 7; // Quinta -> Próxima quinta
    else if (dayOfWeek === 5) daysUntilThursday = 6; // Sexta -> Quinta
    else daysUntilThursday = 5; // Sábado -> Quinta
    
    const thursday = new Date(today);
    thursday.setDate(today.getDate() + daysUntilThursday);
    const thursdayString = thursday.toISOString().split('T')[0];
    
    console.log(`📅 Buscando jogos para quinta-feira: ${thursdayString}`);
    
    // Buscar jogos de quinta-feira
    const games = await getGamesForDate(thursdayString);
    
    console.log(`⚽ Jogos encontrados: ${games.length}`);
    
    if (games.length === 0) {
      res.json({
        success: false,
        message: 'Nenhum jogo encontrado para quinta-feira',
        date: thursdayString,
        daysUntil: daysUntilThursday
      });
      return;
    }
    
    // Criar mensagem
    const title = games.length === 1 
      ? `Jogo Quinta-Feira - ${games[0].rodada}ª Rodada`
      : `Jogos Quinta-Feira - ${games[0].rodada}ª Rodada`;
    const body = games.map(g => `${g.timeA} x ${g.timeB} às ${g.hora}`).join('\n');
    
    console.log(`📢 Título: ${title}`);
    console.log(`📝 Mensagem: ${body}`);
    
    // Contar dispositivos registrados
    const fcmTokensSnapshot = await db.collection('fcmTokens').get();
    const iosSubsSnapshot = await db.collection('webPushSubscriptions').get();
    
    const fcmCount = fcmTokensSnapshot.size;
    const iosCount = iosSubsSnapshot.size;
    
    console.log(`📱 Dispositivos FCM: ${fcmCount}`);
    console.log(`🍎 Dispositivos iOS: ${iosCount}`);
    
    if (fcmCount === 0 && iosCount === 0) {
      res.json({
        success: false,
        message: 'Nenhum dispositivo registrado',
        games: games.length
      });
      return;
    }
    
    // Enviar notificação
    const fcmResult = await sendToFCM(title, body);
    const iosResult = await sendToWebPush(title, body);
    
    const totalSent = fcmResult.success + iosResult.success;
    const totalFailed = fcmResult.failure + iosResult.failure;
    
    console.log(`✅ Total enviadas: ${totalSent}`);
    console.log(`❌ Total falhas: ${totalFailed}`);
    
    res.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      fcm: { sent: fcmResult.success, failed: fcmResult.failure, total: fcmCount },
      ios: { sent: iosResult.success, failed: iosResult.failure, total: iosCount },
      games: games.length,
      thursdayDate: thursdayString,
      daysUntil: daysUntilThursday,
      title: title,
      body: body
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de teste da semana:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});


/**
 * Função para forçar teste de notificação (sempre envia)
 */
exports.forceTestNotification = functions.runWith({ secrets: [VAPID_PRIVATE_KEY] }).https.onRequest(async (req, res) => {
  const caller = await requireAdminRequest(req, res);
  if (!caller) return;

  try {
    console.log(`🧪 Teste forçado de notificação iniciado por ${caller.uid}...`);
    
    const title = '🧪 Teste de Notificação';
    const body = 'Se você recebeu isso, as notificações estão funcionando perfeitamente!';
    
    // Contar dispositivos registrados
    const fcmTokensSnapshot = await db.collection('fcmTokens').get();
    const iosSubsSnapshot = await db.collection('webPushSubscriptions').get();
    
    const fcmCount = fcmTokensSnapshot.size;
    const iosCount = iosSubsSnapshot.size;
    
    console.log(`📱 Dispositivos FCM: ${fcmCount}`);
    console.log(`🍎 Dispositivos iOS: ${iosCount}`);
    
    if (fcmCount === 0 && iosCount === 0) {
      res.json({
        success: false,
        message: 'Nenhum dispositivo registrado'
      });
      return;
    }
    
    // Enviar notificação
    const fcmResult = await sendToFCM(title, body);
    const iosResult = await sendToWebPush(title, body);
    
    const totalSent = fcmResult.success + iosResult.success;
    const totalFailed = fcmResult.failure + iosResult.failure;
    
    console.log(`✅ Total enviadas: ${totalSent}`);
    console.log(`❌ Total falhas: ${totalFailed}`);
    
    res.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      fcm: { sent: fcmResult.success, failed: fcmResult.failure, total: fcmCount },
      ios: { sent: iosResult.success, failed: iosResult.failure, total: iosCount },
      title: title,
      body: body
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de teste forçado:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});
