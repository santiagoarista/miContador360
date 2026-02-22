-- Allow "cuenta por cobrar" as payment method for income (fixes income_payment_method_check error)
ALTER TABLE income
  DROP CONSTRAINT IF EXISTS income_payment_method_check;

ALTER TABLE income
  ADD CONSTRAINT income_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN (
      'efectivo',
      'transferencia bancaria',
      'cuenta por cobrar'
    )
  );
