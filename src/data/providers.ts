export type ProviderId = 'groq' | 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'deepseek' | 'mistral'

export interface ProviderInfo {
  id: ProviderId
  label: string
  /** Contoh awal kunci, hanya sebagai petunjuk isian. */
  keyHint: string
  /** Model bawaan di server jika kolom model dikosongkan. Nama model bisa berubah, isi sendiri jika perlu. */
  defaultModel: string
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'groq', label: 'Groq', keyHint: 'gsk_...', defaultModel: 'llama-3.3-70b-versatile' },
  { id: 'openai', label: 'OpenAI', keyHint: 'sk-...', defaultModel: 'gpt-4o-mini' },
  { id: 'anthropic', label: 'Anthropic (Claude)', keyHint: 'sk-ant-...', defaultModel: 'claude-haiku-5-5' },
  { id: 'gemini', label: 'Google Gemini', keyHint: 'AIza...', defaultModel: 'gemini-2.5-flash' },
  { id: 'openrouter', label: 'OpenRouter', keyHint: 'sk-or-...', defaultModel: 'openrouter/auto' },
  { id: 'deepseek', label: 'DeepSeek', keyHint: 'sk-...', defaultModel: 'deepseek-chat' },
  { id: 'mistral', label: 'Mistral', keyHint: '', defaultModel: 'mistral-small-latest' },
]

export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
