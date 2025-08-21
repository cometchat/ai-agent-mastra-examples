// src/mastra/server/routes.ts
import type { APIRoute } from '@mastra/core/types'; // if this type doesn't exist, remove the annotation

import { ingestSourcesHandler } from './routes/ingest';
import { searchDocsHandler } from './routes/searchDocs';

// Optional, handy for quick checks in browser or health probes
const rootRoute = {
  method: 'GET',
  path: '/',
  handler: (c: any) => c.text('OK'),
};

export const apiRoutes: Array<APIRoute | any> = [
  rootRoute,
  {
    method: 'POST',
    path: '/api/tools/ingestSources',
    handler: ingestSourcesHandler,
  },
  {
    method: 'POST',
    path: '/api/tools/searchDocs',
    handler: searchDocsHandler,
  },
];