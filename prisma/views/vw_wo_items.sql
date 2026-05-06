CREATE VIEW vw_wo_items AS
SELECT
        --* work order item
        T0."workOrderCode",
        T0."projectItemCode",
        T0."qty",
        T0."isDelivered",
        --* project item
        T1."id"                     AS "projectItemId",
        T1."itemCode",
        T1."warehouseCode",
        T1."owner",
        T1."partNumber",
        T1."dateCode",
        T1."countryOfOrigin",
        T1."lotCode",
        T1."palletNo",
        T1."packagingType",
        T1."spq",
        T1."dateReceived",
        (T5."fname" || ' ' || T5."lname")  AS "dateReceivedBy",  --* concatenated name
        T1."cost",
        T1."stockIn",
        T1."stockOut",
        T1."totalStock",
        T1."siteLocation",
        T1."subLocation2",
        T1."subLocation3",
        T1."notes",
        --* item
        T2."id"                     AS "itemId",
        T2."ItemCode"               AS "Mpn",
        T2."ItemName",
        T2."FirmCode",
        T2."FirmName",
        T2."ItmsGrpCod",
        T2."ItmsGrpNam",
        T2."Price",
        T2."notes"                  AS "itemNotes",
        T2."isActive",
        T2."syncStatus",
        --* project individual
        T1."projectIndividualCode",
        T3."name"                   AS "projectIndividualName",
        T4."code"                   AS "projectGroupCode",
        T4."name"                   AS "projectGroupName"
    FROM "WorkOrderItem" T0
    INNER JOIN "ProjectItem" T1
        ON T1."code" = T0."projectItemCode"
        AND T1."deletedAt" IS NULL
    INNER JOIN "Item" T2
        ON T2."code" = T1."itemCode"
        AND T2."deletedAt" IS NULL
    INNER JOIN "ProjectIndividual" T3
        ON T3."code" = T1."projectIndividualCode"
        AND T3."deletedAt" IS NULL
    LEFT JOIN "ProjectGroup" T4
        ON T4."code" = T3."groupCode"
        AND T4."deletedAt" IS NULL
    LEFT JOIN "User" T5
        ON T5."code" = T1."dateReceivedBy"
        AND T5."deletedAt" IS NULL    
     ORDER BY T0."workOrderCode" ASC;