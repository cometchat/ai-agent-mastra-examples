export interface PHPost {
  id: string;
  name: string;
  tagline?: string;
  url?: string;
  votesCount?: number;
}

// Timeframe parsing and timezone handling
// We use Luxon for reliable timezone conversions.
import { DateTime } from 'luxon';

export interface TimeWindow {
  postedAfter: string; // ISO string in UTC
  postedBefore: string; // ISO string in UTC
  label?: string;
}

export type TimeframeInput =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'week'
  | 'this-month'
  | 'last-month'
  | 'month'
  | string | undefined;

const DEFAULT_TZ = 'America/New_York';

export function parseTimeframe(
  timeframe?: TimeframeInput,
  tz: string = DEFAULT_TZ,
  opts?: { now?: Date }
): TimeWindow {
  const nowZ = DateTime.fromJSDate(opts?.now ?? new Date(), { zone: tz });

  const norm = (timeframe || '').trim().toLowerCase();

  // Support explicit single date: YYYY-MM-DD
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(norm);
  if (dateMatch) {
    const [_, y, m, d] = dateMatch;
    const start = DateTime.fromISO(`${y}-${m}-${d}T00:00:00`, { zone: tz });
    const end = start.plus({ days: 1 });
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'day' };
  }

  // Support explicit range via `from:YYYY-MM-DD to:YYYY-MM-DD` or `from=... to=...`
  const rangeMatch = /from[:=]\s*(\d{4}-\d{2}-\d{2}).*to[:=]\s*(\d{4}-\d{2}-\d{2})/.exec(norm);
  if (rangeMatch) {
    const [, fromStr, toStr] = rangeMatch;
    const start = DateTime.fromISO(`${fromStr}T00:00:00`, { zone: tz });
    // Use end as next day 00:00 to make [start, end) interval
    const end = DateTime.fromISO(`${toStr}T00:00:00`, { zone: tz }).plus({ days: 1 });
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'range' };
  }

  // Normalize common phrases
  const is = (...phrases: string[]) => phrases.some(p => norm.includes(p));

  if (!norm || is('today')) {
    const start = nowZ.startOf('day');
    const end = start.plus({ days: 1 });
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'today' };
  }

  if (is('yesterday')) {
    const start = nowZ.startOf('day').minus({ days: 1 });
    const end = nowZ.startOf('day');
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'yesterday' };
  }

  if (is('this week', 'this-week', 'week')) {
    const start = nowZ.startOf('week'); // Luxon defaults to Monday; acceptable as canonical
    const end = nowZ; // up to now
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'this-week' };
  }

  if (is('last week', 'last-week')) {
    const start = nowZ.startOf('week').minus({ weeks: 1 });
    const end = nowZ.startOf('week');
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'last-week' };
  }

  if (is('this month', 'this-month', 'month')) {
    const start = nowZ.startOf('month');
    const end = nowZ; // up to now
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'this-month' };
  }

  if (is('last month', 'last-month')) {
    const start = nowZ.startOf('month').minus({ months: 1 });
    const end = nowZ.startOf('month');
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'last-month' };
  }

  // Fallback: treat as a rolling N days if user wrote like "past 7 days" or "last 10 days"
  const ndays = /(?:past|last)\s+(\d{1,2})\s+day/.exec(norm);
  if (ndays) {
    const n = Math.min(31, Math.max(1, parseInt(ndays[1], 10)));
    const start = nowZ.minus({ days: n });
    const end = nowZ;
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: `last-${n}-days` };
  }

  // Default to today if unrecognized
  const start = nowZ.startOf('day');
  const end = start.plus({ days: 1 });
  return { postedAfter: start.toUTC().toISO()!, postedBefore: end.toUTC().toISO()!, label: 'today' };
}

export async function getTopProductsByVotes(first: number = 3): Promise<PHPost[]> {
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  if (!token) return [];

  const query = `
    query TopByVotes($first: Int!) {
      posts(order: VOTES, first: $first) {
        edges {
          node { id name tagline url votesCount }
        }
      }
    }
  `;

  try {
    const resp = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables: { first } }),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as any;
    const edges = json?.data?.posts?.edges ?? [];
    return edges.map((e: any) => ({
      id: e.node.id,
      name: e.node.name,
      tagline: e.node.tagline,
      url: e.node.url,
      votesCount: e.node.votesCount,
    }));
  } catch {
    return [];
  }
}

// Top products within the last N days by ranking (default: 7 days = this week)
export async function getTopProductsThisWeek(first: number = 3, days: number = 7): Promise<PHPost[]> {
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  if (!token) return [];

  const now = new Date();
  const afterDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const postedAfter = afterDate.toISOString();
  const postedBefore = now.toISOString();

  const withVars = `
    query TopWeek($first: Int!, $postedAfter: DateTime!, $postedBefore: DateTime!) {
      posts(first: $first, order: RANKING, postedAfter: $postedAfter, postedBefore: $postedBefore) {
        edges { node { id name tagline url votesCount } }
      }
    }
  `;

  const endpoint = 'https://api.producthunt.com/v2/api/graphql';
  try {
    // Try variable form
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: withVars, variables: { first, postedAfter, postedBefore } }),
    });
    let edges: any[] = [];
    if (resp.ok) {
      const json = (await resp.json()) as any;
      edges = json?.data?.posts?.edges ?? [];
    }

    // If empty, fallback to inline literal query
    if (!Array.isArray(edges) || edges.length === 0) {
      const inline = `query { posts(first: ${Math.max(1, Math.min(50, first))}, order: RANKING, postedAfter: \"${postedAfter}\", postedBefore: \"${postedBefore}\") { edges { node { id name tagline url votesCount } } } }`;
      const resp2 = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: inline }),
      });
      if (resp2.ok) {
        const json2 = (await resp2.json()) as any;
        edges = json2?.data?.posts?.edges ?? [];
      }
    }

    return (edges || []).map((e: any) => ({
      id: e.node.id,
      name: e.node.name,
      tagline: e.node.tagline,
      url: e.node.url,
      votesCount: e.node.votesCount,
    }));
  } catch {
    return [];
  }
}

// Generic: Top products for a parsed timeframe and timezone
export async function getTopProductsByTimeframe(params: {
  first?: number;
  timeframe?: TimeframeInput;
  tz?: string;
  now?: Date;
}): Promise<PHPost[]> {
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  if (!token) return [];

  const { first = 3, timeframe, tz = DEFAULT_TZ, now } = params || {};
  const { postedAfter, postedBefore } = parseTimeframe(timeframe, tz, { now });

  const endpoint = 'https://api.producthunt.com/v2/api/graphql';
  const query = `query TopByTimeframe($first: Int!, $postedAfter: DateTime!, $postedBefore: DateTime!) {
    posts(first: $first, order: RANKING, postedAfter: $postedAfter, postedBefore: $postedBefore) {
      edges { node { id name tagline url votesCount } }
    }
  }`;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables: { first, postedAfter, postedBefore } }),
    });
    let edges: any[] = [];
    if (resp.ok) {
      const json = (await resp.json()) as any;
      edges = json?.data?.posts?.edges ?? [];
    }

    // Fallback inline query if variables approach yields nothing
    if (!Array.isArray(edges) || edges.length === 0) {
      const inline = `query { posts(first: ${Math.max(1, Math.min(50, first))}, order: RANKING, postedAfter: \"${postedAfter}\", postedBefore: \"${postedBefore}\") { edges { node { id name tagline url votesCount } } } }`;
      const resp2 = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: inline }),
      });
      if (resp2.ok) {
        const json2 = (await resp2.json()) as any;
        edges = json2?.data?.posts?.edges ?? [];
      }
    }

    return (edges || []).map((e: any) => ({
      id: e.node.id,
      name: e.node.name,
      tagline: e.node.tagline,
      url: e.node.url,
      votesCount: e.node.votesCount,
    }));
  } catch {
    return [];
  }
}

export interface AlgoliaHit {
  objectID: string;
  name: string;
  tagline?: string;
  url?: string;
  votesCount?: number;
}

export async function searchProducts(query: string, opts?: { limit?: number }): Promise<AlgoliaHit[]> {
  // Use only the public PH Algolia GET endpoint and credentials as specified.
  const ALGOLIA_HOST = 'https://0h4smabbsg-dsn.algolia.net';
  const INDEX = 'Post_production';
  const APP_ID = '0H4SMABBSG';
  const SEARCH_KEY = '9670d2d619b9d07859448d7628eea5f3';

  const hitsPerPage = Math.max(1, Math.min(50, Number(opts?.limit ?? 10)));

  const url = `${ALGOLIA_HOST}/1/indexes/${encodeURIComponent(INDEX)}?query=${encodeURIComponent(query)}&hitsPerPage=${encodeURIComponent(
    String(hitsPerPage),
  )}`;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Algolia-API-Key': SEARCH_KEY,
        'X-Algolia-Application-Id': APP_ID,
      },
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as any;
    const hitsRaw = Array.isArray(json?.hits) ? json.hits : [];
    return hitsRaw.map((h: any) => ({
      objectID: h.objectID ?? h.id ?? String(h.id ?? ''),
      name: h.name,
      tagline: h.tagline ?? h.tag_line ?? h.tagLine,
      url: h.url ?? h.post_url,
      votesCount: h.votesCount ?? h.votes_count,
    }));
  } catch {
    return [];
  }
}
