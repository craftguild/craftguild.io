import type { SimpleIcon } from 'simple-icons';
import {
  siAstro,
  siCplusplus,
  siCss,
  siGnubash,
  siJavascript,
  siRust,
  siSharp,
  siShell,
  siSvelte,
  siTypescript,
  siVuedotjs,
} from 'simple-icons';
import { githubOrganizations } from '../data/github-organizations';

type GitHubRepository = Readonly<{
  archived: boolean;
  description: string | null;
  fork: boolean;
  full_name: string;
  html_url: `https://${string}`;
  is_template?: boolean;
  name: string;
  stargazers_count: number;
  topics?: readonly string[];
  updated_at: string;
}>;

type GitHubTagRef = Readonly<{
  ref: string;
  object: {
    sha: string;
    type: string;
  };
}>;

type GitHubError = Readonly<{
  message?: string;
}>;

type GitHubFetchResult<T> = Readonly<
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: string;
    }
>;

type GitHubFetchFailure = Extract<GitHubFetchResult<unknown>, { data: null }>;

type SemverVersion = Readonly<{
  major: number;
  minor: number;
  patch: number;
  prerelease: readonly string[];
}>;

export type LanguageIcon = Readonly<{
  title: string;
  path: string;
  hex: string;
}>;

export type GitHubRepositoryCard = Readonly<{
  name: string;
  shortName: string;
  link: `https://${string}`;
  summary: string | null;
  tags: readonly string[];
  languageIcon: LanguageIcon | null;
  stars: number;
  latestTag: string | null;
}>;

export type GitHubRepositoryCardsResult = Readonly<
  {
    isAvailable: boolean;
    errorMessage: string | null;
    repositories: readonly GitHubRepositoryCard[];
  }
>;

type RepositoryCardResult = Readonly<
  | {
      repositoryCard: GitHubRepositoryCard;
      error: null;
    }
  | {
      repositoryCard: null;
      error: string;
    }
>;

const CACHE_TTL_MS = 25 * 60 * 60 * 1000;
const GITHUB_API_TIMEOUT_MS = 500;
const MAX_REPOSITORIES = 100;
const MAX_PAGES_PER_ORGANIZATION = 10;
const SEMVER_TAG_PATTERN =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const languageIconByGitHubLanguage: Partial<Record<string, SimpleIcon>> = {
  Astro: siAstro,
  TypeScript: siTypescript,
  JavaScript: siJavascript,
  CSS: siCss,
  'C++': siCplusplus,
  'C#': siSharp,
  Shell: siShell ?? siGnubash,
  Vue: siVuedotjs,
  Svelte: siSvelte,
  Rust: siRust,
};

let cachedRepositoryCards: readonly GitHubRepositoryCard[] | undefined;
let cacheExpiresAt = 0;

export const getGitHubRepositoryCards = async (): Promise<GitHubRepositoryCardsResult> => {
  const now = Date.now();

  if (cachedRepositoryCards && now < cacheExpiresAt) {
    return {
      isAvailable: true,
      errorMessage: null,
      repositories: cachedRepositoryCards,
    };
  }

  const result = await fetchGitHubRepositoryCards();

  if (!result.repositoryCards) {
    cachedRepositoryCards = undefined;
    cacheExpiresAt = 0;

    return {
      isAvailable: false,
      errorMessage: result.error,
      repositories: [],
    };
  }

  cachedRepositoryCards = result.repositoryCards;
  cacheExpiresAt = now + CACHE_TTL_MS;

  return {
    isAvailable: true,
    errorMessage: null,
    repositories: result.repositoryCards,
  };
};

export const refreshGitHubRepositoryCardsCache =
  async (): Promise<GitHubRepositoryCardsResult> => {
    cachedRepositoryCards = undefined;
    cacheExpiresAt = 0;

    const result = await fetchGitHubRepositoryCards();

    if (!result.repositoryCards) {
      return {
        isAvailable: false,
        errorMessage: result.error,
        repositories: [],
      };
    }

    cachedRepositoryCards = result.repositoryCards;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    return {
      isAvailable: true,
      errorMessage: null,
      repositories: result.repositoryCards,
    };
  };

const fetchGitHubRepositoryCards = async (): Promise<{
  repositoryCards: readonly GitHubRepositoryCard[] | null;
  error: string | null;
}> => {
  const organizationRepositoryResults = await Promise.all(
    githubOrganizations.map(fetchOrganizationRepositories),
  );

  const failedOrganizationResult = organizationRepositoryResults.find(
    (result) => result.repositories === null,
  );

  if (failedOrganizationResult?.error) {
    return {
      repositoryCards: null,
      error: failedOrganizationResult.error,
    };
  }

  const organizationRepositories = organizationRepositoryResults.map(
    (result) => result.repositories ?? [],
  );

  const repositories = organizationRepositories
    .flat()
    .filter(
      (repository) =>
        !repository.name.startsWith('.') &&
        !repository.archived &&
        !repository.fork &&
        !repository.is_template,
    )
    .sort(compareRepositoriesForDisplay)
    .slice(0, MAX_REPOSITORIES);

  const repositoryCardResults = await Promise.all(repositories.map(toRepositoryCard));
  const failedRepositoryCardResult = repositoryCardResults.find(
    (result) => result.repositoryCard === null,
  );

  if (failedRepositoryCardResult?.error) {
    return {
      repositoryCards: null,
      error: failedRepositoryCardResult.error,
    };
  }

  return {
    repositoryCards: repositoryCardResults
      .map((result) => result.repositoryCard)
      .filter((repositoryCard): repositoryCard is GitHubRepositoryCard => repositoryCard !== null),
    error: null,
  };
};

const fetchOrganizationRepositories = async (
  organization: string,
): Promise<{
  repositories: readonly GitHubRepository[] | null;
  error: string | null;
}> => {
  const repositories: GitHubRepository[] = [];

  for (let page = 1; page <= MAX_PAGES_PER_ORGANIZATION; page += 1) {
    const result = await fetchGitHubJson<GitHubRepository[]>(
      `orgs/${organization}/repos?type=public&per_page=100&page=${page}`,
    );

    if (isGitHubFetchFailure(result)) {
      return {
        repositories: null,
        error: result.error,
      };
    }

    repositories.push(...result.data);

    if (result.data.length < 100) {
      break;
    }
  }

  return {
    repositories,
    error: null,
  };
};

const compareRepositoriesForDisplay = (
  a: GitHubRepository,
  b: GitHubRepository,
): number => {
  const starDifference = b.stargazers_count - a.stargazers_count;

  if (starDifference !== 0) {
    return starDifference;
  }

  return Date.parse(b.updated_at) - Date.parse(a.updated_at);
};

const toRepositoryCard = async (
  repository: GitHubRepository,
): Promise<RepositoryCardResult> => {
  const [latestTagResult, languageIconResult] = await Promise.all([
    fetchLatestAnnotatedTag(repository.full_name),
    fetchDominantLanguageIcon(repository.full_name),
  ]);

  if (isGitHubFetchFailure(latestTagResult)) {
    return {
      repositoryCard: null,
      error: latestTagResult.error,
    };
  }

  if (isGitHubFetchFailure(languageIconResult)) {
    return {
      repositoryCard: null,
      error: languageIconResult.error,
    };
  }

  return {
    repositoryCard: {
      name: repository.full_name,
      shortName: repository.name,
      link: repository.html_url,
      summary: repository.description,
      tags: repository.topics ?? [],
      languageIcon: languageIconResult.data,
      stars: repository.stargazers_count,
      latestTag: latestTagResult.data,
    },
    error: null,
  };
};

const fetchLatestAnnotatedTag = async (
  repositoryPath: string,
): Promise<GitHubFetchResult<string | null>> => {
  const tagRefs = await fetchGitHubJson<GitHubTagRef[]>(
    `repos/${repositoryPath}/git/matching-refs/tags`,
    {
      fallbackData: [],
    },
  );

  if (isGitHubFetchFailure(tagRefs)) {
    return tagRefs;
  }

  const annotatedTagRefs = tagRefs.data.filter((tagRef) => tagRef.object.type === 'tag');

  if (annotatedTagRefs.length === 0) {
    return {
      data: null,
      error: null,
    };
  }

  const semverTagRef = annotatedTagRefs
    .map((tagRef) => ({
      name: formatGitHubTagRefName(tagRef.ref),
      version: parseSemverTag(formatGitHubTagRefName(tagRef.ref)),
    }))
    .filter((tag): tag is { name: string; version: SemverVersion } => tag.version !== null)
    .sort((a, b) => compareSemverVersions(b.version, a.version))[0];

  if (semverTagRef) {
    return {
      data: semverTagRef.name,
      error: null,
    };
  }

  return {
    data: null,
    error: null,
  };
};

const formatGitHubTagRefName = (ref: string): string => ref.replace(/^refs\/tags\//, '');

const parseSemverTag = (tag: string): SemverVersion | null => {
  const match = tag.match(SEMVER_TAG_PATTERN);

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  };
};

const compareSemverVersions = (a: SemverVersion, b: SemverVersion): number => {
  const stableVersionDifference =
    a.major - b.major || a.minor - b.minor || a.patch - b.patch;

  if (stableVersionDifference !== 0) {
    return stableVersionDifference;
  }

  if (a.prerelease.length === 0 && b.prerelease.length === 0) {
    return 0;
  }

  if (a.prerelease.length === 0) {
    return 1;
  }

  if (b.prerelease.length === 0) {
    return -1;
  }

  const maxPrereleaseLength = Math.max(a.prerelease.length, b.prerelease.length);

  for (let index = 0; index < maxPrereleaseLength; index += 1) {
    const aIdentifier = a.prerelease[index];
    const bIdentifier = b.prerelease[index];

    if (aIdentifier === undefined) {
      return -1;
    }

    if (bIdentifier === undefined) {
      return 1;
    }

    const identifierDifference = compareSemverPrereleaseIdentifiers(aIdentifier, bIdentifier);

    if (identifierDifference !== 0) {
      return identifierDifference;
    }
  }

  return 0;
};

const compareSemverPrereleaseIdentifiers = (a: string, b: string): number => {
  const aIsNumeric = /^\d+$/.test(a);
  const bIsNumeric = /^\d+$/.test(b);

  if (aIsNumeric && bIsNumeric) {
    return Number(a) - Number(b);
  }

  if (aIsNumeric) {
    return -1;
  }

  if (bIsNumeric) {
    return 1;
  }

  return a.localeCompare(b, 'en');
};

const fetchDominantLanguageIcon = async (
  repositoryPath: string,
): Promise<GitHubFetchResult<LanguageIcon | null>> => {
  const languages = await fetchGitHubJson<Record<string, number> | null>(
    `repos/${repositoryPath}/languages`,
    {
      fallbackData: null,
    },
  );

  if (isGitHubFetchFailure(languages)) {
    return languages;
  }

  if (!languages.data) {
    return {
      data: null,
      error: null,
    };
  }

  const dominantLanguage = Object.entries(languages.data).sort(([, a], [, b]) => b - a)[0]?.[0];

  if (!dominantLanguage) {
    return {
      data: null,
      error: null,
    };
  }

  return {
    data: languageIconByGitHubLanguage[dominantLanguage] ?? null,
    error: null,
  };
};

const fetchGitHubJson = async <T>(
  path: string,
  options: Readonly<{
    fallbackData?: T;
  }> = {},
): Promise<GitHubFetchResult<T>> => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GITHUB_API_TIMEOUT_MS);

  try {
    const headers = new Headers({
      Accept: 'application/vnd.github+json',
      'User-Agent': 'craftguild.io',
      'X-GitHub-Api-Version': '2026-03-10',
    });

    if (import.meta.env.GITHUB_TOKEN) {
      headers.set('Authorization', `Bearer ${import.meta.env.GITHUB_TOKEN}`);
    }

    const response = await fetch(`https://api.github.com/${path}`, {
      headers,
      signal: abortController.signal,
    });

    if (!response.ok) {
      if ('fallbackData' in options) {
        return {
          data: options.fallbackData as T,
          error: null,
        };
      }

      return {
        data: null,
        error: await formatGitHubResponseError(response),
      };
    }

    return {
      data: (await response.json()) as T,
      error: null,
    };
  } catch (error) {
    if ('fallbackData' in options) {
      return {
        data: options.fallbackData as T,
        error: null,
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'GitHub API request failed',
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const isGitHubFetchFailure = <T>(
  result: GitHubFetchResult<T>,
): result is GitHubFetchFailure => result.error !== null;

const formatGitHubResponseError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as GitHubError;

    if (body.message) {
      return `${response.status} ${body.message}`;
    }
  } catch {
    // Fall through to the generic response error.
  }

  return `${response.status} ${response.statusText}`;
};
