-- Normalize employee phone numbers to '+91 <10-digits>'
-- 1) Strip all non-digits
-- 2) Take the last 10 digits (common Indian mobile length)
-- 3) Prefix with '+91 '

UPDATE employees
SET phone = '+91 ' || RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10)
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT LIKE '+91 %'; 