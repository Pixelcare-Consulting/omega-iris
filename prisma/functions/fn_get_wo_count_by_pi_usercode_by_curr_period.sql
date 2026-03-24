--* Get open and closed work orders count and total stock grouped by project individual by userCode (as customer) by current period
CREATE OR REPLACE FUNCTION fn_get_wo_count_by_pi_usercode_by_curr_period(
    p_user_code INT DEFAULT 0,
    p_period    TEXT DEFAULT 'all-time'
)
RETURNS TABLE (
    "projectIndividualCode" INT,
    "projectIndividualName" TEXT,
    "groupCode"             INT,
    "groupName"             TEXT,
    "totalOpen"             BIGINT,
    "totalClosed"           BIGINT,
    "totalStock"            NUMERIC
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
        T0."code"                                                                        AS "projectIndividualCode",
        T0."name"                                                                        AS "projectIndividualName",
        T2."code"                                                                        AS "groupCode",
        T2."name"                                                                        AS "groupName",
        COUNT(DISTINCT T3."id") FILTER (WHERE T3."status" IN ('1','2','3','4','5'))::BIGINT  AS "totalOpen",
        COUNT(DISTINCT T3."id") FILTER (WHERE T3."status" = '6')::BIGINT                    AS "totalClosed",
        COALESCE(T4."totalStock", 0)                                                         AS "totalStock"
    FROM "ProjectIndividual" T0
    INNER JOIN "ProjectIndividualCustomer" T1
        ON T1."projectIndividualCode" = T0."code"
        AND T1."deletedAt" IS NULL
        AND T1."userCode" = p_user_code                --* filter by userCode
    LEFT JOIN "ProjectGroup" T2
        ON T2."code" = T0."groupCode"
        AND T2."deletedAt" IS NULL
    LEFT JOIN "WorkOrder" T3
        ON T3."projectIndividualCode" = T0."code"
        AND T3."deletedAt" IS NULL
        AND (
            v_start_date IS NULL
            OR T3."createdAt" >= v_start_date
        )
    LEFT JOIN (
        --* pre-aggregate totalStock per project individual to avoid fan-out
        SELECT
            S0."projectIndividualCode",
            SUM(S0."totalStock") AS "totalStock"
        FROM "ProjectItem" S0
        WHERE
            S0."deletedAt" IS NULL
            AND (
                v_start_date IS NULL
                OR S0."createdAt" >= v_start_date
            )
        GROUP BY S0."projectIndividualCode"
    ) T4 ON T4."projectIndividualCode" = T0."code"
    WHERE
        T0."deletedAt" IS NULL
        AND T0."isActive" = TRUE
    GROUP BY
        T0."code",
        T0."name",
        T2."code",
        T2."name",
        T4."totalStock"
    ORDER BY
        COUNT(DISTINCT T3."id") FILTER (WHERE T3."status" IN ('1','2','3','4','5')) DESC,
        COUNT(DISTINCT T3."id") FILTER (WHERE T3."status" = '6') DESC,
        T2."name" ASC,
        T0."name" ASC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_count_by_pi_usercode_by_curr_period(5);
SELECT * FROM fn_get_wo_count_by_pi_usercode_by_curr_period(5, 'month');
SELECT * FROM fn_get_wo_count_by_pi_usercode_by_curr_period(5, 'quarter');