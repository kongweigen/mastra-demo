// Chatfire configuration
export const CHATFIRE_CONFIG = {
  baseUrl: process.env.CHATFIRE_BASE_URL || 'https://api.chatfire.site',
  apiKey: process.env.CHATFIRE_API_KEY || 'sk-RQvO4Hh9ZtQO0DV5l4vLpLXDc9JfZRxuwsUj7diA2mzIwAgr',
  model: process.env.CHATFIRE_MODEL || 'gemini-3-flash-preview',
  timeoutMs: Number(process.env.CHATFIRE_TIMEOUT_MS || '900000'),
  stepTimeoutMs: Number(process.env.CHATFIRE_STEP_TIMEOUT_MS || '600000'),
  transportTimeoutMs: Number(process.env.CHATFIRE_TRANSPORT_TIMEOUT_MS || '900000'),
};

const DEFAULT_MODELS = ['gemini-3-flash-preview', 'deepseek-chat'];

export function getAvailableChatfireModels() {
  const configuredModels = (process.env.CHATFIRE_AVAILABLE_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([...configuredModels, ...DEFAULT_MODELS, CHATFIRE_CONFIG.model])];
}

export function getChatfireSettings() {
  return {
    model: CHATFIRE_CONFIG.model,
    availableModels: getAvailableChatfireModels(),
  };
}

export function setChatfireModel(model: string) {
  const normalizedModel = model.trim();
  if (!normalizedModel) {
    throw new Error('Model is required');
  }

  CHATFIRE_CONFIG.model = normalizedModel;
  return getChatfireSettings();
}

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
