/*
  Product Hunt & Algolia service utilities

  - getTopProductsByDay: Fetches top 3 posts for a given day using Product Hunt GraphQL API
    Requires env: PRODUCTHUNT_API_TOKEN

  - searchProducts: Searches Product Hunt posts using Algolia Search API
    Requires env: ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, ALGOLIA_INDEX_NAME (defaults to Posts_production)

  Both functions fall back to mocked data when env vars are missing to allow the UI to work in demo mode.
*/

export interface PHPost {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  url?: string;
  website?: string;
  votesCount?: number;
  commentsCount?: number;
  thumbnail?: string;
  postedAt?: string;
}

const MOCK_POSTS: PHPost[] = [
  {
    id: 'ph-mock-1',
    name: 'LaunchPad Pro',
    tagline: 'Your Product Hunt launch checklist, automated',
    description: 'Plan, schedule, and track your PH launch like a pro.',
    url: 'https://www.producthunt.com/posts/launchpad-pro',
    website: 'https://example.com',
    votesCount: 1267,
    commentsCount: 143,
    thumbnail:
      'https://ph-files.imgix.net/59b9cdf1-6c20-4ce9-9d10-94d8d8c7a001.png?auto=compress&codec=mozjpeg&cs=strip&w=120&h=120&fit=crop&bg=0fff',
    postedAt: new Date().toISOString(),
  },
  {
    id: 'ph-mock-2',
    name: 'HuntHelper AI',
    tagline: 'AI copilot for your Product Hunt launch',
    description: 'Write taglines, build hunter list, and draft maker comments.',
    url: 'https://www.producthunt.com/posts/hunthelper-ai',
    website: 'https://example.com',
    votesCount: 932,
    commentsCount: 97,
    thumbnail:
      'https://ph-files.imgix.net/6aa8c1a7-2db8-44f8-a73a-4f5f0693c002.png?auto=compress&codec=mozjpeg&cs=strip&w=120&h=120&fit=crop&bg=0fff',
    postedAt: new Date().toISOString(),
  },
  {
    id: 'ph-mock-3',
    name: 'Mocktail',
    tagline: 'Generate realistic screenshots & mocks instantly',
    description: 'Drop in your URL to get PH-ready visuals in seconds.',
    url: 'https://www.producthunt.com/posts/mocktail',
    website: 'https://example.com',
    votesCount: 811,
    commentsCount: 65,
    thumbnail:
      'https://ph-files.imgix.net/8de37a9b-0c2b-4431-8c22-ffb9f2a3d003.png?auto=compress&codec=mozjpeg&cs=strip&w=120&h=120&fit=crop&bg=0fff',
    postedAt: new Date().toISOString(),
  },
];

export async function getTopProductsByDay(dateISO: string): Promise<PHPost[]> {
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  // If missing token, return mock data for demo
  if (!token) {
    return MOCK_POSTS;
  }

  // Build date range for the specified day in UTC
  const day = new Date(dateISO);
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59));

  const postedAfter = start.toISOString();
  const postedBefore = end.toISOString();

  const query = `
    query TopPosts($postedAfter: DateTime!, $postedBefore: DateTime!) {
      posts(first: 3, order: RANKING, postedAfter: $postedAfter, postedBefore: $postedBefore) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            website
            votesCount
            commentsCount
            thumbnail { url }
            postedAt
          }
        }
      }
    }
  `;

  const resp = await fetch('https://api.producthunt.com/v2/api/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables: { postedAfter, postedBefore } }),
  });

  if (!resp.ok) {
    // Fail gracefully with mock data for demo if API not accessible
    return MOCK_POSTS;
  }

  const json = (await resp.json()) as any;
  const edges = json?.data?.posts?.edges ?? [];
  const posts: PHPost[] = edges.map((e: any) => ({
    id: e.node.id,
    name: e.node.name,
    tagline: e.node.tagline,
    description: e.node.description,
    url: e.node.url,
    website: e.node.website,
    votesCount: e.node.votesCount,
    commentsCount: e.node.commentsCount,
    thumbnail: e.node.thumbnail?.url,
    postedAt: e.node.postedAt,
  }));
  return posts;
}

export interface AlgoliaHit {
  objectID: string;
  name: string;
  tagline?: string;
  description?: string;
  url?: string;
  website?: string;
  votesCount?: number;
  commentsCount?: number;
  thumbnail?: string;
  postedAt?: string;
}

export async function searchProducts(query: string): Promise<AlgoliaHit[]> {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const indexName = process.env.ALGOLIA_INDEX_NAME || 'Posts_production';

  if (!appId || !apiKey) {
    // Provide mock search results in demo mode
    return MOCK_POSTS.filter((p) =>
      (p.name + ' ' + (p.tagline ?? '') + ' ' + (p.description ?? ''))
        .toLowerCase()
        .includes(query.toLowerCase()),
    ).map((p) => ({
      objectID: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      url: p.url,
      website: p.website,
      votesCount: p.votesCount,
      commentsCount: p.commentsCount,
      thumbnail: p.thumbnail,
      postedAt: p.postedAt,
    }));
  }

  const endpoint = `https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-Application-Id': appId,
      'X-Algolia-API-Key': apiKey,
    },
    body: JSON.stringify({ query, hitsPerPage: 10 }),
  });

  if (!resp.ok) {
    return [];
  }
  const json = (await resp.json()) as any;
  const hitsRaw = json?.hits ?? [];
  const hits: AlgoliaHit[] = hitsRaw.map((h: any) => ({
    objectID: h.objectID ?? h.id ?? String(h.id ?? ''),
    name: h.name,
    tagline: h.tagline ?? h.tag_line ?? h.tagLine,
    description: h.description,
    url: h.url ?? h.post_url,
    website: h.website ?? h.redirect_url,
    votesCount: h.votesCount ?? h.votes_count,
    commentsCount: h.commentsCount ?? h.comments_count,
    thumbnail: h.thumbnail?.image_url ?? h.thumbnail,
    postedAt: h.created_at ?? h.postedAt,
  }));
  return hits;
}

