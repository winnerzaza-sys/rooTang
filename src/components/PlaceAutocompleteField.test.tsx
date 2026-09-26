import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlacesService } from '../services/contracts';
import { PlaceAutocompleteField } from './PlaceAutocompleteField';

afterEach(cleanup);

// Mirrors the Google service, which takes over the host's children.
function replacingService(dispose = vi.fn()): PlacesService {
  return {
    createAutocomplete: (host) => {
      const element = document.createElement('input');
      element.setAttribute('aria-label', 'ค้นหาปลายทาง');
      host.replaceChildren(element);
      return Promise.resolve(dispose);
    },
  };
}

describe('PlaceAutocompleteField', () => {
  it('keeps rendering after the service replaces the host children', async () => {
    render(
      <PlaceAutocompleteField
        label="ปลายทาง"
        placeholder="ค้นหาปลายทาง"
        service={replacingService()}
        onSelect={() => undefined}
        onError={() => undefined}
      />,
    );

    expect(
      await screen.findByRole('textbox', { name: 'ค้นหาปลายทาง' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('กำลังโหลดช่องค้นหา…')).not.toBeInTheDocument(),
    );
  });

  it('disposes an autocomplete that resolves after unmount', async () => {
    const dispose = vi.fn();
    const { unmount } = render(
      <PlaceAutocompleteField
        label="ปลายทาง"
        placeholder="ค้นหาปลายทาง"
        service={replacingService(dispose)}
        onSelect={() => undefined}
        onError={() => undefined}
      />,
    );
    unmount();

    await waitFor(() => expect(dispose).toHaveBeenCalledOnce());
  });
});
