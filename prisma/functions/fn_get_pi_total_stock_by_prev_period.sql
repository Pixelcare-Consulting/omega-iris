--* Get sum of total stock per project individual by previous period
CREATE OR REPLACE FUNCTION fn_get_pi_total_stock_by_prev_period(
    p_period TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "code"       INT,
    "name"       TEXT,
    "group"      TEXT,
    "totalStock" NUMERIC
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
        T0."code",
        T0."name",
        T2."name"                         AS "group",
        COALESCE(SUM(T1."totalStock"), 0) AS "totalStock"
    FROM "ProjectIndividual" T0
    LEFT JOIN "ProjectItem" T1
        ON T1."projectIndividualCode" = T0."code"
        AND T1."deletedAt" IS NULL
        AND (
            v_start_date IS NULL
            OR T1."createdAt" BETWEEN v_start_date AND v_end_date
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
    ORDER BY
        COALESCE(SUM(T1."totalStock"), 0) DESC,
        T2."name" ASC,
        T0."name" ASC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_pi_total_stock_by_prev_period();
SELECT * FROM fn_get_pi_total_stock_by_prev_period('month');
SELECT * FROM fn_get_pi_total_stock_by_prev_period('quarter');