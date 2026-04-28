--* Get active / undelivered work orders (status != '6' / not delivered) by current period
CREATE OR REPLACE FUNCTION fn_get_wo_undelivered_by_curr_period(
    p_period TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "id"                      TEXT,
    "code"                    INT,
    "projectIndividualCode"   INT,
    "userCode"                INT,
    "status"                  TEXT,
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
    "deletedBy"               TEXT
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
        T0."projectIndividualCode",
        T0."userCode",
        T0."status",
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
        T0."deletedBy"
    FROM "WorkOrder" T0
    WHERE
        T0."deletedAt" IS NULL
        AND T0."status" != '6'
        AND (
            v_start_date IS NULL
            OR T0."createdAt" >= v_start_date
        )
    ORDER BY T0."createdAt" DESC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_undelivered_by_curr_period();
SELECT * FROM fn_get_wo_undelivered_by_curr_period('month');