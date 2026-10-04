/**
 * DeepSeek AI Client for JARVIS Production
 * 
 * Provides direct access to DeepSeek V4 Pro and DeepSeek V4 Flash
 * for deep reasoning, architectural design, complex code refactoring,
 * examination paper generation, and pedagogical content authoring.
 */

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

export class DeepSeekClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || DEEPSEEK_API_URL;
    this.apiKey = options.apiKey || DEEPSEEK_API_KEY;
    this.timeoutMs = options.timeoutMs || 45000;
  }

  async chatCompletion(messages, options = {}) {
    const model = options.model || "deepseek-chat"; // or deepseek-reasoner
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || 4096;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          error: `DeepSeek API returned HTTP ${response.status}: ${errorText}`,
          data: null
        };
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content || "";
      const reasoning = json.choices?.[0]?.message?.reasoning_content || "";

      return {
        ok: true,
        model: json.model || model,
        content,
        reasoning,
        usage: json.usage
      };
    } catch (err) {
      clearTimeout(timer);
      return {
        ok: false,
        error: `DeepSeek connection failed: ${err.message}`,
        data: null
      };
    }
  }

  /**
   * Fast reasoning query helper
   */
  async ask(prompt, systemPrompt = "You are JARVIS AI Core, an expert principal architect, senior educationalist, and lead software engineer.") {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];
    return await this.chatCompletion(messages, { model: "deepseek-chat" });
  }

  /**
   * Deep reasoning query helper (using reasoner model)
   */
  async reason(prompt, systemPrompt = "You are JARVIS AI Core performing deep algorithmic and pedagogical reasoning.") {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];
    return await this.chatCompletion(messages, { model: "deepseek-reasoner" });
  }
}

export const deepseekClient = new DeepSeekClient();
