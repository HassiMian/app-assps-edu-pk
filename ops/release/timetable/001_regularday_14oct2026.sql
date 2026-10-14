-- EXACT photographic source audit: current upload 2026-10-14; image footer 2024-2025.
-- Pattern REGULAR only. Friday/weekdays NOT fabricated. Does not create teacher grants.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='30000ms';
DO $pre$
BEGIN
 IF current_database() NOT IN ('apexos','assps_timetable_qa_20261014') OR
    current_user<>'postgres' OR
    (SELECT count(*) FROM public.timetable WHERE school_id=1)<>0 OR
    (SELECT count(*) FROM public.exam_results WHERE school_id=1 AND exam_id=9)<1588 OR
    (SELECT count(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active)<>0 THEN
   RAISE EXCEPTION 'TIMETABLE_BASELINE_CHANGED_OR_UNAUTHORIZED';
 END IF;
END $pre$;
ALTER TABLE public.timetable
 ADD COLUMN IF NOT EXISTS teacher_display_name varchar(120),
 ADD COLUMN IF NOT EXISTS academic_session varchar(24),
 ADD COLUMN IF NOT EXISTS source_sha256 char(64),
 ADD COLUMN IF NOT EXISTS source_notes text,
 ADD COLUMN IF NOT EXISTS staff_identity_reviewed boolean NOT NULL DEFAULT false;
-- One row per class and exact bell. Sections and account user IDs remain unknown.

INSERT INTO public.timetable (school_id, teacher_id, day_order, day_name, start_time, end_time, subject, class_name, section, room, period_label, teacher_display_name, academic_session, source_sha256, source_notes, staff_identity_reviewed) VALUES
('1',NULL,'0','Regular','08:15:00','08:55:00','Urdu','Four','','','Period 1','Miss Aqsa','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:55:00','09:30:00','Islamiyat','Four','','','Period 2','Miss Maryam','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','09:30:00','10:05:00','Mathematics','Four','','','Period 3','Miss Isma','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:05:00','10:40:00','English','Four','','','Period 4','Miss Sumaira','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:40:00','11:15:00','English','Four','','','Period 5','Miss Sumaira','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','11:15:00','11:50:00','Science','Four','','','Period 6','Miss Aqsa','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:15:00','12:50:00','Social Studies','Four','','','Period 7','Miss Aqsa','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:50:00','13:30:00','Nazra','Four','','','Period 8','Qari Imran','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:15:00','08:55:00','Mathematics','Five','','','Period 1','Miss Isma','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:55:00','09:30:00','Mathematics','Five','','','Period 2','Miss Isma','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','09:30:00','10:05:00','Science','Five','','','Period 3','Mam Afsa','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:05:00','10:40:00','Social Studies','Five','','','Period 4','Mam Aqsa','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:40:00','11:15:00','English','Five','','','Period 5','Miss Sumaira','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','11:15:00','11:50:00','Islamiyat','Five','','','Period 6','Miss Isma','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:15:00','12:50:00','Urdu','Five','','','Period 7','Miss Nazra','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:50:00','13:30:00','Nazra','Five','','','Period 8','Qari Imran','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:15:00','08:55:00','English A','Six','','','Period 1','Miss Sumaira','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:55:00','09:30:00','Social Studies','Six','','','Period 2','Miss Mehreen','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','09:30:00','10:05:00','Mathematics','Six','','','Period 3','Miss Isma','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:05:00','10:40:00','Urdu','Six','','','Period 4','Miss Nazra','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:40:00','11:15:00','Nazra','Six','','','Period 5','Qari Imran','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','11:15:00','11:50:00','Islamiyat','Six','','','Period 6','Miss Maryam','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:15:00','12:50:00','Science','Six','','','Period 7','Miss Tayyaba','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:50:00','13:30:00','English B','Six','','','Period 8','Miss Sumaira','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:15:00','08:55:00','English','Seven','','','Period 1','Miss Tayyaba','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:55:00','09:30:00','Urdu','Seven','','','Period 2','Miss Nazra','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','09:30:00','10:05:00','Islamiyat','Seven','','','Period 3','Qari Fida-ul-Rehman','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:05:00','10:40:00','Mathematics','Seven','','','Period 4','Miss Isma','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:40:00','11:15:00','Science','Seven','','','Period 5','Miss Aqsa','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','11:15:00','11:50:00','Nazra','Seven','','','Period 6','Qari Imran','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:15:00','12:50:00','Social Studies','Seven','','','Period 7','Mam Mehreen','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:50:00','13:30:00','English B','Seven','','','Period 8','Miss Tayyaba','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:15:00','08:55:00','Islamiyat','Pre-Nine','','','Period 1','Qari Fida-ul-Rehman','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:55:00','09:30:00','English','Pre-Nine','','','Period 2','Miss Sumaira','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','09:30:00','10:05:00','Urdu','Pre-Nine','','','Period 3','Miss Nazra','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:05:00','10:40:00','Chemistry','Pre-Nine','','','Period 4','Mam Tayyaba','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','10:40:00','11:15:00','Mathematics','Pre-Nine','','','Period 5','Mam Ghulam Fatima','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','11:15:00','11:50:00','Physics','Pre-Nine','','','Period 6','Miss Ghulam Fatima','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:15:00','12:50:00','Biology','Pre-Nine','','','Period 7','Sir Haseeb','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','12:50:00','13:30:00','Tarjuma','Pre-Nine','','','Period 8','Miss Maryam','2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.',false),
('1',NULL,'0','Regular','08:00:00','08:15:00','Assembly','School-wide','','','Assembly',NULL,'2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','School-wide bell; 25-minute break follows Period 6.',false),
('1',NULL,'0','Regular','11:50:00','12:15:00','Break','School-wide','','','Break',NULL,'2026–27','263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','School-wide bell; 25-minute break follows Period 6.',false);

DO $post$
DECLARE n integer; k integer; p integer;
BEGIN
 SELECT count(*) INTO n FROM public.timetable WHERE school_id=1
  AND source_sha256='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589'
  AND day_name='Regular' AND academic_session='2026–27';
 SELECT count(*) INTO k FROM public.timetable WHERE school_id=1 AND
  class_name IN ('Four','Five','Six','Seven','Pre-Nine') AND period_label LIKE 'Period %';
 SELECT count(*) INTO p FROM public.timetable WHERE school_id=1 AND
  (teacher_id IS NOT NULL OR staff_identity_reviewed=true);
 IF n<>42 OR k<>40 OR p<>0 OR (SELECT count(*) FROM public.timetable
     WHERE school_id=1 AND subject='Break' AND start_time='11:50:00'
       AND end_time='12:15:00')<>1
 THEN RAISE EXCEPTION 'TIMETABLE_POSTCONDITION_FAILED n % k % unsafe %',n,k,p;
 END IF;
END $post$;
COMMIT;
