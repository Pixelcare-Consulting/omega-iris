--* Get project individual by current period
CREATE OR REPLACE FUNCTION fn_get_pi_by_curr_period(
    p_period TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "id"          TEXT,
    "code"        INT,
    "name"        TEXT,
    "groupCode"   INT,
    "description" TEXT,
    "isActive"    BOOLEAN,
    "createdAt"   TIMESTAMP,
    "updatedAt"   TIMESTAMP,
    "deletedAt"   TIMESTAMP,
    "createdBy"   TEXT,
    "updatedBy"   TEXT,
    "deletedBy"   TEXT
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
        T0."id",
        T0."code",
        T0."name",
        T0."groupCode",
        T0."description",
        T0."isActive",
        T0."createdAt",
        T0."updatedAt",
        T0."deletedAt",
        T0."createdBy",
        T0."updatedBy",
        T0."deletedBy"
    FROM "ProjectIndividual" T0
    WHERE
        T0."deletedAt" IS NULL
        AND (
            v_start_date IS NULL
            OR T0."createdAt" >= v_start_date
        )
    ORDER BY T0."createdAt" DESC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_pi_by_curr_period()
SELECT * FROM fn_get_pi_by_curr_period('month')