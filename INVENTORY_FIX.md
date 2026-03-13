# Fix para Compra de Inventario - Ajuste de Efectivo y Activos

## Problema Identificado
Cuando se registraba una compra de inventario con pago en efectivo o bancos, el dinero no se restaba del módulo de activos.

## Causa Raíz
El sistema tenía dos campos confusos:
- **Cantidad**: Cantidad comprada
- **Stock Actual**: Inventario disponible

El cálculo del dinero a restar se basaba en **Stock** (que el usuario dejaba en 0), no en **Cantidad** comprada.

## Solución Implementada

### 1. Cambio en el Cálculo del Total
**Antes:**
```javascript
const total = formData.stock * formData.purchase_value;
```

**Después:**
```javascript
const total = formData.quantity * formData.purchase_value;
```

El dinero a pagar ahora se calcula correctamente: **Cantidad Comprada × Precio Unitario**

### 2. Sincronización Automática de Stock para Compras Nuevas
**Antes:**
- El usuario debía llenar manualmente tanto Cantidad como Stock
- Confusión: ¿cuál es cuál? ¿cuál afecta el dinero?

**Después:**
- **Para nuevos items**: `stock = quantity` automáticamente
- **Para editar items**: El usuario puede cambiar el stock (para casos de devoluciones)

### 3. Flujo de Dinero Correcto
Cuando el usuario registra:
- Cantidad: 100 unidades
- Precio: $10.000 por unidad
- Método de Pago: Efectivo

El sistema ahora:
1. ✅ Calcula total: 100 × $10.000 = $1.000.000
2. ✅ Registra stock: 100 unidades
3. ✅ Resta dinero: Efectivo disminuye $1.000.000
4. ✅ Actualiza activos: Inventarios aumenta $1.000.000

## Contabilidad
**Antes (INCORRECTO):**
```
Efectivo: $10.000.000
Inventarios: $0
Total: $10.000.000

Compra inventario por $1.000.000 en efectivo
↓
Efectivo: $10.000.000 (NO CAMBIÓ) ❌
Inventarios: $0 (NO CAMBIÓ) ❌
Total: $10.000.000 (NO CAMBIÓ) ❌
```

**Después (CORRECTO):**
```
Efectivo: $10.000.000
Inventarios: $0
Total: $10.000.000

Compra inventario por $1.000.000 en efectivo
↓
Efectivo: $9.000.000 ✅
Inventarios: $1.000.000 ✅
Total: $10.000.000 ✅ (mismo total, dinero convertido en inventario)
```

## Casos de Uso

### Caso 1: Compra Nueva (Más Común)
1. Vas a Inventario → Nuevo Item
2. Llenas:
   - Concepto: "Widget A"
   - Cantidad: 100
   - Precio: $10.000
   - Método: Efectivo
3. Guardas
4. El sistema automáticamente pone Stock = 100
5. Dinero se resta automáticamente ✅

### Caso 2: Devolución (Editar Item)
Compraste 100, devuelves 20:
1. Editas el item
2. Cambias Stock: 80 (solo cambias el stock, NO la cantidad)
3. El sistema sabe que la compra original fue por 100 × $10.000 = $1.000.000
4. El inventario ahora es 80 × $10.000 = $800.000
5. La diferencia se ajusta automáticamente

## Nota Importante
- **Cantidad** = Unidades compradas (no cambia)
- **Stock Actual** = Unidades en inventario (puede cambiar por devoluciones)
- El dinero afectado se calcula por **Cantidad**, no por Stock

## Próximas Mejoras (Opcional)
- Hacer el campo "Stock" read-only para nuevos items (forzar que sea = Cantidad)
- Añadir una sección de "Ajustes de Inventario" para manejar devoluciones de forma independiente
- Mostrar advertencia si Stock > Cantidad
