-- normalize_phone ahora devuelve SOLO DÍGITOS (sin '+').
-- Antes:
--   '+5491130471759' → '+5491130471759'
--   '5491130471759'  → '5491130471759'
--   (no matcheaban entre sí en phone_normalized)
-- Ahora:
--   ambos → '5491130471759' (sí matchean)
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p is null or length(regexp_replace(p, '[^0-9]', '', 'g')) = 0 then null
    else regexp_replace(p, '[^0-9]', '', 'g')
  end;
$$;

-- Re-normalizar valores existentes para que la columna quede coherente
-- con la nueva regla. Si hubiera duplicados resultantes, el unique index
-- los rechazaría — verificar con
--   select phone_normalized, count(*) from contacts group by 1 having count(*) > 1;
update public.contacts
   set phone_normalized = public.normalize_phone(phone)
 where phone is not null
   and phone_normalized is distinct from public.normalize_phone(phone);

update public.import_rows_normalized
   set normalized_phone = public.normalize_phone(normalized_phone)
 where normalized_phone is not null
   and normalized_phone is distinct from public.normalize_phone(normalized_phone);
