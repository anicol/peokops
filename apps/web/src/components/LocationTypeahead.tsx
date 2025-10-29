import { useState, useRef, useEffect } from 'react';

// Popular US cities for typeahead suggestions
const US_CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Indianapolis, IN',
  'Charlotte, NC', 'San Francisco, CA', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
  'Nashville, TN', 'Oklahoma City, OK', 'El Paso, TX', 'Boston, MA', 'Portland, OR',
  'Las Vegas, NV', 'Detroit, MI', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD',
  'Milwaukee, WI', 'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA', 'Mesa, AZ',
  'Sacramento, CA', 'Atlanta, GA', 'Kansas City, MO', 'Colorado Springs, CO', 'Raleigh, NC',
  'Miami, FL', 'Omaha, NE', 'Long Beach, CA', 'Virginia Beach, VA', 'Oakland, CA',
  'Minneapolis, MN', 'Tulsa, OK', 'Tampa, FL', 'Arlington, TX', 'New Orleans, LA',
  'Wichita, KS', 'Cleveland, OH', 'Bakersfield, CA', 'Aurora, CO', 'Anaheim, CA',
  'Honolulu, HI', 'Santa Ana, CA', 'Riverside, CA', 'Corpus Christi, TX', 'Lexington, KY',
  'Stockton, CA', 'Henderson, NV', 'Saint Paul, MN', 'Cincinnati, OH', 'St. Louis, MO',
  'Pittsburgh, PA', 'Greensboro, NC', 'Lincoln, NE', 'Anchorage, AK', 'Plano, TX',
  'Orlando, FL', 'Irvine, CA', 'Newark, NJ', 'Durham, NC', 'Chula Vista, CA',
  'Toledo, OH', 'Fort Wayne, IN', 'St. Petersburg, FL', 'Laredo, TX', 'Jersey City, NJ',
  'Chandler, AZ', 'Madison, WI', 'Lubbock, TX', 'Scottsdale, AZ', 'Reno, NV',
  'Buffalo, NY', 'Gilbert, AZ', 'Glendale, AZ', 'North Las Vegas, NV', 'Winston-Salem, NC',
  'Chesapeake, VA', 'Norfolk, VA', 'Fremont, CA', 'Garland, TX', 'Irving, TX',
  'Hialeah, FL', 'Richmond, VA', 'Boise, ID', 'Spokane, WA', 'Baton Rouge, LA'
];

interface LocationTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationTypeahead({
  value,
  onChange,
  placeholder = 'e.g., Toledo, OH',
  className = '',
}: LocationTypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter cities based on input
  useEffect(() => {
    if (value.length === 0) {
      setFilteredCities([]);
      setIsOpen(false);
      return;
    }

    const searchTerm = value.toLowerCase();
    const matches = US_CITIES.filter(city =>
      city.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results

    setFilteredCities(matches);
    setIsOpen(matches.length > 0);
    setHighlightedIndex(0);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: string) => {
    onChange(city);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredCities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredCities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCities[highlightedIndex]) {
          handleSelect(filteredCities[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const highlightMatch = (city: string) => {
    if (!value) return city;

    const searchTerm = value.toLowerCase();
    const index = city.toLowerCase().indexOf(searchTerm);

    if (index === -1) return city;

    return (
      <>
        {city.substring(0, index)}
        <span className="font-semibold text-blue-600">
          {city.substring(index, index + value.length)}
        </span>
        {city.substring(index + value.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (filteredCities.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && filteredCities.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredCities.map((city, index) => (
            <button
              key={city}
              type="button"
              onClick={() => handleSelect(city)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                index === highlightedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-gray-900">{highlightMatch(city)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
