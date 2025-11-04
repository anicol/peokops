import { useEffect, useRef, useState } from 'react';

interface PlaceResult {
  name: string;
  formatted_address?: string;
  address_components?: google.maps.GeocoderAddressComponent[];
  place_id?: string;
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
    if (!isLoaded || !inputRef.current || error) {
      return;
    }

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'], // Only show businesses
      fields: ['name', 'formatted_address', 'address_components', 'place_id'],
    });

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();

      if (place && place.name) {
        onChange(place.name);

        // Call onPlaceSelected with all available data
        if (onPlaceSelected) {
          onPlaceSelected({
            name: place.name || '',
            formatted_address: place.formatted_address || '',
            address_components: place.address_components,
            place_id: place.place_id || '',
          });
        }
      }
    });

    return () => {
      // Cleanup autocomplete listeners
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
    // Note: onChange and onPlaceSelected are intentionally omitted from dependencies
    // to prevent infinite re-initialization loop. These functions are captured in
    // the closure when autocomplete is initialized and remain stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, error]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent Enter key from submitting the form
    // Let Google Places autocomplete handle Enter for selection
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // If Google Maps failed to load, render regular input
  if (error) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
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
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
