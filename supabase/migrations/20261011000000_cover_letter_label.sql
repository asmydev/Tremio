-- Usage québécois : « lettre de présentation » plutôt que « lettre de motivation »
update public.prompt_templates
set title = jsonb_set(title, '{fr}', to_jsonb('Lettre de présentation'::text)),
    body  = jsonb_set(body, '{fr}', to_jsonb(replace(body->>'fr', 'lettre de motivation', 'lettre de présentation')))
where id = 'cover-letter';
