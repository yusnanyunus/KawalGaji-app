-- Jalankan sekali di Supabase SQL Editor sebelum memakai kolom Bulan pengeluaran.
-- Data lama tetap berada pada bulan dari date_payment.
ALTER TABLE public.task_list
  ADD COLUMN IF NOT EXISTS month_group text;

UPDATE public.task_list
SET month_group = to_char(date_payment, 'YYYY-MM')
WHERE month_group IS NULL;

ALTER TABLE public.task_list
  ALTER COLUMN month_group SET NOT NULL;

ALTER TABLE public.task_list
  ADD CONSTRAINT task_list_month_group_format
  CHECK (month_group ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
