--* Get time spent per work order from open to delivered by previous period
CREATE OR REPLACE FUNCTION fn_get_wo_completion_time_by_prev_period(
    p_period TEXT DEFAULT 'all-time'
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
    v_end_date   TIMESTAMP;
    v_now        TIMESTAMP := NOW();
    v_period     TEXT := LOWER(TRIM(p_period));
BEGIN
    IF v_period NOT IN ('week', 'month', 'quarter', 'semi-annual', 'annual', 'all-time') THEN
        RAISE EXCEPTION 'Invalid period: %. Valid options are: week, month, quarter, semi-annual, annual, all-time', v_period;
    END IF;

    CASE v_period
        WHEN 'week' THEN
            v_end_date   := v_now - INTERVAL '7 days';
            v_start_date := v_now - INTERVAL '14 days';

        WHEN 'month' THEN
            v_end_date   := v_now - INTERVAL '1 month';
            v_start_date := v_now - INTERVAL '2 months';

        WHEN 'quarter' THEN
            v_end_date   := v_now - INTERVAL '3 months';
            v_start_date := v_now - INTERVAL '6 months';

        WHEN 'semi-annual' THEN
            v_end_date   := v_now - INTERVAL '6 months';
            v_start_date := v_now - INTERVAL '12 months';

        WHEN 'annual' THEN
            v_end_date   := v_now - INTERVAL '1 year';
            v_start_date := v_now - INTERVAL '2 years';

        WHEN 'all-time' THEN
            v_start_date := NULL;
            v_end_date   := NULL;
    END CASE;

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
        T0."deletedAt" IS NULL
        AND T0."status" = '6'                                               --* only delivered work orders
        AND (
            v_start_date IS NULL
            OR T0."createdAt" BETWEEN v_start_date AND v_end_date
        )
    ORDER BY
        "daysToComplete" DESC,
        T0."code" ASC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_completion_time_by_prev_period();
SELECT * FROM fn_get_wo_completion_time_by_prev_period('month');
SELECT * FROM fn_get_wo_completion_time_by_prev_period('quarter');