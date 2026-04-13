const DEFAULT_GITHUB_ORGANIZATIONS = ['craftguild'] as const;

const parseGitHubOrganizations = (organizations: string | undefined): readonly string[] => {
  if (!organizations) {
    return DEFAULT_GITHUB_ORGANIZATIONS;
  }

  const parsedOrganizations = organizations
    .split(',')
    .map((organization) => organization.trim())
    .filter(Boolean);

  return parsedOrganizations.length > 0 ? parsedOrganizations : DEFAULT_GITHUB_ORGANIZATIONS;
};

export const githubOrganizations = parseGitHubOrganizations(import.meta.env.GITHUB_ORGS);
