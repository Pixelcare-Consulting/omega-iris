--* Create view for work order with status updates
--* dropped first: a replace cannot add a column in the middle
DROP VIEW IF EXISTS "vw_wo_with_status_updates";

CREATE OR REPLACE VIEW "vw_wo_with_status_updates" AS
SELECT
	T0."code",
    T0."dbCode",
	T0."userCode",
	T0."status",
	T0."isInternal",
	T0."customerPo",
	T0."salesOrderCode",
    T0."purchaseOrderCode",
	T0."createdAt",
    T0."updatedAt",

    T1."prevStatus",
    T1."currentStatus",
    T1."comments",
    T1."trackingNum",

    T2."name" AS "ProjectIndividualName",
    T2."code" AS "ProjectIndividualCode",
    T3."name" AS "ProjectGroupName",
    T3."code" AS "ProjectGroupCode"
FROM "WorkOrder" T0
LEFT JOIN "WorkOrderStatusUpdate" T1 ON T0."code" = T1."workOrderCode"
LEFT JOIN "ProjectIndividual" T2 ON T2."code" = T0."projectIndividualCode"
LEFT JOIN "ProjectGroup" T3 ON T3."code" = T2."groupCode"

--* sample query execution
SELECT * FROM vw_wo_with_status_updates