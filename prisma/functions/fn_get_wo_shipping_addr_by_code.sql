--* Get shipping address by workOrderCode
CREATE OR REPLACE FUNCTION fn_get_wo_shipping_addr_by_code(
    p_work_order_code INT
)
RETURNS TABLE (
    "id"                   TEXT,
    "CardCode"             TEXT,
    "AddressName"          TEXT,
    "AddrType"             TEXT,
    "Street"               TEXT,
    "Address2"             TEXT,
    "Address3"             TEXT,
    "StreetNo"             TEXT,
    "BuildingFloorRoom"    TEXT,
    "Block"                TEXT,
    "City"                 TEXT,
    "ZipCode"              TEXT,
    "County"               TEXT,
    "CountryCode"          TEXT,
    "CountryName"          TEXT,
    "StateCode"            TEXT,
    "StateName"            TEXT,
    "GlobalLocationNumber" TEXT,
    "createdAt"            TIMESTAMP,
    "updatedAt"            TIMESTAMP,
    "deletedAt"            TIMESTAMP,
    "createdBy"            TEXT,
    "updatedBy"            TEXT,
    "deletedBy"            TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        T2."id",
        T2."CardCode",
        T2."AddressName",
        T2."AddrType",
        T2."Street",
        T2."Address2",
        T2."Address3",
        T2."StreetNo",
        T2."BuildingFloorRoom",
        T2."Block",
        T2."City",
        T2."ZipCode",
        T2."County",
        T2."CountryCode",
        T2."CountryName",
        T2."StateCode",
        T2."StateName",
        T2."GlobalLocationNumber",
        T2."createdAt",
        T2."updatedAt",
        T2."deletedAt",
        T2."createdBy",
        T2."updatedBy",
        T2."deletedBy"
    FROM "WorkOrder" T0
    INNER JOIN "User" T1
        ON T1."code" = T0."userCode"
        AND T1."deletedAt" IS NULL
    INNER JOIN "Address" T2
        ON T2."CardCode" = T1."customerCode"   --* match via user customerCode
        AND T2."id" = T0."shippingAddrCode"
        AND T2."AddrType" = 'S'                --* shipping address only
        AND T2."deletedAt" IS NULL
    WHERE
        T0."code" = p_work_order_code
        AND T0."deletedAt" IS NULL;
END;
$$;

--* sample query execution
SELECT * FROM fn_get_wo_shipping_addr_by_code(16);