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
    let cleanup: (() => void) | undefined;
    if (host.current) {
      service
        .createAutocomplete(host.current, { placeholder, onSelect, onError })
        .then((dispose) => {
          cleanup = dispose;
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          onError();
        });
    }
    return () => cleanup?.();
  }, [onError, onSelect, placeholder, service]);
  return (
    <label>
      <span>{label}</span>
      <div className="places-host" ref={host} aria-busy={loading}>
        {loading && <span>กำลังโหลดช่องค้นหา…</span>}
      </div>
    </label>
  );
}
