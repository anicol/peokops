const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.getpeakops.com'
  : 'http://localhost:8000';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
}

export interface DemoFormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  stores: string;
  role: string;
  message: string;
}

export const sendContactForm = async (data: ContactFormData): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/marketing/contact/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      company: data.company,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to send email' }));
    throw new Error(error.error || 'Failed to send contact form');
  }
};

export const sendDemoRequest = async (data: DemoFormData): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/marketing/demo/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      company: data.company,
      phone: data.phone,
      stores: data.stores,
      role: data.role,
      message: data.message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to send email' }));
    throw new Error(error.error || 'Failed to send demo request');
  }
};