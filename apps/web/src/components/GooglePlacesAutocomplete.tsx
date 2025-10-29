import { useEffect, useRef, useState } from 'react';

interface PlaceResult {
  name: string;
  formatted_address?: string;
  address_components?: google.maps.GeocoderAddressComponent[];
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Search for a business...',
  className = '',
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if API key is configured
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not configured. Falling back to regular input.');
      setError('API key not configured');
      return;
    }

    // Check if script is already being loaded (prevent duplicate loads)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script already exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);

      // Cleanup interval
      return () => clearInterval(checkLoaded);
    }

    // Load Google Maps script
    // Note: We use script.async instead of &loading=async in the URL
    // because we're dynamically loading the script, which is already the recommended pattern
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-script';

    script.onload = () => {
      // Wait a bit for places library to fully initialize
      setTimeout(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
        } else {
          setError('Google Maps API loaded but places library unavailable');
        }
      }, 100);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps');
      console.error('Failed to load Google Maps API');
    };

    document.head.appendChild(script);

    // Don't remove the script on unmount - it's a global resource that can be reused
    // Removing it causes issues when the component remounts
  }, []);

  useEffect(() => {
    console.log('Autocomplete effect running. isLoaded:', isLoaded, 'error:', error, 'inputRef.current:', !!inputRef.current);

    if (!isLoaded || !inputRef.current || error) {
      console.log('Skipping autocomplete initialization');
      return;
    }

    console.log('Initializing Google Places Autocomplete');

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'], // Only show businesses
      fields: ['name', 'formatted_address', 'address_components', 'place_id'],
    });

    console.log('Autocomplete initialized:', autocompleteRef.current);

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      console.log('*** place_changed event fired ***');
      const place = autocompleteRef.current?.getPlace();
      console.log('Place object from getPlace():', place);

      if (place && place.name) {
        console.log('Place has name, calling onChange with:', place.name);
        onChange(place.name);

        // Call onPlaceSelected immediately with all available data
        // The address_components should be available since we requested them in fields
        if (onPlaceSelected) {
          console.log('Calling onPlaceSelected callback');
          console.log('Place selected:', place);
          console.log('Address components:', place.address_components);

          onPlaceSelected({
            name: place.name || '',
            formatted_address: place.formatted_address || '',
            address_components: place.address_components,
          });
        } else {
          console.warn('onPlaceSelected callback is not defined');
        }
      } else {
        console.warn('Place object missing or has no name:', place);
      }
    });

    console.log('Event listener added for place_changed');

    return () => {
      // Cleanup autocomplete listeners
      console.log('Cleaning up autocomplete listeners');
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: onChange and onPlaceSelected are intentionally omitted from dependencies
    // to prevent infinite re-initialization loop. These functions are captured in
    // the closure when autocomplete is initialized and remain stable.
  }, [isLoaded, error]);

  // If Google Maps failed to load, render regular input
  if (error) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
