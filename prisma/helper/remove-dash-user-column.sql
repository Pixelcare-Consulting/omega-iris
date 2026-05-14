--* preview 

SELECT "username", REPLACE("username", '-', '') AS "new_username"
FROM "User"
WHERE "username" LIKE '%-%';


--* excute update
UPDATE "User"
SET "username" = REPLACE("username", '-', '')
WHERE "username" LIKE '%-%';