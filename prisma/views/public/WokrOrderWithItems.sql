SELECT
  t0.code,
  t0."projectIndividualCode",
  t0."userCode",
  t0.status,
  t0."isInternal",
  t0."customerPo",
  t0."salesOrderCode",
  t0."purchaseOrderCode",
  t0."createdAt",
  t0."updatedAt",
  t1."projectItemCode",
  t1.qty,
  t1."isDelivered",
  t2."itemCode",
  t3."ItemName",
  t3."ItemCode",
  t3."Price"
FROM
  (
    (
      (
        "WorkOrder" t0
        LEFT JOIN "WorkOrderItem" t1 ON ((t1."workOrderCode" = t0.code))
      )
      LEFT JOIN "ProjectItem" t2 ON ((t2.code = t1."projectItemCode"))
    )
    LEFT JOIN "Item" t3 ON ((t3.code = t2."itemCode"))
  );