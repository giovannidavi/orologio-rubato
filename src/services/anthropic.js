const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function sendMessage(apiKey, systemPrompt, messages) {
  if (!apiKey) {
    throw new Error('API key mancante. Inserisci la tua API key Anthropic.');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('API key non valida. Controlla la tua chiave.');
    }
    if (response.status === 429) {
      throw new Error('Troppi richieste. Attendi un momento.');
    }
    throw new Error(errorData.error?.message || `Errore API: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
