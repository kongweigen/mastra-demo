// Chatfire configuration
export const CHATFIRE_CONFIG = {
  baseUrl: process.env.CHATFIRE_BASE_URL || 'https://api.chatfire.site',
  apiKey: process.env.CHATFIRE_API_KEY || 'sk-RQvO4Hh9ZtQO0DV5l4vLpLXDc9JfZRxuwsUj7diA2mzIwAgr',
  model: process.env.CHATFIRE_MODEL || 'deepseek-chat',
  timeoutMs: Number(process.env.CHATFIRE_TIMEOUT_MS || '900000'),
  stepTimeoutMs: Number(process.env.CHATFIRE_STEP_TIMEOUT_MS || '600000'),
  transportTimeoutMs: Number(process.env.CHATFIRE_TRANSPORT_TIMEOUT_MS || '900000'),
};

// Chatfire response type
interface ChatfireResponse {
  choices: Array<{ message: { content: string } }>;
}

// Simple chatfire client using fetch
export const chatfire = {
  chat: {
    completions: {
      async create(params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
      }): Promise<ChatfireResponse> {
        const response = await fetch(`${CHATFIRE_CONFIG.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHATFIRE_CONFIG.apiKey}`,
          },
          body: JSON.stringify({
            model: params.model,
            messages: params.messages,
            max_tokens: params.max_tokens || 8192,
            temperature: params.temperature,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chatfire API error: ${response.status} - ${errorText}`);
        }

        return response.json() as Promise<ChatfireResponse>;
      },
    },
  },
};
