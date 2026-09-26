import { useEffect, useRef, useState } from 'react';
import type { AppPlace } from '../domain/types';
import type { PlacesService } from '../services/contracts';

export function PlaceAutocompleteField({
  label,
  placeholder,
  initialValue,
  service,
  onSelect,
  onError,
}: {
  label: string;
  placeholder: string;
  initialValue?: string;
  service: PlacesService;
  onSelect: (place: AppPlace) => void;
  onError: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    if (host.current) {
      service
        .createAutocomplete(host.current, {
          placeholder,
          initialValue,
          onSelect,
          onError,
        })
        .then((dispose) => {
          if (!active) return dispose();
          cleanup = dispose;
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLoading(false);
          onError();
        });
    }
    return () => {
      active = false;
      cleanup?.();
    };
  }, [initialValue, onError, onSelect, placeholder, service]);
  // The service owns the slot's children; React must never render into it.
  return (
    <label className="route-field place-field">
      <span>{label}</span>
      <div className="places-host" aria-busy={loading}>
        {loading && <span>กำลังโหลดช่องค้นหา…</span>}
        <div className="places-slot" ref={host} />
      </div>
    </label>
  );
}
