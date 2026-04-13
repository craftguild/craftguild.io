/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly CRON_SECRET?: string;
  readonly GITHUB_ORGS?: string;
  readonly GITHUB_TOKEN?: string;
  readonly SITE_FOOTER_LABEL?: string;
  readonly SITE_FOOTER_URL?: string;
  readonly SITE_HEADER_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
