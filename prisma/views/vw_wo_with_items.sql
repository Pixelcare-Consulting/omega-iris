--* Create view for work order with line items
CREATE OR REPLACE VIEW "vw_wo_with_items" AS 
SELECT 
	T0."code",
	T0."userCode",
	T0."status",
	T0."isInternal",
	T0."customerPo",
	T0."salesOrderCode",
    T0."purchaseOrderCode",
	T0."createdAt",
    T0."updatedAt",
	
	T1."projectItemCode",
    T1."qty",
    T1."isDelivered",

	T2."itemCode",
    T2."partNumber",
    T2."dateCode",
    T2."countryOfOrigin",
    T2."lotCode",
    T2."palletNo",
    T2."packagingType",
    T2."spq",
    T2."dateReceived",
    concat(T4."fname", ' ', T4."lname") AS "dateReceivedBy",
    T2."cost",
    T2."stockIn",
    T2."stockOut",
    T2."totalStock",
    T2."siteLocation",
    T2."subLocation2",
    T2."subLocation3",

    T5."name" AS "ProjectIndividualName",
    T5."code" AS "ProjectIndividualCode",
    T6."name" AS "ProjectGroupName",
    T6."code" AS "ProjectGroupCode",

	T3."ItemName",
	T3."ItemCode",
    T3."FirmCode",
    T3."FirmName",
    T3."ItmsGrpCod",
    T3."ItmsGrpNam",
	T3."Price"
FROM "WorkOrder" T0
LEFT JOIN "WorkOrderItem" T1 ON T1."workOrderCode" = T0."code"
LEFT JOIN "ProjectItem" T2 ON T2."code" = T1."projectItemCode"
LEFT JOIN "Item" T3 ON T3."code" = T2."itemCode"
LEFT JOIN "User" T4 ON T4."code" = T2."dateReceivedBy"
LEFT JOIN "ProjectIndividual" T5 ON T5."code" = T0."projectIndividualCode"
LEFT JOIN "ProjectGroup" T6 ON T6."code" = T5."groupCode"s