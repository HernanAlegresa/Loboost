ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS energy_level  smallint CHECK (energy_level  BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS sleep_quality smallint CHECK (sleep_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS soreness_level smallint CHECK (soreness_level BETWEEN 1 AND 5);
