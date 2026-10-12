-- submission_mode replaces is_waitlist as the single discriminant - 'pay' | 'waitlist' | 'lottery',
-- set once at confirmation, null while still a draft (same timing as registered_at).
alter table orders drop column is_waitlist;
alter table orders add column submission_mode text;
