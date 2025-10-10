// Simplified telemetry with 4 core events

export interface TelemetryEvent {
  feature: string;
  role?: string;
  cta?: 'demo' | 'upgrade';
  trigger?: 'action' | 'upgrade';
  timestamp?: string;
}

type EventName = 'locked_click' | 'locked_cta' | 'unlock_reached' | 'first_open_after_unlock';

export function trackEvent(
  eventName: EventName,
  data: TelemetryEvent
) {
  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ...data
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Telemetry]', eventName, eventData);
  }

  // Send to analytics service (e.g., PostHog, Mixpanel, etc.)
  try {
    // Example: Send to backend analytics endpoint
    // fetch('/api/analytics/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(eventData)
    // });

    // Or send to client-side analytics
    // if (window.analytics) {
    //   window.analytics.track(eventName, eventData);
    // }
  } catch (error) {
    console.error('Telemetry error:', error);
  }
}
