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
  it('passes an initial field value to the Places adapter', async () => {
    const service = replacingService();
    const createAutocomplete = vi.fn(
      (
        host: HTMLElement,
        options: Parameters<PlacesService['createAutocomplete']>[1],
      ) => service.createAutocomplete(host, options),
    );
    render(
      <PlaceAutocompleteField
        label="ต้นทาง"
        placeholder="ค้นหาต้นทางอื่น"
        initialValue="ตำแหน่งปัจจุบัน"
        service={{ createAutocomplete }}
        onSelect={() => undefined}
        onError={() => undefined}
      />,
    );
    await waitFor(() => expect(createAutocomplete).toHaveBeenCalledOnce());
    expect(createAutocomplete.mock.calls[0]?.[1].initialValue).toBe(
      'ตำแหน่งปัจจุบัน',
    );
  });

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
