import { cookies } from 'next/headers';
import { SESSION_COOKIE, getSessionUser } from '../../server/http/session.js';
import { query } from '../../server/db/pool.js';
import { WorkspaceShell } from './workspace-shell.js';
import type { SupportedLocale } from '../../packages/i18n/src/index.js';

export default async function WorkspaceHomePage() {
  // Layout has already redirected unauthenticated visitors to /login.
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await getSessionUser(token);
  const rows = session
    ? await query<{ ui_locale: string }>('SELECT ui_locale FROM profile WHERE user_id = $1', [session.userId])
    : [];
  const locale = (rows[0]?.ui_locale as SupportedLocale) ?? 'en';

  return <WorkspaceShell locale={locale} initialTool="guidance" />;
}
