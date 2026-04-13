import type { APIRoute } from 'astro';
import { refreshGitHubRepositoryCardsCache } from '../../lib/github-repositories';

export const prerender = false;

const unauthorizedResponse = new Response(
  JSON.stringify({
    ok: false,
    error: 'Unauthorized',
  }),
  {
    status: 401,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  },
);

const isAuthorizedCronRequest = (request: Request): boolean => {
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
};

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorizedResponse;
  }

  const result = await refreshGitHubRepositoryCardsCache();

  return new Response(
    JSON.stringify({
      ok: result.isAvailable,
      error: result.errorMessage,
      repositories: result.repositories.length,
    }),
    {
      status: result.isAvailable ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  );
};
