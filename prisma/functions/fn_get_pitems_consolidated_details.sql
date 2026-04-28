--* Get consolidate project item with item details and total stock, totalStockIn, totalStockOut
CREATE OR REPLACE FUNCTION fn_get_pitems_consolidated_details(
    p_project_name       TEXT DEFAULT NULL,
    p_project_group_name TEXT DEFAULT NULL,
    p_mpn                TEXT DEFAULT NULL,
    p_description        TEXT DEFAULT NULL,
    p_manufacturer       TEXT DEFAULT NULL
)
RETURNS TABLE (
    "code"           INT,
    "ItemCode"       TEXT,
    "ItemName"       TEXT,
    "FirmCode"       INT,
    "FirmName"       TEXT,
    "ItmsGrpCod"     INT,
    "ItmsGrpNam"     TEXT,
    "Price"          DECIMAL,
    "notes"          TEXT,
    "isActive"       BOOLEAN,
    "syncStatus"     TEXT,
    "createdAt"      TIMESTAMP,
    "updatedAt"      TIMESTAMP,
    "deletedAt"      TIMESTAMP,
    "createdBy"      TEXT,
    "updatedBy"      TEXT,
    "deletedBy"      TEXT,
    "totalStockIn"   DECIMAL,
    "totalStockOut"  DECIMAL,
    "totalStock"     DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
		T3."code",
        T3."ItemCode",
        T3."ItemName",
        T3."FirmCode",
        T3."FirmName",
        T3."ItmsGrpCod",
        T3."ItmsGrpNam",
        T3."Price",
        T3."notes",                         
        T3."isActive",
        T3."syncStatus",
		T3."createdAt",
        T3."updatedAt",
        T3."deletedAt",
        CONCAT_WS(' ', T4."fname", T4."lname")             AS "createdBy",  --* user full name
        CONCAT_WS(' ', T5."fname", T5."lname")             AS "updatedBy",  --* user full name
        CONCAT_WS(' ', T6."fname", T6."lname")             AS "deletedBy",  --* user full name
		COALESCE(SUM(T0."stockIn"), 0) AS "totalStockIn",
		COALESCE(SUM(T0."stockOut"), 0) AS "totalStockOut",
		COALESCE(SUM(T0."totalStock"), 0) AS "totalStock"
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
        ON T4."id" = T3."createdBy"
        AND T4."deletedAt" IS NULL
    LEFT JOIN "User" T5                                    --* updatedBy user
        ON T5."id" = T3."updatedBy"
        AND T5."deletedAt" IS NULL
    LEFT JOIN "User" T6                                    --* deletedBy user
        ON T6."id" = T3."deletedBy"
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
	GROUP BY
        T3."code",
        T3."ItemCode",
		T3."ItemName",
        T3."FirmCode",
        T3."FirmName",
        T3."ItmsGrpCod",
        T3."ItmsGrpNam",
        T3."Price",
        T3."notes",
        T3."isActive",
        T3."syncStatus",
		T3."createdAt",
        T3."updatedAt",
        T3."deletedAt",
		CONCAT_WS(' ', T4."fname", T4."lname"),   			
        CONCAT_WS(' ', T5."fname", T5."lname"),            
        CONCAT_WS(' ', T6."fname", T6."lname")            
	ORDER BY T3."code";	
END;
$$;


SELECT * FROM fn_get_pitems_consolidated_details();
SELECT * FROM fn_get_pitems_consolidated_details(p_project_name := 'Adesto');