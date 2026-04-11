import { projects } from '../data/projects';

type GitHubRepository = Readonly<{
  stargazers_count: number;
}>;

export type StarCount = number | null;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GITHUB_API_TIMEOUT_MS = 500;

const repositoryPaths = projects.map((project) => new URL(project.link).pathname.slice(1));

let cachedStarCounts: Readonly<Record<string, StarCount>> | undefined;
let cacheExpiresAt = 0;

export const getGitHubStarCounts = async (): Promise<Readonly<Record<string, StarCount>>> => {
  const now = Date.now();

  if (cachedStarCounts && now < cacheExpiresAt) {
    return cachedStarCounts;
  }

  const entries = await Promise.all(
    repositoryPaths.map(async (repositoryPath) => [
      repositoryPath,
      await fetchStarCount(repositoryPath),
    ]),
  );

  const starCounts = Object.fromEntries(entries);

  cachedStarCounts = starCounts;
  cacheExpiresAt = now + CACHE_TTL_MS;

  return starCounts;
};

const fetchStarCount = async (repositoryPath: string): Promise<StarCount> => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GITHUB_API_TIMEOUT_MS);

  try {
    const headers = new Headers({
      Accept: 'application/vnd.github+json',
      'User-Agent': 'craftguild.io',
      'X-GitHub-Api-Version': '2022-11-28',
    });

    if (import.meta.env.GITHUB_TOKEN) {
      headers.set('Authorization', `Bearer ${import.meta.env.GITHUB_TOKEN}`);
    }

    const response = await fetch(`https://api.github.com/repos/${repositoryPath}`, {
      headers,
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    const repository = (await response.json()) as GitHubRepository;

    return repository.stargazers_count;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
