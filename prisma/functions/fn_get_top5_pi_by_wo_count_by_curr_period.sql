--* Get top 5 projects by created work orders count by current period
CREATE OR REPLACE FUNCTION fn_get_top5_pi_by_wo_count_by_curr_period(
    p_period TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "code"           INT,
    "name"           TEXT,
    "group"          TEXT,
    "totalWorkOrders" BIGINT
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
        T0."code",
        T0."name",
        T2."name"              AS "group",
        COUNT(T1."id")::BIGINT AS "totalWorkOrders"
    FROM "ProjectIndividual" T0
    LEFT JOIN "WorkOrder" T1
        ON T1."projectIndividualCode" = T0."code"
        AND T1."deletedAt" IS NULL
        AND (
            v_start_date IS NULL
            OR T1."createdAt" >= v_start_date
        )
    LEFT JOIN "ProjectGroup" T2
        ON T2."code" = T0."groupCode"
        AND T2."deletedAt" IS NULL
    WHERE
        T0."deletedAt" IS NULL
        AND T0."isActive" = TRUE
    GROUP BY
        T0."code",
        T0."name",
        T2."name"
    HAVING
        COUNT(T1."id") > 0                       --* exclude projects with zero work orders    
    ORDER BY
        COUNT(T1."id") DESC,
        T2."name" ASC,
        T0."name" ASC
    LIMIT 5;
END;
$$;


--* sample query execution
SELECT * FROM fn_get_top5_pi_by_wo_count_by_curr_period();
SELECT * FROM fn_get_top5_pi_by_wo_count_by_curr_period('month');
SELECT * FROM fn_get_top5_pi_by_wo_count_by_curr_period('quarter');