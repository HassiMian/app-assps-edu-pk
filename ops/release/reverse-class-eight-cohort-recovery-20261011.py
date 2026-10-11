#!/usr/bin/env python3
"""Emergency Reversal Script: Reverts Class Eight cohort restoration back to Pre Nine.

Authoritative cohort of 11 students:
IDs: [643, 651, 673, 699, 704, 776, 800, 807, 882, 903, 915]
"""
import subprocess
import sys

port = sys.argv[1] if len(sys.argv) > 1 else '5432'
db = sys.argv[2] if len(sys.argv) > 2 else 'apexos'

sql = """
BEGIN;
UPDATE students
SET class = 'Pre Nine', section = 'Blue', updated_at = NOW()
WHERE school_id = 1 AND id = ANY(ARRAY[643, 651, 673, 699, 704, 776, 800, 807, 882, 903, 915]) AND class = 'Eight';

INSERT INTO public.student_class_movement_audit 
    (school_id, student_id, source_class, source_section, target_class, target_section, reason, moved_by, reversal_sql)
SELECT 
    school_id, id, 'Eight', 'Blue', 'Pre Nine', 'Blue',
    'Emergency reversal of Class Eight cohort restoration', 'DBA_REVERSAL_OPERATOR',
    'UPDATE students SET class = ''Eight'', section = ''Blue'', updated_at = NOW() WHERE id = ' || id || ' AND school_id = 1;'
FROM students
WHERE school_id = 1 AND id = ANY(ARRAY[643, 651, 673, 699, 704, 776, 800, 807, 882, 903, 915]);

COMMIT;
"""

cmd = ['runuser', '-u', 'postgres', '--', 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-p', port, '-d', db, '-c', sql]
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print(f"REVERSAL FAILED: {r.stderr}", file=sys.stderr)
    sys.exit(1)
print(f"EMERGENCY_REVERSAL_COMPLETED_SUCCESSFULLY on {db}:{port}")
