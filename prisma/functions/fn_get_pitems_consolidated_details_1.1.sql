--* (Optimized Query) Get consolidate project item with item details and total stock, totalStockIn, totalStockOut
CREATE OR REPLACE FUNCTION fn_get_pitems_consolidated_details_1_1(
    p_project_name       TEXT DEFAULT NULL,
    p_project_group_name TEXT DEFAULT NULL,
    p_mpn                TEXT DEFAULT NULL,
    p_description        TEXT DEFAULT NULL,
    p_manufacturer       TEXT DEFAULT NULL
)
RETURNS TABLE (
    "code"          INT,
    "ItemCode"      TEXT,
    "ItemName"      TEXT,
    "FirmName"      TEXT,
    "ItmsGrpNam"    TEXT,
    "Price"         DECIMAL,
    "notes"         TEXT,
    "isActive"      BOOLEAN,
    "syncStatus"    TEXT,
    "totalStockIn"  DECIMAL,
    "totalStockOut" DECIMAL,
    "totalStock"    DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    --* Early return if no filters
    IF p_project_name IS NULL AND p_project_group_name IS NULL
       AND p_mpn IS NULL AND p_description IS NULL
       AND p_manufacturer IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH filtered_projects AS (
        --* filter projectindividual + projectgroup first
        --* reduces rows before joining to projectitem
        SELECT
            T1."code"
        FROM "ProjectIndividual" T1
        LEFT JOIN "ProjectGroup" T2
            ON  T2."code"      = T1."groupCode"
            AND T2."deletedAt" IS NULL
        WHERE
            T1."deletedAt" IS NULL
            AND (p_project_name IS NULL OR T1."name" ILIKE '%' || p_project_name || '%')
            AND (p_project_group_name IS NULL OR T2."name" ILIKE '%' || p_project_group_name || '%')
    ),
    filtered_items AS (
        --* filter item first with only needed columns
        SELECT
            T3."code",
            T3."ItemCode",
            T3."ItemName",
            T3."FirmName",
            T3."ItmsGrpNam",
            T3."Price",
            T3."notes",
            T3."isActive",
            T3."syncStatus"
        FROM "Item" T3
        WHERE
            T3."deletedAt" IS NULL
            AND (p_mpn IS NULL OR T3."ItemCode" ILIKE '%' || p_mpn || '%')
            AND (p_description IS NULL OR T3."ItemName" ILIKE '%' || p_description || '%')
            AND (p_manufacturer IS NULL OR T3."FirmName" ILIKE '%' || p_manufacturer || '%')
    ),
    aggregated AS (
        --* aggregate projectitem after filtering projects and items
        --* much fewer rows to sum over
        SELECT
            T0."itemCode",
            COALESCE(SUM(T0."stockIn"), 0)    AS "totalStockIn",
            COALESCE(SUM(T0."stockOut"), 0)   AS "totalStockOut",
            COALESCE(SUM(T0."totalStock"), 0) AS "totalStock"
        FROM "ProjectItem" T0
        INNER JOIN filtered_projects T1 ON T1."code" = T0."projectIndividualCode"
        INNER JOIN filtered_items    T3 ON T3."code" = T0."itemCode"
        WHERE T0."deletedAt" IS NULL
        GROUP BY T0."itemCode"
    )
    --* main query joins pre-aggregated + pre-filtered results
    --* no heavy group by on full dataset
    SELECT
        T3."code",
        T3."ItemCode",
        T3."ItemName",
        T3."FirmName",
        T3."ItmsGrpNam",
        T3."Price",
        T3."notes",
        T3."isActive",
        T3."syncStatus",
        T7."totalStockIn",
        T7."totalStockOut",
        T7."totalStock"
    FROM filtered_items T3
    INNER JOIN aggregated T7 ON T7."itemCode" = T3."code"
    ORDER BY T3."code" ASC;
END;
$$;

SELECT * FROM fn_get_pitems_consolidated_details_1_1();
SELECT * FROM fn_get_pitems_consolidated_details_1_1(p_project_name := 'Adesto');