--* Get active users (isActive = true) by previous period
CREATE OR REPLACE FUNCTION fn_get_users_active_by_prev_period(
    p_period TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "id"            TEXT,
    "code"          INT,
    "username"      TEXT,
    "fname"         TEXT,
    "lname"         TEXT,
    "email"         TEXT,
    "emailVerified" TIMESTAMP,
    "roleCode"      INT,
    "isOnline"      BOOLEAN,
    "isActive"      BOOLEAN,
    "location"      TEXT,
    "lastIpAddress" TEXT,
    "lastSignin"    TIMESTAMP,
    "customerCode"  TEXT,
    "supplierCode"  TEXT,
    "createdAt"     TIMESTAMP,
    "updatedAt"     TIMESTAMP,
    "deletedAt"     TIMESTAMP,
    "createdBy"     TEXT,
    "updatedBy"     TEXT,
    "deletedBy"     TEXT
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
        T0."id",
        T0."code",
        T0."username",
        T0."fname",
        T0."lname",
        T0."email",
        T0."emailVerified",
        T0."roleCode",
        T0."isOnline",
        T0."isActive",
        T0."location",
        T0."lastIpAddress",
        T0."lastSignin",
        T0."customerCode",
        T0."supplierCode",
        T0."createdAt",
        T0."updatedAt",
        T0."deletedAt",
        T0."createdBy",
        T0."updatedBy",
        T0."deletedBy"
    FROM "User" T0
    WHERE
        T0."deletedAt" IS NULL
        AND T0."isActive" = TRUE
        AND (
            v_start_date IS NULL
            OR T0."createdAt" BETWEEN v_start_date AND v_end_date
        )
    ORDER BY T0."createdAt" DESC;
END;
$$;

--* query execution
SELECT * FROM fn_get_users_active_by_prev_period();
SELECT * FROM fn_get_users_active_by_prev_period('month');