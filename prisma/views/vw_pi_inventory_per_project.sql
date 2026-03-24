--* Create view for project items per project
CREATE OR REPLACE VIEW "vw_pi_inventory_per_project" AS
SELECT
    T1."code" AS "projectCode",
    T1."name" AS "projectName",
    T2."code" AS "projectGroupCode",
    T2."name" AS "projectGroupName",
    COUNT(T0."code") AS "totalItems"         
FROM "ProjectItem" T0
JOIN "ProjectIndividual" T1 ON T1."code" = T0."projectIndividualCode"
JOIN "ProjectGroup" T2 ON T2."code" = T1."groupCode"
GROUP BY T1."code", T1."name", T2."code", T2."name"