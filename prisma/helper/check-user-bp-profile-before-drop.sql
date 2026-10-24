--! only works while User still has customerCode, customerDbCode, supplierCode, supplierDbCode and the UserBpProfile table exists
--* run before dropping the old User card columns (phase 2), every query must return 0 rows
--! any row means data would be lost, fix it first


--* 1. old card with no matching profile row
SELECT U."code", U."username", 'C' AS "type", U."customerCode" AS "card", U."customerDbCode" AS "db"
FROM "User" U
WHERE COALESCE(U."customerCode", '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "UserBpProfile" P
    WHERE P."userCode" = U."code" AND P."cardType" = 'C' AND P."cardCode" = U."customerCode"
  )
UNION ALL
SELECT U."code", U."username", 'S', U."supplierCode", U."supplierDbCode"
FROM "User" U
WHERE COALESCE(U."supplierCode", '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "UserBpProfile" P
    WHERE P."userCode" = U."code" AND P."cardType" = 'S' AND P."cardCode" = U."supplierCode"
  )
ORDER BY 1, 3;


--* 2. saved reports bound to a column that is about to be dropped
SELECT "code", "title", "fileName"
FROM "Report"
WHERE "data" ~ '(User|fn_get_users_active_by_(curr|prev)_period)\.(customer|supplier)(Db)?Code';
