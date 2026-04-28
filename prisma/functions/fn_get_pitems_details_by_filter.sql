--* Get project items with item details, project name and project group name by optional filters
CREATE OR REPLACE FUNCTION fn_get_pitems_details_by_filter(
    p_project_name       TEXT DEFAULT NULL,
    p_project_group_name TEXT DEFAULT NULL,
    p_mpn                TEXT DEFAULT NULL,
    p_description        TEXT DEFAULT NULL,
    p_manufacturer       TEXT DEFAULT NULL,
    p_desc               TEXT DEFAULT NULL,
    p_mfr                TEXT DEFAULT NULL
)
RETURNS TABLE (
    --* project item columns
    "id"                    TEXT,
    "code"                  INT,
    "itemCode"              INT,
    "projectIndividualCode" INT,
    "projectName"           TEXT,
    "projectGroupName"      TEXT,
    "warehouseCode"         INT,
    "partNumber"            TEXT,
    "dateCode"              TEXT,
    "countryOfOrigin"       TEXT,
    "lotCode"               TEXT,
    "palletNo"              TEXT,
    "packagingType"         TEXT,
    "spq"                   TEXT,
    "dateReceived"          TIMESTAMP,
    "dateReceivedBy"        INT,
    "cost"                  DECIMAL,
    "stockIn"               DECIMAL,
    "stockOut"              DECIMAL,
    "totalStock"            DECIMAL,
    "siteLocation"          TEXT,
    "subLocation2"          TEXT,
    "subLocation3"          TEXT,
    "notes"                 TEXT,
    "mfr"                   TEXT,
    "desc"                  TEXT,
    --* item columns
    "ItemCode"              TEXT,
    "ItemName"              TEXT,
    "FirmCode"              INT,
    "FirmName"              TEXT,
    "ItmsGrpCod"            INT,
    "ItmsGrpNam"            TEXT,
    "Price"                 DECIMAL,
    "itemNotes"             TEXT,
    "isActive"              BOOLEAN,
    "syncStatus"            TEXT,
    "createdAt"             TIMESTAMP,
    "updatedAt"             TIMESTAMP,
    "deletedAt"             TIMESTAMP,
    "createdBy"             TEXT,
    "updatedBy"             TEXT,
    "deletedBy"             TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        --* project item
        T0."id",
        T0."code",
        T0."itemCode",
        T0."projectIndividualCode",
        T1."name"                          AS "projectName",
        T2."name"                          AS "projectGroupName",
        T0."warehouseCode",
        T0."partNumber",
        T0."dateCode",
        T0."countryOfOrigin",
        T0."lotCode",
        T0."palletNo",
        T0."packagingType",
        T0."spq",
        T0."dateReceived",
        T0."dateReceivedBy",
        T0."cost",
        T0."stockIn",
        T0."stockOut",
        T0."totalStock",
        T0."siteLocation",
        T0."subLocation2",
        T0."subLocation3",
        T0."notes",
        T0."mfr",
        T0."desc",
        --* item
        T3."ItemCode"                       AS "Mpn",
        T3."ItemName",
        T3."FirmCode",
        T3."FirmName",
        T3."ItmsGrpCod",
        T3."ItmsGrpNam",
        T3."Price",
        T3."notes"                         AS "itemNotes",
        T3."isActive",
        T3."syncStatus",
        T0."createdAt",
        T0."updatedAt",
        T0."deletedAt",
        CONCAT_WS(' ', T4."fname", T4."lname")             AS "createdBy",  --* user full name
        CONCAT_WS(' ', T5."fname", T5."lname")             AS "updatedBy",  --* user full name
        CONCAT_WS(' ', T6."fname", T6."lname")             AS "deletedBy"  --* user full name
    FROM "ProjectItem" T0
    INNER JOIN "ProjectIndividual" T1
        ON T1."code" = T0."projectIndividualCode"
        AND T1."deletedAt" IS NULL
    LEFT JOIN "ProjectGroup" T2
        ON T2."code" = T1."groupCode"
        AND T2."deletedAt" IS NULL
    INNER JOIN "Item" T3
        ON T3."code" = T0."itemCode"
        AND T3."deletedAt" IS NULL
    LEFT JOIN "User" T4                                    --* createdBy user
        ON T4."id" = T0."createdBy"
        AND T4."deletedAt" IS NULL
    LEFT JOIN "User" T5                                    --* updatedBy user
        ON T5."id" = T0."updatedBy"
        AND T5."deletedAt" IS NULL
    LEFT JOIN "User" T6                                    --* deletedBy user
        ON T6."id" = T0."deletedBy"
        AND T6."deletedAt" IS NULL
    WHERE
        T0."deletedAt" IS NULL
        --* filter by project name
        AND (p_project_name IS NULL OR T1."name" ILIKE '%' || p_project_name || '%')
        --* filter by project group name
        AND (p_project_group_name IS NULL OR T2."name" ILIKE '%' || p_project_group_name || '%')
        --* filter by mpn
        AND (p_mpn IS NULL OR T3."ItemCode" ILIKE '%' || p_mpn || '%')
        --* filter by description
        AND (p_description IS NULL OR T3."ItemName" ILIKE '%' || p_description || '%')
        --* filter by manufacturer
        AND (p_manufacturer IS NULL OR T3."FirmName" ILIKE '%' || p_manufacturer || '%')
        --* filter by desc (temp column)
        AND (p_desc IS NULL OR T0."desc" ILIKE '%' || p_desc || '%')
        --* filter by mfr (temp column)
        AND (p_mfr IS NULL OR T0."mfr" ILIKE '%' || p_mfr || '%')
ORDER BY T0."code" ASC;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_pitems_details_by_filter();
SELECT * FROM fn_get_pitems_details_by_filter(p_project_name := 'Broker');
SELECT * FROM fn_get_pitems_details_by_filter(p_project_group_name := 'Broker Buy');
SELECT * FROM fn_get_pitems_details_by_filter(p_project_name := 'Broker', p_project_group_name := 'Broker Buy');