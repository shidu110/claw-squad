export interface APIConfig {
  provider: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export const API_PROVIDERS = {
  minimax: { name: "MiniMax", baseURL: "https://api.minimaxi.com/anthropic", model: "MiniMax-M2.7" },
  openai: { name: "OpenAI", baseURL: "https://api.openai.com/v1", model: "gpt-4o" },
  anthropic: { name: "Anthropic", baseURL: "https://api.anthropic.com", model: "claude-sonnet-4" },
  google: { name: "Google", baseURL: "https://generativelanguage.googleapis.com", model: "gemini-2.0-flash" },
  deepseek: { name: "DeepSeek", baseURL: "https://api.deepseek.com", model: "deepseek-chat" },
  ollama: { name: "Ollama (Local)", baseURL: "http://localhost:11434", model: "llama3.1" },
} as const;

export class APIConfigManager {
  private config: Map<string, APIConfig> = new Map();

  set(key: string, config: APIConfig) { this.config.set(key, config); }
  get(key: string) { return this.config.get(key); }
  list() { return Array.from(this.config.entries()); }
  delete(key: string) { this.config.delete(key); }
}