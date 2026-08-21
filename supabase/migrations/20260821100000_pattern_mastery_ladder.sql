-- Expand morph_patterns mastery ladder.

alter table public.morph_patterns
  drop constraint if exists morph_patterns_mastery_state_check;

update public.morph_patterns
set mastery_state = case mastery_state
  when 'noticed' then 'encountered'
  when 'recognizing' then 'recognize'
  when 'using' then 'use'
  else mastery_state
end;

alter table public.morph_patterns
  alter column mastery_state set default 'encountered';

alter table public.morph_patterns
  add constraint morph_patterns_mastery_state_check
  check (mastery_state in ('encountered', 'recognize', 'understand', 'use'));
