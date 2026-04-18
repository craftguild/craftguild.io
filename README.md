# craftguild.io

craftguild.io is a small Astro site that lists public open source repositories from the Craft Guild GitHub organization.

Repository cards are built from GitHub data, including repository descriptions, topics, stars, annotated tags, and dominant language icons. The site is designed for deployment on Vercel with server-side rendering, a small in-memory cache, and a cron endpoint for refreshing GitHub repository data.

## Development

Install dependencies:

```sh
pnpm install
```

Start the local development server:

```sh
pnpm dev
```

Build for production:

```sh
pnpm build
```

Preview the production build:

```sh
pnpm preview
```

## Environment Variables

All variables are optional unless noted.

```env
GITHUB_ORGS=craftguild
GITHUB_TOKEN=
SITE_HEADER_LABEL=Craft Guild
SITE_FOOTER_LABEL=progressiveworks.co
SITE_FOOTER_URL=https://progressiveworks.co
CRON_SECRET=
```

- `GITHUB_ORGS`: Comma-separated GitHub organizations to list. Defaults to `craftguild`.
- `GITHUB_TOKEN`: Optional GitHub token for higher API rate limits.
- `SITE_HEADER_LABEL`: Header and page title label. Defaults to `Craft Guild`.
- `SITE_FOOTER_LABEL`: Footer link label. Defaults to `progressiveworks.co`.
- `SITE_FOOTER_URL`: Footer link URL. Defaults to `https://progressiveworks.co`.
- `CRON_SECRET`: Required to authorize the Vercel cron cache refresh endpoint.

## Cache Refresh

The Vercel cron configuration calls:

```text
/api/refresh-github-repository-cache
```

The endpoint requires:

```http
Authorization: Bearer <CRON_SECRET>
```

Note: The repository cache is currently stored in memory. On Vercel, this cache is scoped to the runtime instance that handles a request. A cron refresh can warm the cache for the instance that executes the cron job, but it should not be treated as a global cache warm-up across all regions or instances.
