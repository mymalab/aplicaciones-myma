CREATE TABLE IF NOT EXISTS public.expert_chat_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  expert_id bigint NOT NULL,
  title text NOT NULL DEFAULT 'Nueva conversacion',
  summary_text text NOT NULL DEFAULT '',
  adapter_conversation_id text NULL,
  notebook_id_snapshot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_message_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.expert_chat_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.expert_chat_session(id) ON DELETE CASCADE,
  position integer NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (session_id, position)
);

CREATE INDEX IF NOT EXISTS idx_expert_chat_session_user_expert_updated
  ON public.expert_chat_session (user_id, expert_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_expert_chat_message_session_position
  ON public.expert_chat_message (session_id, position);

ALTER TABLE public.expert_chat_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_chat_message ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.expert_chat_session
  IS 'Sesiones persistidas del MVP de chat de expertos NotebookLM.';

COMMENT ON TABLE public.expert_chat_message
  IS 'Mensajes persistidos por sesion del MVP de chat de expertos NotebookLM.';
