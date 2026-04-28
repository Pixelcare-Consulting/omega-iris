--* Create view for top 5 projects with most work delivered work orders
CREATE OR REPLACE VIEW "vw_top_5_project_by_wo" AS
SELECT
    T1."code" AS "projectCode",
    T1."name" AS "projectName",
    T2."code" AS "ProjectGroupCode",
    T2."name" AS "ProjectGroupName",
    COUNT(T0."code") AS "totalWorkOrders"
FROM "WorkOrder" T0
JOIN "ProjectIndividual" T1 ON T1."code" = T0."projectIndividualCode"
JOIN "ProjectGroup" T2 ON T2."code" = T1."groupCode"
WHERE T0."status" = '6' 
GROUP BY T1."code", T1."name", T2."code", T2."name"
ORDER BY "totalWorkOrders" DESC
LIMIT 5;