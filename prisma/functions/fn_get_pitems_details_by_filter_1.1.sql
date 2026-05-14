--* (Optimized Query) Get project items with item details, project name and project group name by optional filters
CREATE OR REPLACE FUNCTION fn_get_pitems_details_by_filter_1_1(
    p_project_name       TEXT DEFAULT NULL,
    p_project_group_name TEXT DEFAULT NULL,
    p_mpn                TEXT DEFAULT NULL,
    p_description        TEXT DEFAULT NULL,
    p_manufacturer       TEXT DEFAULT NULL,
    p_desc               TEXT DEFAULT NULL,
    p_mfr                TEXT DEFAULT NULL,
    p_part_number        TEXT DEFAULT NULL
)
RETURNS TABLE (
    --* project item columns
    "projectName"           TEXT,
    "projectGroupName"      TEXT,
    "partNumber"            TEXT,
    "dateCode"              TEXT,
    "countryOfOrigin"       TEXT,
    "palletNo"              TEXT,
    "packagingType"         TEXT,
    "spq"                   TEXT,
    "cost"                  DECIMAL,
    "totalStock"            DECIMAL,
    "siteLocation"          TEXT,
    "mfr"                   TEXT,
    "desc"                  TEXT,
    --* item columns
    "Mpn"                   TEXT,
    "ItemName"              TEXT,
    "FirmName"              TEXT,
    "ItmsGrpNam"            TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
     --* return empty if no filters are provided
    IF p_project_name IS NULL AND p_project_group_name IS NULL 
       AND p_mpn IS NULL AND p_description IS NULL 
       AND p_manufacturer IS NULL AND p_desc IS NULL
       AND p_mfr IS NULL AND p_part_number IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH filtered_projects AS (
        --* filter projectindividual + projectgroup first
        --* reduces rows before joining to projectitem
        SELECT 
            T1."code",
            T1."name"  AS "projectName",
            T2."name"  AS "projectGroupName"
        FROM "ProjectIndividual" T1
        LEFT JOIN "ProjectGroup" T2
            ON T2."code" = T1."groupCode"
            AND T2."deletedAt" IS NULL
        WHERE
            T1."deletedAt" IS NULL
            AND (p_project_name IS NULL OR T1."name" ILIKE '%' || p_project_name || '%')
            AND (p_project_group_name IS NULL OR T2."name" ILIKE '%' || p_project_group_name || '%')
    ),
    filtered_items AS (
        --* filter item first
        SELECT 
            T3."code",
            T3."ItemCode",
            T3."ItemName",
            T3."FirmName",
            T3."ItmsGrpNam"
        FROM "Item" T3
        WHERE
            "deletedAt" IS NULL
            AND (p_mpn IS NULL OR T3."ItemCode" ILIKE '%' || p_mpn || '%')
            AND (p_description IS NULL OR T3."ItemName" ILIKE '%' || p_description || '%')
            AND (p_manufacturer IS NULL OR T3."FirmName" ILIKE '%' || p_manufacturer || '%')
    )
    SELECT
        --* project item
        T1."projectName", 
        T1."projectGroupName",
        T0."partNumber",
        T0."dateCode",
        T0."countryOfOrigin",
        T0."palletNo",
        T0."packagingType",
        T0."spq",
        T0."cost",
        T0."totalStock",
        T0."siteLocation",
        T0."mfr",
        T0."desc",
        --* item
        T3."ItemCode"                       AS "Mpn",
        T3."ItemName",
        T3."FirmName",
        T3."ItmsGrpNam"
    FROM "ProjectItem" T0
    --* now join to already-filtered CTEs
    INNER JOIN filtered_projects T1 ON T1."code" = T0."projectIndividualCode"
    INNER JOIN filtered_items T3 ON T3."code" = T0."itemCode"
    WHERE
        T0."deletedAt" IS NULL
        AND (p_desc IS NULL OR T0."desc" ILIKE '%' || p_desc || '%')
        AND (p_mfr IS NULL OR T0."mfr" ILIKE '%' || p_mfr || '%')
        AND (p_part_number IS NULL OR T0."partNumber" ILIKE '%' || p_part_number || '%')
    ORDER BY T0."code" ASC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_pitems_details_by_filter_1_1();
SELECT * FROM fn_get_pitems_details_by_filter_1_1(p_project_name := 'Broker');
SELECT * FROM fn_get_pitems_details_by_filter_1_1(p_project_group_name := 'Broker Buy');
SELECT * FROM fn_get_pitems_details_by_filter_1_1(p_project_name := 'Broker', p_project_group_name := 'Broker Buy');