# Google Maps API Setup for Review Analysis

The review analysis form uses Google Places Autocomplete to help users find their business and auto-populate the location.

## Setup Steps

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Places API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

### 2. Secure Your API Key (Recommended)

1. Click "Edit API key" (next to your newly created key)
2. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domains:
     - `http://localhost:3000/*` (for development)
     - `https://app.getpeakops.com/*` (for production)
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose "Places API" from the dropdown
4. Click "Save"

### 3. Add API Key to Your Environment

Add the API key to your `.env` file:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 4. Pricing

- **Autocomplete**: ~$17 per 1,000 requests
- **Place Details**: ~$17 per 1,000 requests (called when user selects a place)
- **Free tier**: $200/month in credit (covers ~6,000 autocomplete sessions)

For low-volume usage (< 6,000 form submissions/month), this will likely stay within the free tier.

## Graceful Degradation

If the API key is not configured or the API fails to load, the form gracefully falls back to a regular text input. Users can still manually enter their business name and location.

## Testing

1. Start the dev server: `npm run dev`
2. Go to `/review-analysis`
3. Start typing a business name in the "Business Name" field
4. You should see autocomplete suggestions from Google Places
5. When you select a business, the location should auto-populate with "City, State"
