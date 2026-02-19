const functions = require('firebase-functions');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();

// Versão: 1.3 - Suporte completo para iOS Web Push

// Configurar Web Push VAPID
webpush.setVapidDetails(
  'mailto:contato@saposleague.com',
  'BOhtY4OV28BYdfrjYvpTmyrp34WcUExr_uCwgs8KeRLWL3WdMREX3VcFqC2SwJYWCwDoMzKv-Okmv82JaweRK5M',
  '1kH9DbsiSlEcQwBjyoBTGNU0p6zvf6C9MXEtFFEfUAg'
);

/**
 * Notificações de Segunda a Quarta às 08:00
 * Avisa sobre jogos de quinta-feira
 */
exports.notifyWeekGames = functions.pubsub
  .schedule('0 8 * * 1,2,3') // Segunda, Terça, Quarta às 08:00
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('📅 Verificando jogos da semana (quinta-feira)...');
    
    try {
      // Calcular data da próxima quinta-feira
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui
      
      let daysUntilThursday;
      if (dayOfWeek === 1) daysUntilThursday = 3; // Segunda -> Quinta
      else if (dayOfWeek === 2) daysUntilThursday = 2; // Terça -> Quinta
      else if (dayOfWeek === 3) daysUntilThursday = 1; // Quarta -> Quinta
      else return null; // Não deveria acontecer
      
      const thursday = new Date(today);
      thursday.setDate(today.getDate() + daysUntilThursday);
      const thursdayString = thursday.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`🔍 Buscando jogos para quinta-feira: ${thursdayString}`);
      
      // Buscar jogos de quinta-feira
      const games = await getGamesForDate(thursdayString);
      
      if (games.length === 0) {
        console.log('📭 Nenhum jogo encontrado para quinta-feira');
        return null;
      }
      
      console.log(`⚽ ${games.length} jogo(s) encontrado(s) para quinta-feira`);
      
      // Criar mensagem
      const title = games.length === 1 ? 'Jogo da Semana' : 'Jogos da Semana';
      const rodada = games[0].rodada;
      const body = createGameMessage(games, rodada);
      
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
exports.notifyTodayGames = functions.pubsub
  .schedule('0 0,12,19 * * 4') // Quinta às 00:00, 12:00 e 19:00
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('🔔 Verificando jogos de hoje (quinta-feira)...');
    
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`🔍 Buscando jogos para hoje: ${todayString}`);
      
      // Buscar jogos de hoje
      const games = await getGamesForDate(todayString);
      
      if (games.length === 0) {
        console.log('📭 Nenhum jogo encontrado para hoje');
        return null;
      }
      
      console.log(`⚽ ${games.length} jogo(s) encontrado(s) para hoje`);
      
      // Criar mensagem
      const title = games.length === 1 ? 'Jogo Hoje' : 'Jogos Hoje';
      const rodada = games[0].rodada;
      const body = createGameMessage(games, rodada);
      
      // Enviar notificação
      await sendNotificationToAll(title, body);
      
      return { success: true, games: games.length };
      
    } catch (error) {
      console.error('❌ Erro ao enviar notificações de hoje:', error);
      throw error;
    }
  });

/**
 * Notificação de TESTE - Quinta às 16:40
 */
exports.notifyTodayGamesTest = functions.pubsub
  .schedule('40 16 * * 4') // Quinta às 16:40 (TESTE)
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('🧪 TESTE - Verificando jogos de hoje (quinta-feira - 16:40)...');
    
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`🔍 Buscando jogos para hoje: ${todayString}`);
      
      // Buscar jogos de hoje
      const games = await getGamesForDate(todayString);
      
      if (games.length === 0) {
        console.log('📭 Nenhum jogo encontrado para hoje');
        return null;
      }
      
      console.log(`⚽ ${games.length} jogo(s) encontrado(s) para hoje`);
      
      // Criar mensagem
      const title = games.length === 1 ? 'Jogo Hoje' : 'Jogos Hoje';
      const rodada = games[0].rodada;
      const body = createGameMessage(games, rodada);
      
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
  const timesSnapshot = await admin.firestore().collection('times').get();
  timesSnapshot.forEach(doc => {
    times[doc.id] = doc.data().nome;
  });
  
  // Buscar jogos em todas as fases
  for (const fase of fases) {
    const rodadasSnapshot = await admin.firestore().collection(fase).get();
    
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
 * Cria mensagem formatada com os jogos
 */
function createGameMessage(games, rodada) {
  const rodadaOrdinal = `${rodada}ª Rodada`;
  
  if (games.length === 1) {
    const game = games[0];
    return `${rodadaOrdinal}\n${game.timeA} x ${game.timeB} às ${game.hora}`;
  } else {
    const gamesList = games.map(g => `${g.timeA} x ${g.timeB} às ${g.hora}`).join('\n');
    return `${rodadaOrdinal}\n${gamesList}`;
  }
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
  const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
  
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
      await admin.messaging().send({
        notification: {
          title: title,
          body: body
        },
        data: {
          type: 'game-notification',
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
    const tokenDoc = await admin.firestore()
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
  // Buscar todas as subscriptions
  const subscriptionsSnapshot = await admin.firestore().collection('webPushSubscriptions').get();
  
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
  
  // Criar payload da notificação
  const payload = JSON.stringify({
    title: title,
    body: body,
    icon: '/images/web-app-manifest-192x192.png',
    badge: '/images/favicon-96x96.png',
    tag: 'sapos-league',
    data: {
      type: 'game-notification',
      timestamp: Date.now()
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
      console.error(`❌ Erro ao enviar Web Push: ${error.statusCode}`);
      
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
    await admin.firestore().collection('webPushSubscriptions').doc(subId).delete();
    console.log(`🗑️ Subscription iOS inválida removida`);
  }

  return { success: successCount, failure: failureCount };
}

/**
 * Função para testar notificações manualmente
 */
exports.testNotification = functions.https.onRequest(async (req, res) => {
  try {
    console.log('🧪 Teste manual de notificação iniciado...');
    
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
    const title = games.length === 1 ? 'Jogo Hoje' : 'Jogos Hoje';
    const rodada = games[0].rodada;
    const body = createGameMessage(games, rodada);
    
    console.log(`📢 Título: ${title}`);
    console.log(`📝 Mensagem: ${body}`);
    
    // Contar dispositivos registrados
    const fcmTokensSnapshot = await admin.firestore().collection('fcmTokens').get();
    const iosSubsSnapshot = await admin.firestore().collection('webPushSubscriptions').get();
    
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
    
    // Enviar para iOS
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
