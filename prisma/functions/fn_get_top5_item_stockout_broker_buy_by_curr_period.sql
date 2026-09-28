--* Get top 5 MPNs by stockOut under Broker Buy group by current period
--* dropped first: p_db_code changes the signature, a replace would leave the old unscoped one behind
DROP FUNCTION IF EXISTS fn_get_top5_item_stockout_broker_buy_by_curr_period(TEXT);

CREATE OR REPLACE FUNCTION fn_get_top5_item_stockout_broker_buy_by_curr_period(
    p_db_code TEXT,
    p_period  TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "code"  INT,
    "ItemCode"  TEXT,
    "ItemName"  TEXT,
    "group"     TEXT,
    "stockOut"  NUMERIC
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
        T2."code",                         
        T2."ItemCode"                      AS "ItemCode",
        T2."ItemName"                      AS "ItemName",
        T3."name"                          AS "group",
        COALESCE(SUM(T1."stockOut"), 0)    AS "stockOut"
    FROM "ProjectIndividual" T0
    INNER JOIN "ProjectItem" T1
        ON T1."projectIndividualCode" = T0."code"
        AND T1."dbCode" = p_db_code
        AND T1."deletedAt" IS NULL
        AND (
            v_start_date IS NULL
            OR T1."createdAt" >= v_start_date
        )
    INNER JOIN "Item" T2
        ON T2."code" = T1."itemCode"
        AND T2."deletedAt" IS NULL
    INNER JOIN "ProjectGroup" T3
        ON T3."code" = T0."groupCode"
        AND T3."dbCode" = p_db_code              --* every company has its own Broker Buy group
        AND T3."deletedAt" IS NULL
        AND T3."name" = 'Broker Buy'             -- //* Broker Buy only
    WHERE
        T0."dbCode" = p_db_code                --* company scope, not an optional filter
        AND T0."deletedAt" IS NULL
        AND T0."isActive" = TRUE
    GROUP BY
        T2."code",
        T2."ItemCode",
        T2."ItemName",
        T3."name"
    HAVING
        COALESCE(SUM(T1."stockOut"), 0) > 0     
    ORDER BY
        COALESCE(SUM(T1."stockOut"), 0) DESC,
        T2."ItemCode" ASC
    LIMIT 5;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_top5_item_stockout_broker_buy_by_curr_period('OMEGA_P02_TESTING');
SELECT * FROM fn_get_top5_item_stockout_broker_buy_by_curr_period('OMEGA_P02_TESTING', 'month');
SELECT * FROM fn_get_top5_item_stockout_broker_buy_by_curr_period('OMEGA_P02_TESTING', 'quarter');