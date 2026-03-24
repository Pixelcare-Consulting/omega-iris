--* Get open work orders (1-open, 2-pending, 3-in process, 4-verified, 5-partial delivery) count grouped by date by period
CREATE OR REPLACE FUNCTION fn_get_wo_open_groupby_dimdate_by_curr_period(
    p_period TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "date"       DATE,
    "dayName"    TEXT,
    "week"       INT,
    "month"      INT,
    "monthName"  TEXT,
    "quarter"    INT,
    "year"       INT,
    "totalCount" BIGINT
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

    --* if all-time get the earliest work order createdAt to avoid full DimDate scan
    IF v_start_date IS NULL THEN
        SELECT MIN(T1."createdAt") INTO v_start_date
        FROM "WorkOrder" T1
        WHERE T1."deletedAt" IS NULL
          AND T1."status" IN ('1', '2', '3', '4', '5');
    END IF;

    RETURN QUERY
    SELECT
        T0."date"::DATE,
        T0."dayName"::TEXT,
        T0."weekOfYear"::INT,
        T0."month"::INT,
        T0."monthName"::TEXT,
        T0."quarter"::INT,
        T0."year"::INT,
        COUNT(T1."id")::BIGINT AS "totalCount"
    FROM "DimDate" T0
    LEFT JOIN "WorkOrder" T1
        ON T1."createdAt"::DATE = T0."date"
        AND T1."deletedAt" IS NULL
        AND T1."status" IN ('1', '2', '3', '4', '5')
    WHERE
        T0."date" >= v_start_date::DATE
        AND T0."date" <= v_now::DATE
    GROUP BY
        T0."date",
        T0."dayName",
        T0."weekOfYear",
        T0."month",
        T0."monthName",
        T0."quarter",
        T0."year"
    ORDER BY T0."date" ASC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_open_groupby_dimdate_by_curr_period();
SELECT * FROM fn_get_wo_open_groupby_dimdate_by_curr_period('all-time');