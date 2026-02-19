const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
 * Notificação de TESTE - Quinta às 15:30
 */
exports.notifyTodayGamesTest = functions.pubsub
  .schedule('30 15 * * 4') // Quinta às 15:30 (TESTE)
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('🧪 TESTE - Verificando jogos de hoje (quinta-feira - 15:30)...');
    
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
  // Buscar todos os tokens
  const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
  
  if (tokensSnapshot.empty) {
    console.log('⚠️ Nenhum token FCM registrado');
    return;
  }
  
  const tokens = [];
  tokensSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.token) {
      tokens.push(data.token);
    }
  });
  
  console.log(`📱 Enviando para ${tokens.length} dispositivo(s)`);
  
  if (tokens.length === 0) {
    console.log('⚠️ Nenhum token válido encontrado');
    return;
  }
  
  // Criar payload da notificação
  const message = {
    notification: {
      title: title,
      body: body
    },
    data: {
      type: 'game-notification',
      timestamp: Date.now().toString()
    },
    tokens: tokens
  };
  
  // Enviar notificação
  const response = await admin.messaging().sendMulticast(message);
  
  console.log(`✅ Notificações enviadas: ${response.successCount}`);
  console.log(`❌ Falhas: ${response.failureCount}`);
  
  // Remover tokens inválidos
  if (response.failureCount > 0) {
    const tokensToRemove = [];
    
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        if (resp.error.code === 'messaging/invalid-registration-token' ||
            resp.error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });
    
    // Remover tokens inválidos do Firestore
    for (const token of tokensToRemove) {
      const tokenDoc = await admin.firestore()
        .collection('fcmTokens')
        .where('token', '==', token)
        .get();
      
      tokenDoc.forEach(doc => {
        doc.ref.delete();
        console.log(`🗑️ Token inválido removido`);
      });
    }
  }
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
    
    // Buscar tokens
    const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      res.json({
        success: false,
        message: 'Nenhum token FCM registrado',
        games: games.length
      });
      return;
    }
    
    const tokens = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });
    
    console.log(`📱 Tokens encontrados: ${tokens.length}`);
    
    // Enviar notificação
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        type: 'test',
        timestamp: Date.now().toString()
      },
      tokens: tokens
    };
    
    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`✅ Enviadas: ${response.successCount}`);
    console.log(`❌ Falhas: ${response.failureCount}`);
    
    res.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length,
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
