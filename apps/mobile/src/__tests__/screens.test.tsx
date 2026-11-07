import { fireEvent, render, screen } from '@testing-library/react-native';
import { FEED_ITEMS } from '../screens/FeedPocScreen';
import { FormPocScreen } from '../screens/FormPocScreen';
import { StatusScreen } from '../screens/StatusScreen';

jest.mock('expo-router', () => {
  const { Fragment } = jest.requireActual('react');
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

describe('StatusScreen', () => {
  it('shows ok when the API is healthy', async () => {
    await render(<StatusScreen check={async () => 'ok'} />);
    expect(await screen.findByText('API: ok')).toBeOnTheScreen();
  });

  it('shows unavailable and can check again', async () => {
    const check = jest
      .fn<Promise<'ok' | 'unavailable'>, []>()
      .mockResolvedValueOnce('unavailable')
      .mockResolvedValueOnce('ok');
    await render(<StatusScreen check={check} />);
    expect(await screen.findByText('API: unavailable')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('API: ok')).toBeOnTheScreen();
    expect(check).toHaveBeenCalledTimes(2);
  });
});

describe('proof-of-concept screens', () => {
  it('generates 1,000 feed items', () => {
    expect(FEED_ITEMS).toHaveLength(1000);
  });

  it('labels every form control for screen readers', async () => {
    await render(<FormPocScreen />);
    expect(screen.getByLabelText('Full name')).toBeOnTheScreen();
    expect(screen.getByLabelText('Primary role')).toBeOnTheScreen();
    expect(screen.getByLabelText('Available for work')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables Save once a name is entered', async () => {
    await render(<FormPocScreen />);
    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Ada Lovelace');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Saved locally (prototype, nothing was sent).',
    );
  });
});
