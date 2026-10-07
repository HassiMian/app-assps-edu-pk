import { fetchJson } from './lib.mjs';

/**
 * Dynamic Model Selection based on Task Type
 * Local models run without artificial token caps or output restrictions.
 */
export function evaluateTaskComplexity(text) {
  const s = String(text || '').toLowerCase();

  // Strategy, quant analysis, deep code or multi-step logic
  const isHigh = /(strategy|backtest|quant|correlation|code|algorithm|multi-step|architecture|security audit|policy|workflow)/i.test(s);
  if (isHigh) {
    return { tier: 'HIGH', model: 'qwen2.5:3b', temperature: 0.2 };
  }

  // Standard queries and explanations
  return { tier: 'STANDARD', model: 'qwen2.5:1.5b', temperature: 0.3 };
}

export async function askHermes({ messages, system = '', timeoutMs = 2500, userPrompt = '' } = {}) {
  let base = (process.env.HERMES_API_URL || '').replace(/\/$/, '');
  if (!base) {
    return { available: false, reason: 'HERMES_API_URL not configured' };
  }
  if (!/\/v1$/i.test(base)) base += '/v1';
  const key = process.env.HERMES_API_KEY || '';

  const promptText = userPrompt || (messages && messages.length ? messages[messages.length - 1]?.content : '');
  const complexity = evaluateTaskComplexity(promptText);

  const selectedModel = process.env.HERMES_MODEL || complexity.model;

  const body = {
    model: selectedModel,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...(messages || [])
    ],
    temperature: complexity.temperature
  };

  const headers = { 'content-type': 'application/json' };
  if (key) headers.authorization = `Bearer ${key}`;

  try {
    const d = await fetchJson(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    }, timeoutMs);

    return {
      available: true,
      text: String(d.choices?.[0]?.message?.content || ''),
      tier: complexity.tier,
      modelUsed: selectedModel,
      unrestricted: true,
      raw: d
    };
  } catch (e) {
    return { available: false, reason: String(e.message || e), tier: complexity.tier };
  }
}
