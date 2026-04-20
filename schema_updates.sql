-- 1. Enable the pgvector extension (must be run by a superuser or the supabase_admin)
create extension if not exists vector;

-- 2. Add an embedding column to the lectures table
-- We use 384 as the dimension because we are using a free Hugging Face Transformers model (MiniLM-L6-v2)
-- If you switch back to OpenAI (text-embedding-ada-002), change this to 1536.
alter table lectures add column if not exists embedding vector(384);

-- 3. Create the function to perform cosine similarity search
create or replace function match_lectures(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  curr_lecture_id uuid,
  curr_course_id uuid
)
returns table (
  id uuid,
  title text,
  type text,
  similarity float
)
language sql stable
as $$
  select
    id,
    title,
    type,
    1 - (lectures.embedding <=> query_embedding) as similarity
  from lectures
  where 
    -- Exclude the lecture we are currently watching
    id != curr_lecture_id
    -- Restrict to the same course
    and course_id = curr_course_id
    and embedding is not null
    and 1 - (lectures.embedding <=> query_embedding) > match_threshold
  order by lectures.embedding <=> query_embedding
  limit match_count;
$$;
