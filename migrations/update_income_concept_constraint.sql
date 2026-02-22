-- Allow the "Otros" concept in income.
ALTER TABLE income
DROP CONSTRAINT IF EXISTS income_concept_check;

ALTER TABLE income
ADD CONSTRAINT income_concept_check
CHECK (concept IS NULL OR concept IN ('Servicios', 'Productos', 'Salarios', 'Otros'));
