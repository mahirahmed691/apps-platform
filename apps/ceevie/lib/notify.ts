type NotifyPayload = {
  to: string;
  subject: string;
  text: string;
};

export async function sendOptionalEmail(payload: NotifyPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? 'Ceevie <notifications@ceevie.co.uk>';
  if (!apiKey) return false;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    }),
  });

  return response.ok;
}
