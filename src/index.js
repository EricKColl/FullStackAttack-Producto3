/**
 * @file src/index.js
 * @description Punto de entrada del backend. Orquesta el arranque de Express,
 *              Apollo Server y la conexión a MongoDB, y configura el shutdown limpio.
 *
 * Orden de arranque:
 *   1. Conectar a MongoDB (si falla, el servidor no arranca).
 *   2. Iniciar Apollo Server.
 *   3. Registrar middlewares de Express (CORS, JSON, GraphQL, 404, errorHandler).
 *   4. Escuchar en el puerto configurado.
 *   5. Registrar handlers de cierre limpio para SIGINT/SIGTERM.
 */

import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';

import { env } from './config/env.js';
import { connectToMongo, closeMongo } from './config/db.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

/**
 * Instancia del servidor Express.
 * Se configura dentro de startServer() tras conectar a Mongo y arrancar Apollo.
 */
const app = express();

/**
 * Instancia de Apollo Server con el schema y los resolvers del proyecto.
 */
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  // introspection permite a Apollo Sandbox explorar el schema en modo dev.
  introspection: env.isDevelopment,
});

/**
 * Arranca el backend completo: Mongo → Apollo → Express → listen.
 *
 * En caso de error en cualquier paso, registra el fallo y termina el proceso
 * con código 1 para que Docker/CI puedan detectar que el contenedor falló.
 *
 * @returns {Promise<void>}
 */
async function startServer() {
  try {
    // 1. Conectar a MongoDB antes que nada.
    //    Si Mongo no está arriba, fallamos rápido y no montamos el servidor web.
    await connectToMongo();

    // 2. Arrancar Apollo Server.
    await apolloServer.start();

    // 3. Middlewares de Express.
    app.use(cors());
    app.use(express.json());

    // 4. Montar el endpoint de GraphQL.
    //    El context (por ahora vacío) se enriquecerá en la Fase 5 con el usuario JWT.
    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async () => ({}),
      })
    );

    // 5. Endpoint raíz: confirma que el servidor está vivo sin tocar GraphQL.
    app.get('/', (req, res) => {
      res.json({
        service: 'JobConnect Backend',
        status: 'ok',
        graphql: '/graphql',
        environment: env.nodeEnv,
      });
    });

    // 6. Middleware de 404 para rutas no definidas (debe ir DESPUÉS de las rutas válidas).
    app.use(notFoundHandler);

    // 7. Middleware centralizado de errores (debe ir el ÚLTIMO).
    app.use(errorHandler);

    // 8. Poner el servidor a escuchar.
    app.listen(env.port, () => {
      console.log(`[server] Servidor escuchando en http://localhost:${env.port}`);
      console.log(`[server] GraphQL disponible en http://localhost:${env.port}/graphql`);
      console.log(`[server] Entorno: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error('[server] Error fatal al arrancar el servidor:', error.message);
    // Salimos con código 1 para que cualquier orquestador (Docker, PM2, CI) detecte el fallo.
    process.exit(1);
  }
}

/**
 * Registra un handler de cierre limpio para una señal del sistema operativo.
 *
 * Cuando llega la señal (por ejemplo Ctrl+C en local o SIGTERM en Docker),
 * cerramos ordenadamente Apollo y la conexión a MongoDB antes de terminar el proceso.
 * Esto evita pérdidas de datos y libera recursos del servidor.
 *
 * @param {NodeJS.Signals} senyal - Nombre de la señal ('SIGINT', 'SIGTERM', ...).
 */
function registrarShutdown(senyal) {
  process.on(senyal, async () => {
    console.log(`\n[server] Señal ${senyal} recibida. Cerrando servidor...`);
    try {
      await apolloServer.stop();
      await closeMongo();
      console.log('[server] Servidor cerrado limpiamente. Hasta pronto.');
      process.exit(0);
    } catch (error) {
      console.error('[server] Error durante el cierre:', error.message);
      process.exit(1);
    }
  });
}

// Registramos el cierre limpio para las señales más comunes:
// - SIGINT: Ctrl+C en terminal.
// - SIGTERM: señal estándar enviada por Docker, systemd, PM2, etc.
registrarShutdown('SIGINT');
registrarShutdown('SIGTERM');

// Punto de arranque real.
startServer();