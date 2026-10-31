-- Remove "(fictional)" suffix from all resource names
UPDATE resources
SET name = btrim(regexp_replace(name, '\s*\(fictional\)\s*', '', 'gi'))
WHERE name ILIKE '%(fictional)%';

-- Also clean up profile labels and descriptions that reference "fictional" or "Demo"
UPDATE profiles
SET full_name = btrim(regexp_replace(full_name, '\s*\[FICTIONAL\]', '', 'gi'))
WHERE full_name ILIKE '%[FICTIONAL]%';

UPDATE profiles
SET full_name = btrim(regexp_replace(full_name, '\s*\[PLACEHOLDER\]', '', 'gi'))
WHERE full_name ILIKE '%[PLACEHOLDER]%';

-- Clean up organization description
UPDATE organizations
SET description = 'Sample institution for demonstration. All records are sample data.'
WHERE description ILIKE '%Fictional demonstration%';

-- Clean up department and lab descriptions
UPDATE departments
SET description = 'Sample department.'
WHERE description ILIKE '%Fictional demo%';

UPDATE labs
SET description = 'Sample laboratory.'
WHERE description ILIKE '%Fictional demo%';

-- Clean up persona labels
UPDATE demo_personas
SET label = REPLACE(label, ' (fictional)', '')
WHERE label ILIKE '%(fictional)%';

-- Clean up profile bios
UPDATE profiles
SET bio = REPLACE(bio, 'Fictional demo student. Edit this profile with your own details.', 'Sample student profile. Edit this with your own details.')
WHERE bio ILIKE 'Fictional demo student%';

UPDATE profiles
SET bio = REPLACE(bio, 'Fictional demo resource manager.', 'Sample resource manager profile.')
WHERE bio ILIKE 'Fictional demo resource manager%';

UPDATE profiles
SET bio = REPLACE(bio, 'Fictional demo faculty and lab manager.', 'Sample faculty and lab manager profile.')
WHERE bio ILIKE 'Fictional demo faculty%';

UPDATE profiles
SET bio = REPLACE(bio, 'Fictional demo administrator.', 'Sample administrator profile.')
WHERE bio ILIKE 'Fictional demo administrator%';

UPDATE profiles
SET bio = REPLACE(bio, 'Fictional demo platform administrator.', 'Sample platform administrator profile.')
WHERE bio ILIKE 'Fictional demo platform%';
