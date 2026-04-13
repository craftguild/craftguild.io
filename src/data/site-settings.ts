const getEnvValue = (value: string | undefined, fallback: string): string => {
  const trimmedValue = value?.trim();

  return trimmedValue || fallback;
};

export const siteSettings = {
  headerLabel: getEnvValue(import.meta.env.SITE_HEADER_LABEL, 'Craft Guild'),
  footerLabel: getEnvValue(import.meta.env.SITE_FOOTER_LABEL, 'progressiveworks.co'),
  footerUrl: getEnvValue(import.meta.env.SITE_FOOTER_URL, 'https://progressiveworks.co'),
} as const;
