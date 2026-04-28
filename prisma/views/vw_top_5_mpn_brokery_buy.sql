---* Create views for top 5 most processed (delivered) MPN in work orders based on qty
CREATE OR REPLACE VIEW "vw_top_5_mpn_brokery_buy" AS
SELECT
    T3."ItemCode",
    T3."ItemName",
    SUM(T1."qty") as qty
FROM "WorkOrder" T0
JOIN "WorkOrderItem" T1 ON T1."workOrderCode" = T0."code"
JOIN "ProjectItem" T2 ON T2."code" = T1."projectItemCode"
JOIN "Item" T3 ON T3."code" = T2."itemCode"
JOIN "ProjectIndividual" T4 ON T4."code" = T2."projectIndividualCode"
JOIN "ProjectGroup" T5 ON T5."code" = T4."groupCode"
WHERE T5."name" = 'Broker Buy' AND T0."status" = '6'
GROUP BY T3."ItemCode", T3."ItemName"
ORDER BY "qty" DESC
LIMIT 5;