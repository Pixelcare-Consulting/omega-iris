-- update file attachment path, from drive E: to D:
UPDATE "FileAttachment"
SET path = 'D:' || SUBSTRING(path FROM 3)
WHERE path LIKE 'E:%';