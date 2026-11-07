import { colors } from '@film/ui';
import type { ApiStatus } from '../lib/api';

export function ApiStatusBadge({ status }: { status: ApiStatus }) {
  const ok = status === 'ok';
  return (
    <p
      role="status"
      aria-live="polite"
      style={{ color: ok ? colors.light.success : colors.light.danger, fontWeight: 600 }}
    >
      API: {ok ? 'ok' : 'unavailable'}
    </p>
  );
}
