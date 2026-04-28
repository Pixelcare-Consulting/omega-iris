--* Create view for undelivered work orders with status not equal to '6' (Delivered)
CREATE OR REPLACE VIEW "vw_undelivered_wo" AS
SELECT T0.*
FROM "WorkOrder" T0
WHERE T0."status" <> '6'
ORDER BY T0."createdAt" DESC;