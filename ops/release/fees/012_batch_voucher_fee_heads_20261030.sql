BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE public.fee_challans
  ADD COLUMN IF NOT EXISTS exam_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_fee numeric(12,2) NOT NULL DEFAULT 0;
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.fee_challans'::regclass AND conname='fee_challans_extra_heads_nonnegative') THEN
 ALTER TABLE public.fee_challans ADD CONSTRAINT fee_challans_extra_heads_nonnegative
 CHECK (exam_fee>=0 AND other_fee>=0);
 END IF;
 IF EXISTS(SELECT 1 FROM public.fee_challans WHERE exam_fee<>0 OR other_fee<>0) THEN
  RAISE EXCEPTION 'Original invoices unexpectedly contain extras'; END IF;
END $check$;
COMMIT;
