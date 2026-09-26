import type { PlacesService } from '../contracts';
import { loadGoogleLibrary } from './loader';

export const googlePlacesService: PlacesService = {
  async createAutocomplete(host, options) {
    const { PlaceAutocompleteElement } = await loadGoogleLibrary('places');
    const element = new PlaceAutocompleteElement({
      includedRegionCodes: ['th'],
    });
    element.placeholder = options.placeholder;
    element.value = options.initialValue ?? '';
    element.setAttribute('aria-label', options.placeholder);
    const handleSelection = async (event: Event) => {
      try {
        const selection =
          event as google.maps.places.PlacePredictionSelectEvent;
        const place = selection.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });
        if (!place.id || !place.location)
          throw new Error('Selected place has no coordinate');
        options.onSelect({
          placeId: place.id,
          label:
            place.displayName ?? place.formattedAddress ?? options.placeholder,
          coordinate: {
            latitude: place.location.lat(),
            longitude: place.location.lng(),
          },
        });
      } catch (error) {
        if (import.meta.env.DEV)
          console.error('Places selection failed', error);
        options.onError();
      }
    };
    const listener = (event: Event) => void handleSelection(event);
    element.addEventListener('gmp-select', listener);
    host.replaceChildren(element);
    return () => {
      element.removeEventListener('gmp-select', listener);
      element.remove();
    };
  },
};
