--* Get work order by workOrderCode with project and user details
CREATE OR REPLACE FUNCTION fn_get_wo_by_code(
    p_work_order_code INT
)
RETURNS TABLE (
    --* work order columns
    "id"                      TEXT,
    "code"                    INT,
    "projectIndividualCode"   INT,
    "userCode"                INT,
    "status"                  TEXT,
    "statusName"              TEXT,
    "isInternal"              BOOLEAN,
    "billingAddrCode"         TEXT,
    "shippingAddrCode"        TEXT,
    "comments"                TEXT,
    "customerPo"              TEXT,
    "salesOrderCode"          INT,
    "purchaseOrderCode"       INT,
    "isAlternativeAddr"       BOOLEAN,
    "alternativeBillingAddr"  TEXT,
    "alternativeShippingAddr" TEXT,
    "createdAt"               TIMESTAMP,
    "updatedAt"               TIMESTAMP,
    "deletedAt"               TIMESTAMP,
    "createdBy"               TEXT,
    "updatedBy"               TEXT,
    "deletedBy"               TEXT,
    --* project individual columns
    "projectName"             TEXT,
    "projectGroupName"        TEXT,
    --* user columns
    "userFname"               TEXT,
    "userLname"               TEXT,
    "userEmail"               TEXT,
    "userCustomerCode"        TEXT,
    --* business partner columns
    "bpPhone1"                TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        T0."id",
        T0."code",
        T0."projectIndividualCode",
        T0."userCode",
        T0."status",
        T4."name"                          AS "statusName",  --* from vw_wo_status view
        T0."isInternal",
        T0."billingAddrCode",
        T0."shippingAddrCode",
        T0."comments",
        T0."customerPo",
        T0."salesOrderCode",
        T0."purchaseOrderCode",
        T0."isAlternativeAddr",
        T0."alternativeBillingAddr",
        T0."alternativeShippingAddr",
        T0."createdAt",
        T0."updatedAt",
        T0."deletedAt",
        CONCAT_WS(' ', T6."fname", T6."lname")  AS "createdBy",  --* user full name
        CONCAT_WS(' ', T7."fname", T7."lname")  AS "updatedBy",   --* user full name
        T0."deletedBy",
        --* project individual
        T1."name"                          AS "projectName",
        T2."name"                          AS "projectGroupName",
        --* user
        T3."fname"                         AS "userFname",
        T3."lname"                         AS "userLname",
        T3."email"                         AS "userEmail",
        T3."customerCode"                  AS "userCustomerCode",
         --* business partner
        T5."Phone1"                        AS "bpPhone1"
    FROM "WorkOrder" T0
    INNER JOIN "ProjectIndividual" T1
        ON T1."code" = T0."projectIndividualCode"
        AND T1."deletedAt" IS NULL
    LEFT JOIN "ProjectGroup" T2
        ON T2."code" = T1."groupCode"
        AND T2."deletedAt" IS NULL
    INNER JOIN "User" T3
        ON T3."code" = T0."userCode"
        AND T3."deletedAt" IS NULL
    LEFT JOIN "vw_wo_status" T4          
        ON T4."value" = T0."status"
        LEFT JOIN "BusinessPartner" T5          
        ON T5."CardCode" = T3."customerCode"
        AND T5."deletedAt" IS NULL    
    LEFT JOIN "User" T6
        ON T6."id" = T0."createdBy"   --* match via id
        AND T6."deletedAt" IS NULL
    LEFT JOIN "User" T7
        ON T7."id" = T0."updatedBy"   --* match via id
        AND T7."deletedAt" IS NULL            
    WHERE
        T0."code" = p_work_order_code
        AND T0."deletedAt" IS NULL;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_by_code(16);