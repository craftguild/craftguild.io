import { projects } from '../data/projects';

type GitHubRepository = Readonly<{
  stargazers_count: number;
}>;

type GitHubRelease = Readonly<{
  tag_name: string;
}>;

export type GitHubRepositoryMetadata = Readonly<{
  stars: number | null;
  latestReleaseTag: string | null;
}>;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GITHUB_API_TIMEOUT_MS = 500;

const repositoryPaths = projects.map((project) => new URL(project.link).pathname.slice(1));

let cachedRepositoryMetadata:
  | Readonly<Record<string, GitHubRepositoryMetadata>>
  | undefined;
let cacheExpiresAt = 0;

export const getGitHubRepositoryMetadata = async (): Promise<
  Readonly<Record<string, GitHubRepositoryMetadata>>
> => {
  const now = Date.now();

  if (cachedRepositoryMetadata && now < cacheExpiresAt) {
    return cachedRepositoryMetadata;
  }

  const entries = await Promise.all(
    repositoryPaths.map(async (repositoryPath) => [
      repositoryPath,
      await fetchRepositoryMetadata(repositoryPath),
    ]),
  );

  const repositoryMetadata = Object.fromEntries(entries);

  cachedRepositoryMetadata = repositoryMetadata;
  cacheExpiresAt = now + CACHE_TTL_MS;

  return repositoryMetadata;
};

const fetchRepositoryMetadata = async (
  repositoryPath: string,
): Promise<GitHubRepositoryMetadata> => {
  const [stars, latestReleaseTag] = await Promise.all([
    fetchStarCount(repositoryPath),
    fetchLatestReleaseTag(repositoryPath),
  ]);

  return {
    stars,
    latestReleaseTag,
  };
};

const fetchStarCount = async (repositoryPath: string): Promise<number | null> => {
  const repository = await fetchGitHubJson<GitHubRepository>(`repos/${repositoryPath}`);

  return repository?.stargazers_count ?? null;
};

const fetchLatestReleaseTag = async (repositoryPath: string): Promise<string | null> => {
  const release = await fetchGitHubJson<GitHubRelease>(`repos/${repositoryPath}/releases/latest`);

  return release?.tag_name ?? null;
};

const fetchGitHubJson = async <T>(path: string): Promise<T | null> => {
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

    const response = await fetch(`https://api.github.com/${path}`, {
      headers,
      signal: abortController.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
