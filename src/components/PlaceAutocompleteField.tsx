import { useEffect, useRef, useState } from 'react';
import type { AppPlace } from '../domain/types';
import type { PlacesService } from '../services/contracts';

export function PlaceAutocompleteField({
  label,
  placeholder,
  service,
  onSelect,
  onError,
}: {
  label: string;
  placeholder: string;
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
        .createAutocomplete(host.current, { placeholder, onSelect, onError })
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
  }, [onError, onSelect, placeholder, service]);
  // The service owns the slot's children; React must never render into it.
  return (
    <label>
      <span>{label}</span>
      <div className="places-host" aria-busy={loading}>
        {loading && <span>กำลังโหลดช่องค้นหา…</span>}
        <div className="places-slot" ref={host} />
      </div>
    </label>
  );
}
