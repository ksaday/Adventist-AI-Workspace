import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, getSessionUser } from '../../server/http/session.js';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await getSessionUser(token);

  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}
