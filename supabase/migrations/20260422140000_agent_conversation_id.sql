-- Agregar conversation_id como campo first-class de agent_conversations
alter table public.agent_conversations
  add column if not exists conversation_id text;

create index if not exists agent_conversations_conversation_id_idx
  on public.agent_conversations (conversation_id)
  where conversation_id is not null;

comment on column public.agent_conversations.conversation_id is
  'ID externo de la conversación en el sistema origen (bot / CRM externo).';
