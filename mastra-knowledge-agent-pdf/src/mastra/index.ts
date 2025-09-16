
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { pdfAgent } from './agents/pdf-agent';
import { singlePdfAgent } from './agents/single-pdf-agent';
import { pdfWorkflow } from './workflows/pdf-workflow';

export const mastra = new Mastra({
  workflows: { pdfWorkflow },
  agents: { pdfAgent, singlePdfAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
