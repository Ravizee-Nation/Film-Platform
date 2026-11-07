import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiStatusBadge } from './ApiStatusBadge';

describe('ApiStatusBadge', () => {
  it('announces a healthy API', () => {
    render(<ApiStatusBadge status="ok" />);
    expect(screen.getByRole('status')).toHaveTextContent('API: ok');
  });

  it('announces an unavailable API', () => {
    render(<ApiStatusBadge status="unavailable" />);
    expect(screen.getByRole('status')).toHaveTextContent('API: unavailable');
  });
});
