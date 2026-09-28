--* Create view for project items per project
--* dropped first: a replace cannot add a column in the middle
DROP VIEW IF EXISTS "vw_pi_inventory_per_project";

CREATE OR REPLACE VIEW "vw_pi_inventory_per_project" AS
SELECT
    T0."dbCode",
    T1."code" AS "projectCode",
    T1."name" AS "projectName",
    T2."code" AS "projectGroupCode",
    T2."name" AS "projectGroupName",
    COUNT(T0."code") AS "totalItems"         
FROM "ProjectItem" T0
JOIN "ProjectIndividual" T1 ON T1."code" = T0."projectIndividualCode"
JOIN "ProjectGroup" T2 ON T2."code" = T1."groupCode"
GROUP BY T0."dbCode", T1."code", T1."name", T2."code", T2."name";

--* sample query execution
SELECT * FROM "vw_pi_inventory_per_project";