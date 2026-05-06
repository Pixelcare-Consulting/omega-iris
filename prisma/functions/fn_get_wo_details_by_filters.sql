--* Get work orders by optional filters: partNumber, mpn (ItemCode), projectName, projectGroupName, customerPo, trackingNum
CREATE OR REPLACE FUNCTION fn_get_wo_details_by_filters(
    p_part_number       TEXT DEFAULT NULL,
    p_mpn               TEXT DEFAULT NULL,
    p_project_name      TEXT DEFAULT NULL,
    p_project_group_name TEXT DEFAULT NULL,
    p_customer_po       TEXT DEFAULT NULL,
    p_tracking_num       TEXT DEFAULT NULL,
    p_status             TEXT DEFAULT NULL
)
RETURNS TABLE (
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
    "projectName"             TEXT,
    "projectGroupName"        TEXT,
    "userFullName"            TEXT,
    "userEmail"               TEXT,
    "userCustomerCode"        TEXT,
    "bpPhone1"                TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    --* Return empty if no filters are provided
    IF p_part_number IS NULL AND p_mpn IS NULL AND p_project_name IS NULL
       AND p_project_group_name IS NULL AND p_customer_po IS NULL AND p_tracking_num IS NULL
       AND p_status IS NULL THEN
        RETURN;
    END IF;


    RETURN QUERY
    SELECT DISTINCT
        T0."id",
        T0."code",
        T0."projectIndividualCode",
        T0."userCode",
        T0."status",
        T0."statusName",
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
        T0."createdBy",
        T0."updatedBy",
        T0."deletedBy",
        T0."projectName",
        T0."projectGroupName",
        T0."userFullName",
        T0."userEmail",
        T0."userCustomerCode",
        T0."bpPhone1"
    FROM "vw_wo" T0
    WHERE
        (p_status IS NULL OR T0."status" = p_status)
        --* filter by partNumber
        AND (p_part_number IS NULL OR EXISTS (
            SELECT 1 FROM "WorkOrderItem" T1
            INNER JOIN "ProjectItem" T2 
                ON T2."code" = T1."projectItemCode" 
                AND T2."deletedAt" IS NULL
            INNER JOIN "Item" T3 
                ON T3."code" = T2."itemCode" 
                AND T3."deletedAt" IS NULL
            WHERE T1."workOrderCode" = T0."code"
            AND T2."partNumber" ILIKE '%' || p_part_number || '%'
        ))
        --* filter by mpn
        AND (p_mpn IS NULL OR EXISTS (
            SELECT 1 FROM "WorkOrderItem" T1
            INNER JOIN "ProjectItem" T2 
                ON T2."code" = T1."projectItemCode" 
                AND T2."deletedAt" IS NULL
            INNER JOIN "Item" T3 
                ON T3."code" = T2."itemCode" 
                AND T3."deletedAt" IS NULL
            WHERE T1."workOrderCode" = T0."code"
            AND T3."ItemCode" ILIKE '%' || p_mpn || '%'
        ))
        --* filter by project name
        AND (p_project_name IS NULL OR T0."projectName" ILIKE '%' || p_project_name || '%')
        --* filter by project group name
        AND (p_project_group_name IS NULL OR T0."projectGroupName" ILIKE '%' || p_project_group_name || '%')
        --* filter by customer PO
        AND (p_customer_po IS NULL OR T0."customerPo" ILIKE '%' || p_customer_po || '%')
        --* filter by tracking number via work order status updates
        AND (p_tracking_num IS NULL OR EXISTS (
            SELECT 1 FROM "WorkOrderStatusUpdate" T4
            WHERE T4."workOrderCode" = T0."code"
            AND T4."trackingNum" ILIKE '%' || p_tracking_num || '%'
        ));
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_details_by_filters();
SELECT * FROM fn_get_wo_details_by_filters(p_part_number := 'ABC123');
SELECT * FROM fn_get_wo_details_by_filters(p_mpn := 'XYZ-001');
SELECT * FROM fn_get_wo_details_by_filters(p_project_name := 'Broker');
SELECT * FROM fn_get_wo_details_by_filters(p_project_group_name := 'Broker Buy');
SELECT * FROM fn_get_wo_details_by_filters(p_part_number := 'ABC123', p_mpn := 'XYZ-001');
SELECT * FROM fn_get_wo_details_by_filters(p_part_number := 'ABC123', p_project_name := 'Broker');



