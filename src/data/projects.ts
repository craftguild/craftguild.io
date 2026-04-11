import { siTypescript } from 'simple-icons';

export type LanguageIcon = Readonly<{
  title: string;
  path: string;
  hex: string;
}>;

export type Project = Readonly<{
  name: string;
  link: `https://${string}`;
  summary: string;
  tags: readonly string[];
  languageIcons: readonly LanguageIcon[];
}>;

export const projects = [
  {
    name: 'craftguild/jscalendar.ts',
    link: 'https://github.com/craftguild/jscalendar.ts',
    summary:
      'A practical TypeScript toolkit for RFC 8984 (JSCalendar) data. It supports creation, patching, recurrence expansion, search, and iCalendar export while keeping the API close to Event, Task, and Group objects.',
    tags: ['RFC 8984', 'JSCalendar'],
    languageIcons: [siTypescript],
  },
] satisfies readonly Project[];
