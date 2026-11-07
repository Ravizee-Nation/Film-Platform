import { ApiStatusBadge } from '../components/ApiStatusBadge';
import { fetchApiStatus } from '../lib/api';

// Status is read on every request, never baked in at build time.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const status = await fetchApiStatus();
  return (
    <main>
      <h1>Film Platform</h1>
      <p>Phase 0 scaffold. Product features arrive in later phases.</p>
      <ApiStatusBadge status={status} />
    </main>
  );
}
