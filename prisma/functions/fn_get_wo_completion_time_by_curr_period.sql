--* Get time spent per work order from open to delivered by current period
--* dropped first: p_db_code changes the signature, a replace would leave the old unscoped one behind
DROP FUNCTION IF EXISTS fn_get_wo_completion_time_by_curr_period(TEXT);

CREATE OR REPLACE FUNCTION fn_get_wo_completion_time_by_curr_period(
    p_db_code TEXT,
    p_period  TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "workOrderCode"     INT,
    "projectIndividual" TEXT,
    "openedAt"          TIMESTAMP,
    "deliveredAt"       TIMESTAMP,
    "daysToComplete"    NUMERIC,
    "hoursToComplete"   NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date TIMESTAMP;
    v_now        TIMESTAMP := NOW();
    v_period     TEXT := LOWER(TRIM(p_period));
BEGIN
    IF v_period NOT IN ('week', 'month', 'quarter', 'semi-annual', 'annual', 'all-time') THEN
        RAISE EXCEPTION 'Invalid period: %. Valid options are: week, month, quarter, semi-annual, annual, all-time', v_period;
    END IF;

    v_start_date := CASE v_period
        WHEN 'week'        THEN v_now - INTERVAL '7 days'
        WHEN 'month'       THEN v_now - INTERVAL '1 month'
        WHEN 'quarter'     THEN v_now - INTERVAL '3 months'
        WHEN 'semi-annual' THEN v_now - INTERVAL '6 months'
        WHEN 'annual'      THEN v_now - INTERVAL '1 year'
        WHEN 'all-time'    THEN NULL
    END;

    RETURN QUERY
    SELECT
        T0."code"                                                           AS "workOrderCode",
        T2."name"                                                           AS "projectIndividual",
        T0."createdAt"                                                      AS "openedAt",
        T1."createdAt"                                                      AS "deliveredAt",
        ROUND(
            EXTRACT(EPOCH FROM (T1."createdAt" - T0."createdAt")) / 86400
        , 2)                                                                AS "daysToComplete",
        ROUND(
            EXTRACT(EPOCH FROM (T1."createdAt" - T0."createdAt")) / 3600
        , 2)                                                                AS "hoursToComplete"
    FROM "WorkOrder" T0
    INNER JOIN "WorkOrderStatusUpdate" T1
        ON T1."workOrderCode" = T0."code"
        AND T1."currentStatus" = '6'                                        --* exact moment it was delivered
    INNER JOIN "ProjectIndividual" T2
        ON T2."code" = T0."projectIndividualCode"
        AND T2."deletedAt" IS NULL
    WHERE
        T0."dbCode" = p_db_code                                             --* company scope, not an optional filter
        AND T0."deletedAt" IS NULL
        AND T0."status" = '6'                                             --* only delivered work orders
        AND (
            v_start_date IS NULL
            OR T0."createdAt" >= v_start_date
        )
    ORDER BY
        "daysToComplete" DESC,
        T0."code" ASC;
END;
$$;

-- //* sample query execution
SELECT * FROM fn_get_wo_completion_time_by_curr_period('OMEGA_P02_TESTING');
SELECT * FROM fn_get_wo_completion_time_by_curr_period('OMEGA_P02_TESTING', 'month');
SELECT * FROM fn_get_wo_completion_time_by_curr_period('OMEGA_P02_TESTING', 'quarter');