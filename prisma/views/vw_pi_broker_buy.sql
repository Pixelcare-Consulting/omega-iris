--* Create view for project item brokey buy
CREATE OR REPLACE VIEW "vw_pi_broker_buy" AS
SELECT 
    T0.*,
	T4."ItemName",
	T4."ItemCode",
    T4."FirmCode",
    T4."FirmName",
    T4."ItmsGrpCod",
    T4."ItmsGrpNam",
	T4."Price"
FROM "ProjectItem" T0
JOIN "ProjectIndividual" T1 ON T1."code" = T0."projectIndividualCode"
JOIN "ProjectGroup" T3 ON T3."code" = T1."groupCode"
JOIN "Item" T4 ON T4."code" = T0."itemCode"
WHERE T3."name" = 'Broker Buy';