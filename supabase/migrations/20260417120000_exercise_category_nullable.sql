-- Make category nullable so existing rows are unaffected and new
-- exercises created without category (field removed from form) work correctly.
alter table public.exercises
  alter column category drop not null;
