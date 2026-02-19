const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function que roda diariamente nos horários programados
 * para enviar notificações sobre jogos do dia
 */
exports.sendDailyGameNotifications = functions.pubsub
  .schedule('2 12 * * *') // Cron: 12:02 todos os dias
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    console.log('🔔 Iniciando envio de notificações diárias...');
    
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      console.log(`📅 Data de hoje: ${todayString}`);
      
      // Buscar jogos de todas as fases
      const fases = ['rodadas2026_fase1', 'rodadas2026_fase2', 'rodadas2026_final'];
      let todayGames = [];
      let times = {};
      
      // Carregar times primeiro
      const timesSnapshot = await admin.firestore().collection('times').get();
      timesSnapshot.forEach(doc => {
        times[doc.id] = doc.data().nome;
      });
      
      console.log(`📊 Times carregados: ${Object.keys(times).length}`);
      
      // Buscar jogos de hoje em todas as fases
      for (const fase of fases) {
        const rodadasSnapshot = await admin.firestore().collection(fase).get();
        
        rodadasSnapshot.forEach(doc => {
          const rodada = doc.data();
          const rodadaNumero = parseInt(doc.id.replace('rodada', ''));
          
          if (rodada.jogos) {
            rodada.jogos.forEach(jogo => {
              if (jogo.data === todayString) {
                todayGames.push({
                  ...jogo,
                  rodada: rodadaNumero,
                  fase: fase
                });
              }
            });
          }
        });
      }
      
      console.log(`⚽ Jogos encontrados para hoje: ${todayGames.length}`);
      
      if (todayGames.length === 0) {
        console.log('📭 Nenhum jogo para hoje - não enviando notificações');
        return null;
      }
      
      // Ordenar jogos por horário
      todayGames.sort((a, b) => {
        const timeA = a.hora.split(':').map(Number);
        const timeB = b.hora.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
      
      // Criar mensagem baseada na quantidade de jogos
      let title, body;
      
      if (todayGames.length === 1) {
        const game = todayGames[0];
        const timeA = times[game.timeA] || game.timeA;
        const timeB = times[game.timeB] || game.timeB;
        
        title = 'HOJE TEM JOGO! 🔥🔥🔥';
        body = `Hoje, às ${game.hora}, a bola rola para ${timeA} x ${timeB}. Não perca!`;
        
      } else if (todayGames.length === 2) {
        const game1 = todayGames[0];
        const game2 = todayGames[1];
        const timeA1 = times[game1.timeA] || game1.timeA;
        const timeB1 = times[game1.timeB] || game1.timeB;
        const timeA2 = times[game2.timeA] || game2.timeA;
        const timeB2 = times[game2.timeB] || game2.timeB;
        
        title = 'HOJE TEM RODADA DUPLA! 🔥🔥🔥';
        body = `Hoje, às ${game1.hora}, a bola rola para ${timeA1} x ${timeB1} e logo em seguida, às ${game2.hora}, a bola rola para ${timeA2} x ${timeB2}. Não perca!`;
        
      } else {
        title = 'HOJE TEM JOGOS! 🔥🔥🔥';
        body = `Hoje tem ${todayGames.length} jogos! Primeiro jogo às ${todayGames[0].hora}. Não perca!`;
      }
      
      console.log(`📢 Título: ${title}`);
      console.log(`📝 Mensagem: ${body}`);
      
      // Buscar todos os tokens de dispositivos registrados
      const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
      
      if (tokensSnapshot.empty) {
        console.log('⚠️ Nenhum token FCM registrado');
        return null;
      }
      
      const tokens = [];
      tokensSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          tokens.push(data.token);
        }
      });
      
      console.log(`📱 Tokens encontrados: ${tokens.length}`);
      
      if (tokens.length === 0) {
        console.log('⚠️ Nenhum token válido encontrado');
        return null;
      }
      
      // Criar payload da notificação
      const message = {
        notification: {
          title: title,
          body: body,
          icon: '/images/web-app-manifest-192x192.png',
          badge: '/images/favicon-96x96.png',
          tag: 'sapos-league-daily',
          requireInteraction: false
        },
        data: {
          url: '/',
          type: 'daily-game',
          date: todayString,
          gamesCount: todayGames.length.toString()
        },
        tokens: tokens
      };
      
      // Enviar notificação para todos os dispositivos
      const response = await admin.messaging().sendMulticast(message);
      
      console.log(`✅ Notificações enviadas com sucesso: ${response.successCount}`);
      console.log(`❌ Falhas: ${response.failureCount}`);
      
      // Remover tokens inválidos
      if (response.failureCount > 0) {
        const tokensToRemove = [];
        
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.log(`❌ Erro no token ${idx}: ${resp.error}`);
            
            // Se o token é inválido, marcar para remoção
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
            console.log(`🗑️ Token inválido removido: ${token.substring(0, 20)}...`);
          });
        }
      }
      
      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
        games: todayGames.length
      };
      
    } catch (error) {
      console.error('❌ Erro ao enviar notificações:', error);
      throw error;
    }
  });

/**
 * Função para testar notificações manualmente
 * Pode ser chamada via HTTP para testes
 */
exports.testNotification = functions.https.onRequest(async (req, res) => {
  try {
    const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      res.status(404).send('Nenhum token FCM registrado');
      return;
    }
    
    const tokens = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });
    
    const message = {
      notification: {
        title: '🧪 Teste de Notificação',
        body: 'Se você viu isso, as notificações push estão funcionando!',
        icon: '/images/web-app-manifest-192x192.png'
      },
      data: {
        type: 'test',
        timestamp: Date.now().toString()
      },
      tokens: tokens
    };
    
    const response = await admin.messaging().sendMulticast(message);
    
    res.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length
    });
    
  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error);
    res.status(500).json({ error: error.message });
  }
});
