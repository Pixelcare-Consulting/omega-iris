---* Create views for top 5 most processed (delivered) MPN in work orders based on qty
--* dropped first: a replace cannot add a column in the middle
DROP VIEW IF EXISTS "vw_top_5_mpn_brokery_buy";

CREATE OR REPLACE VIEW "vw_top_5_mpn_brokery_buy" AS
SELECT
    "dbCode",
    "ItemCode",
    "ItemName",
    "qty"
FROM (
    SELECT
        T0."dbCode",
        T3."ItemCode",
        T3."ItemName",
        SUM(T1."qty") AS "qty",
        --* rank inside each database, so one busy company cannot take all 5 slots
        ROW_NUMBER() OVER (
            PARTITION BY T0."dbCode"
            ORDER BY SUM(T1."qty") DESC, T3."ItemCode" ASC
        ) AS "rank"
    FROM "WorkOrder" T0
    JOIN "WorkOrderItem" T1 ON T1."workOrderCode" = T0."code"
    JOIN "ProjectItem" T2 ON T2."code" = T1."projectItemCode"
    JOIN "Item" T3 ON T3."code" = T2."itemCode"
    JOIN "ProjectIndividual" T4 ON T4."code" = T2."projectIndividualCode"
    JOIN "ProjectGroup" T5 ON T5."code" = T4."groupCode"
    WHERE T5."name" = 'Broker Buy' AND T0."status" = '6'
    GROUP BY T0."dbCode", T3."ItemCode", T3."ItemName"
) T
WHERE "rank" <= 5
ORDER BY "dbCode" ASC, "qty" DESC;

--* sample query execution
SELECT * FROM vw_top_5_mpn_brokery_buy;