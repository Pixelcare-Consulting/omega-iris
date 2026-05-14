--* list all custom views sorted by creation order asc
SELECT
    c.oid                              AS "oid",
    c.relname                          AS "viewName",
    r.rolname                          AS "owner"
FROM pg_class c
INNER JOIN pg_roles r
    ON r.oid = c.relowner
INNER JOIN pg_namespace n
    ON n.oid = c.relnamespace
WHERE
    n.nspname = 'public'               --* public schema only
    AND c.relkind = 'v'                --* views only
ORDER BY c.oid ASC;                    --* oid ascending = creation order