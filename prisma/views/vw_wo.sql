CREATE OR REPLACE VIEW vw_wo AS
SELECT
    T0."id",
    T0."code",
    T0."projectIndividualCode",
    T0."userCode",
    T0."status",
    T4."name"                                           AS "statusName",
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
    CONCAT_WS(' ', T6."fname", T6."lname")             AS "createdBy",  --* user full name
    CONCAT_WS(' ', T7."fname", T7."lname")             AS "updatedBy",  --* user full name
    CONCAT_WS(' ', T8."fname", T8."lname")             AS "deletedBy",  --* user full name
    --* project individual
    T1."name"                                           AS "projectName",
    T2."name"                                           AS "projectGroupName",
    --* user
    CONCAT_WS(' ', T3."fname", T3."lname")             AS "userFullName", --* user full name
    T3."email"                                         AS "userEmail",
    T3."customerCode"                                  AS "userCustomerCode",
    --* business partner
    T5."Phone1"                                        AS "bpPhone1"
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
LEFT JOIN "vw_work_order_status" T4
    ON T4."value" = T0."status"
LEFT JOIN "BusinessPartner" T5
    ON T5."CardCode" = T3."customerCode"
    AND T5."deletedAt" IS NULL
LEFT JOIN "User" T6                                    --* createdBy user
    ON T6."id" = T0."createdBy"
    AND T6."deletedAt" IS NULL
LEFT JOIN "User" T7                                    --* updatedBy user
    ON T7."id" = T0."updatedBy"
    AND T7."deletedAt" IS NULL
LEFT JOIN "User" T8                                    --* deletedBy user
    ON T8."id" = T0."deletedBy"
    AND T8."deletedAt" IS NULL
ORDER BY T0."code" ASC;