--* Create view for top 5 projects with most work delivered work orders
--* dropped first: a replace cannot add a column in the middle
DROP VIEW IF EXISTS "vw_top_5_project_by_wo";

CREATE OR REPLACE VIEW "vw_top_5_project_by_wo" AS
SELECT
    "dbCode",
    "projectCode",
    "projectName",
    "ProjectGroupCode",
    "ProjectGroupName",
    "totalWorkOrders"
FROM (
    SELECT
        T0."dbCode",
        T1."code" AS "projectCode",
        T1."name" AS "projectName",
        T2."code" AS "ProjectGroupCode",
        T2."name" AS "ProjectGroupName",
        COUNT(T0."code") AS "totalWorkOrders",
        --* rank inside each database, so one busy company cannot take all 5 slots
        ROW_NUMBER() OVER (
            PARTITION BY T0."dbCode"
            ORDER BY COUNT(T0."code") DESC, T1."name" ASC
        ) AS "rank"
    FROM "WorkOrder" T0
    JOIN "ProjectIndividual" T1 ON T1."code" = T0."projectIndividualCode"
    JOIN "ProjectGroup" T2 ON T2."code" = T1."groupCode"
    WHERE T0."status" = '6'
    GROUP BY T0."dbCode", T1."code", T1."name", T2."code", T2."name"
) T
WHERE "rank" <= 5
ORDER BY "dbCode" ASC, "totalWorkOrders" DESC;

--* sample query execution
SELECT * FROM vw_top_5_project_by_wo