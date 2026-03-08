import { AsyncLocalStorage } from 'node:async_hooks';
import http from 'node:http';
import https from 'node:https';
import { CHATFIRE_CONFIG } from './chatfire.js';

type FetchInput = string | URL | Request;

type LlmDebugContext = {
  requestId: string;
  skill?: string;
  retryWithoutTools: boolean;
};

const llmDebugContext = new AsyncLocalStorage<LlmDebugContext>();
const MAX_LOG_CHARS = Number(process.env.LLM_HTTP_LOG_MAX_CHARS || '50000');

let installed = false;

function truncate(value: string): string {
  if (value.length <= MAX_LOG_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_LOG_CHARS)}... [truncated ${value.length - MAX_LOG_CHARS} chars]`;
}

function maskAuthorization(value: string): string {
  if (!value) {
    return value;
  }

  if (!value.startsWith('Bearer ')) {
    return '***';
  }

  const token = value.slice('Bearer '.length);
  if (token.length <= 10) {
    return 'Bearer ***';
  }

  return `Bearer ${token.slice(0, 6)}...${token.slice(-4)}`;
}

function headersToObject(headers?: unknown): Record<string, string> {
  if (!headers) {
    return {};
  }

  const normalized = new Headers(headers as ConstructorParameters<typeof Headers>[0]);
  const result: Record<string, string> = {};

  normalized.forEach((value, key) => {
    result[key] = key.toLowerCase() === 'authorization' ? maskAuthorization(value) : value;
  });

  return result;
}

function buildRequestSummary(payload: any) {
  return {
    model: payload?.model,
    stream: payload?.stream,
    temperature: payload?.temperature,
    max_tokens: payload?.max_tokens,
    max_completion_tokens: payload?.max_completion_tokens,
    tool_choice: payload?.tool_choice,
    parallel_tool_calls: payload?.parallel_tool_calls,
    messageCount: Array.isArray(payload?.messages) ? payload.messages.length : 0,
    toolCount: Array.isArray(payload?.tools) ? payload.tools.length : 0,
    messages: Array.isArray(payload?.messages)
      ? payload.messages.map((message: any, index: number) => ({
          index,
          role: message?.role,
          contentType: Array.isArray(message?.content) ? 'parts' : typeof message?.content,
          contentLength:
            typeof message?.content === 'string'
              ? message.content.length
              : Array.isArray(message?.content)
                ? JSON.stringify(message.content).length
                : 0,
          toolCallCount: Array.isArray(message?.tool_calls) ? message.tool_calls.length : 0,
        }))
      : [],
    tools: Array.isArray(payload?.tools)
      ? payload.tools.map((tool: any) => ({
          type: tool?.type,
          name: tool?.function?.name,
        }))
      : [],
  };
}

function buildResponseSummary(payload: any) {
  return {
    id: payload?.id,
    model: payload?.model,
    object: payload?.object,
    created: payload?.created,
    choiceCount: Array.isArray(payload?.choices) ? payload.choices.length : 0,
    choices: Array.isArray(payload?.choices)
      ? payload.choices.map((choice: any, index: number) => ({
          index,
          finish_reason: choice?.finish_reason,
          contentLength: typeof choice?.message?.content === 'string' ? choice.message.content.length : 0,
          toolCallCount: Array.isArray(choice?.message?.tool_calls) ? choice.message.tool_calls.length : 0,
        }))
      : [],
    usage: payload?.usage,
  };
}

async function readRequestBody(input: FetchInput, init?: RequestInit): Promise<string | undefined> {
  const body = init?.body;

  if (typeof body === 'string') {
    return body;
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  if (body && typeof body === 'object' && 'toString' in body && body.toString !== Object.prototype.toString) {
    return body.toString();
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      return await input.clone().text();
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function getRequestUrl(input: FetchInput): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function createAbortError(reason?: unknown) {
  const message =
    reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'The operation was aborted';
  return new DOMException(message, 'AbortError');
}

async function performNodeHttpRequest(url: string, init?: RequestInit): Promise<Response> {
  const target = new URL(url);
  const transport = target.protocol === 'https:' ? https : http;
  const method = init?.method || 'GET';
  const body = typeof init?.body === 'string' ? init.body : '';
  const headers = new Headers(init?.headers as ConstructorParameters<typeof Headers>[0]);

  if (body && !headers.has('content-length')) {
    headers.set('content-length', String(Buffer.byteLength(body)));
  }

  if (!headers.has('accept-encoding')) {
    headers.set('accept-encoding', 'identity');
  }

  return new Promise<Response>((resolve, reject) => {
    const request = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method,
        headers: Object.fromEntries(headers.entries()),
      },
      response => {
        const chunks: Buffer[] = [];

        response.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          const responseHeaders = new Headers();

          Object.entries(response.headers).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              responseHeaders.set(key, value.join(', '));
              return;
            }

            if (typeof value === 'string') {
              responseHeaders.set(key, value);
            }
          });

          resolve(
            new Response(responseBody, {
              status: response.statusCode || 500,
              statusText: response.statusMessage || '',
              headers: responseHeaders,
            })
          );
        });
      }
    );

    request.setTimeout(CHATFIRE_CONFIG.transportTimeoutMs, () => {
      request.destroy(new Error(`Chatfire transport timeout after ${CHATFIRE_CONFIG.transportTimeoutMs}ms`));
    });

    request.on('error', error => {
      reject(error);
    });

    if (init?.signal) {
      const onAbort = () => {
        request.destroy(createAbortError(init.signal?.reason));
      };

      if (init.signal.aborted) {
        onAbort();
        return;
      }

      init.signal.addEventListener('abort', onAbort, { once: true });
      request.on('close', () => {
        init.signal?.removeEventListener('abort', onAbort);
      });
    }

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

export function withLlmDebugContext<T>(context: LlmDebugContext, fn: () => Promise<T>): Promise<T> {
  return llmDebugContext.run(context, fn);
}

export function installChatfireFetchLogging() {
  if (installed) {
    return;
  }

  if (typeof globalThis.fetch !== 'function') {
    console.warn('[Mastra][llm-http] global fetch is not available, HTTP debug logging disabled');
    return;
  }

  const nativeFetch = globalThis.fetch.bind(globalThis);
  const normalizedBaseUrl = CHATFIRE_CONFIG.baseUrl.replace(/\/+$/, '');

  globalThis.fetch = async (input: FetchInput, init?: RequestInit) => {
    const url = getRequestUrl(input);
    if (!url.startsWith(normalizedBaseUrl)) {
      return nativeFetch(input, init);
    }

    const context = llmDebugContext.getStore();
    const prefix = `[Mastra][llm-http${context ? `:${context.requestId}` : ''}]`;
    const method =
      init?.method ||
      (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET');
    const headers = headersToObject(init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined));
    const rawRequestBody = await readRequestBody(input, init);
    const startedAt = Date.now();

    console.info(
      `${prefix} request method=${method} url=${url} skill=${context?.skill || 'none'} retryWithoutTools=${context?.retryWithoutTools ?? 'n/a'}`
    );
    console.info(`${prefix} requestHeaders=${JSON.stringify(headers)}`);

    if (rawRequestBody) {
      try {
        const parsedBody = JSON.parse(rawRequestBody);
        console.info(`${prefix} requestSummary=${JSON.stringify(buildRequestSummary(parsedBody))}`);
        console.info(`${prefix} requestBody=${truncate(JSON.stringify(parsedBody, null, 2))}`);
      } catch {
        console.info(`${prefix} requestBody=${truncate(rawRequestBody)}`);
      }
    }

    try {
      const response = await performNodeHttpRequest(url, init);
      const elapsedMs = Date.now() - startedAt;
      let rawResponseBody = '';

      try {
        rawResponseBody = await response.clone().text();
      } catch (error) {
        console.warn(`${prefix} failed to clone response body`, error);
      }

      console.info(`${prefix} response status=${response.status} ok=${response.ok} elapsedMs=${elapsedMs}`);

      if (rawResponseBody) {
        try {
          const parsedResponse = JSON.parse(rawResponseBody);
          console.info(`${prefix} responseSummary=${JSON.stringify(buildResponseSummary(parsedResponse))}`);
          console.info(`${prefix} responseBody=${truncate(JSON.stringify(parsedResponse, null, 2))}`);
        } catch {
          console.info(`${prefix} responseBody=${truncate(rawResponseBody)}`);
        }
      }

      return response;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      console.error(`${prefix} transportError elapsedMs=${elapsedMs}`, error);
      throw error;
    }
  };

  installed = true;
  console.info(`[Mastra][llm-http] installed Chatfire fetch logger for ${normalizedBaseUrl}`);
}
