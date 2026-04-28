--* Create view for work order status
CREATE OR REPLACE VIEW "vw_work_order_status" AS
SELECT *
FROM (
    VALUES
        ('1', 'Open'),
        ('2', 'Pending'),
        ('3', 'In Process'),
        ('4', 'Verified'),
        ('5', 'Partial Delivery'),
        ('6', 'Delivered'),
        ('7', 'Cancelled'),
        ('8', 'Deleted')
) AS t(value, name);