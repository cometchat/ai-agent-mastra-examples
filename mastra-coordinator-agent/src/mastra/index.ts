
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { relayRouteTool } from './tools/relay-route-tool';
import { relayWorkflow } from './workflows/relay-workflow';
import { Memory } from '@mastra/memory';

const relayRouterAgent = new Agent({
  name: 'Relay Agent',
  instructions: `You are a relay routing layer. You decide nothing yourself; 
  you simply invoke the relay-route tool with the provided question and return its result cleanly. 
  Always return the answer content first, then a short line '([routedTo] | escalated: yes/no)'
  `,
  model: openai('gpt-5'),
  tools: { 'relay-route': relayRouteTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: ':memory:',
    }),
  }),
});

export const mastra = new Mastra({
  agents: { relayRouterAgent },
  workflows: { relayWorkflow },
  storage: new LibSQLStore({
    url: 'file:../mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
