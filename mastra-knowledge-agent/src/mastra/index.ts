// src/mastra/index.ts
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { knowledgeAgent } from './agents/knowledge-agent';
import { apiRoutes } from './server/routes';

export const mastra = new Mastra({
  agents: { knowledge: knowledgeAgent },
  storage: new LibSQLStore({ url: 'file:../mastra.db' }),
  logger: new PinoLogger({ name: 'Mastra', level: 'info' }),
  server: {
    build: { swaggerUI: true }, // /swagger-ui
    apiRoutes,
  },
});