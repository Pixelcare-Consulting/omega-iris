--* Get work order status updates by workOrderCode with status names
CREATE OR REPLACE FUNCTION fn_get_wo_status_updates_by_code(
    p_work_order_code INT
)
RETURNS TABLE (
    "id"                TEXT,
    "code"              INT,
    "workOrderCode"     INT,
    "prevStatus"        TEXT,
    "prevStatusName"    TEXT,
    "currentStatus"     TEXT,
    "currentStatusName" TEXT,
    "comments"          TEXT,
    "trackingNum"       TEXT,
    "createdAt"         TIMESTAMP,
    "updatedAt"         TIMESTAMP,
    "createdBy"         TEXT,
    "updatedBy"         TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        T0."id",
        T0."code",
        T0."workOrderCode",
        T0."prevStatus",
        T1."name"                           AS "prevStatusName",
        T0."currentStatus",
        T2."name"                           AS "currentStatusName",
        T0."comments",
        T0."trackingNum",
        T0."createdAt",
        T0."updatedAt",
        CONCAT_WS(' ', T3."fname", T3."lname")  AS "createdBy",  --* user full name
        CONCAT_WS(' ', T4."fname", T4."lname")  AS "updatedBy"   --* user full name
    FROM "WorkOrderStatusUpdate" T0
    LEFT JOIN "vw_work_order_status" T1
        ON T1."value" = T0."prevStatus"
    LEFT JOIN "vw_work_order_status" T2
        ON T2."value" = T0."currentStatus"
    LEFT JOIN "User" T3
        ON T3."id" = T0."createdBy"   --* match via id
        AND T3."deletedAt" IS NULL
    LEFT JOIN "User" T4
        ON T4."id" = T0."updatedBy"   --* match via id
        AND T4."deletedAt" IS NULL
    WHERE
        T0."workOrderCode" = p_work_order_code
    ORDER BY T0."createdAt" ASC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_status_updates_by_code(16);