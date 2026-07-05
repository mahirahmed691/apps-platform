const AI_TIMEOUT_MS = 30_000;

export async function runAnthropicPrompt(prompt: string, maxTokens = 4096): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Anthropic HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.content?.find((part: { type?: string }) => part.type === 'text')?.text ?? '';
  } finally {
    clearTimeout(timeoutId);
  }
}
