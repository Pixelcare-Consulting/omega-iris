--* list all custom functions sorted by creation order asc
SELECT
    p.oid                              AS "oid",
    p.proname                          AS "functionName",
    pg_get_function_arguments(p.oid)   AS "parameters",
    r.rolname                          AS "owner"
FROM pg_proc p
INNER JOIN pg_roles r
    ON r.oid = p.proowner
INNER JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE
    n.nspname = 'public'               --* public schema only
    AND p.prokind = 'f'                --* functions only
    AND p.proname LIKE 'fn_%'          --* only your fn_ functions
ORDER BY p.oid ASC;                    --* oid ascending = creation order