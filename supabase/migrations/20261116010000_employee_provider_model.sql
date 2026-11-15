alter table public.employee_keys
  add column provider text not null default 'groq' check (provider in ('groq','openai','anthropic','gemini','openrouter','deepseek','mistral')),
  add column model text not null default '' check (char_length(model) <= 80);
grant select (provider, model) on table public.employee_keys to authenticated;
