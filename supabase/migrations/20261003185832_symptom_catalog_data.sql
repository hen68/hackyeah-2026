-- Reference data: defaults in canvas order, then the non-default codes.

insert into public.symptom_catalog (code, label, is_default, sort) values
  ('hot_flushes', 'Hot flushes', true, 10),
  ('night_sweats', 'Night sweats', true, 20),
  ('sleep', 'Sleep trouble', true, 30),
  ('mood', 'Mood swings', true, 40),
  ('energy', 'Low energy', true, 50),
  ('brain_fog', 'Brain fog', true, 60),
  ('aches', 'Aches', true, 70),
  ('bleeding', 'Bleeding', true, 80),
  ('palpitations', 'Palpitations', false, 110),
  ('headache', 'Headache', false, 120),
  ('vaginal_dryness', 'Vaginal dryness', false, 130),
  ('tiredness', 'Tiredness', false, 140),
  ('anxiety', 'Anxiety', false, 150),
  ('irritability', 'Irritability', false, 160),
  ('dizziness', 'Dizziness', false, 170),
  ('nausea', 'Nausea', false, 180),
  ('libido_change', 'Libido change', false, 190),
  ('joint_stiffness', 'Joint stiffness', false, 200)
on conflict (code) do update
  set label = excluded.label, is_default = excluded.is_default, sort = excluded.sort;
