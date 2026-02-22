import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";

export default function Inventory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    concept: "",
    quantity: 0,
    purchase_value: 0,
    profit_margin: 0,
    sale_price: 0,
    stock: 0,
    supplier_id: "",
    supplier_name: "",
    payment_method: "Efectivo",
  });

  useEffect(() => {
    fetchInventoryData();
    fetchSuppliersData();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchInventoryData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const fetchSuppliersData = async () => {
    console.log("[Inventory] Fetching suppliers data...");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("[Inventory] User ID:", user?.id);

      if (!user) return;

      const { data, error } = await supabase
        .from("third_parties")
        .select("id, full_name, classification")
        .eq("user_id", user.id)
        .eq("classification", "Proveedor")
        .order("full_name", { ascending: true });

      console.log("[Inventory] Suppliers data fetched:", data);

      if (error) throw error;

      setSuppliers(data || []);
    } catch (error) {
      console.error("[Inventory] Error fetching suppliers:", error);
    }
  };

  const fetchInventoryData = async () => {
    console.log("[Inventory] Fetching inventory data...");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("[Inventory] User ID:", user?.id);

      if (!user) return;

      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("[Inventory] Inventory data fetched:", data);

      if (error) throw error;

      setInventoryList(data || []);
    } catch (error) {
      console.error("[Inventory] Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isNumericField = [
      "quantity",
      "purchase_value",
      "profit_margin",
      "stock",
    ].includes(name);
    const parsedValue = isNumericField ? parseFloat(value) || 0 : value;
    const nextValue = isNumericField ? Math.max(0, parsedValue) : parsedValue;

    const newFormData = {
      ...formData,
      [name]: nextValue,
    };

    // Calculate sale price based on purchase value and profit margin
    if (name === "purchase_value" || name === "profit_margin") {
      const purchaseValue =
        name === "purchase_value"
          ? parseFloat(value) || 0
          : newFormData.purchase_value;
      const profitMargin =
        name === "profit_margin"
          ? parseFloat(value) || 0
          : newFormData.profit_margin;

      if (purchaseValue > 0 && profitMargin >= 0) {
        newFormData.sale_price = purchaseValue / (1 - profitMargin / 100);
      }

      console.log("[Inventory] Calculation:", {
        purchaseValue,
        profitMargin,
        salePrice: newFormData.sale_price,
        formula: `${purchaseValue} / (1 - ${profitMargin}/100) = ${newFormData.sale_price}`,
      });
    }

    setFormData(newFormData);
  };

  const handleSupplierChange = (supplierId) => {
    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    setFormData({
      ...formData,
      supplier_id: supplierId,
      supplier_name: selectedSupplier ? selectedSupplier.full_name : "",
    });
  };

  const updateInventoryAssets = async (
    userId,
    oldItem,
    newItem,
    paymentMethod,
  ) => {
    try {
      const normalizePaymentMethod = (method) =>
        (method || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      const getItemAmount = (item) => {
        if (!item) return 0;
        const stock = Number(item.stock) || 0;
        const purchaseValue = Number(item.purchase_value) || 0;
        return stock * purchaseValue;
      };

      const adjustAssetsForPayment = (assets, method, amount) => {
        if (!amount || !method) return;
        if (method === "efectivo") {
          assets.efectivo = (assets.efectivo || 0) - amount;
        } else if (method === "transferencia bancaria") {
          assets.bancos = (assets.bancos || 0) - amount;
        }
      };

      const adjustLiabilitiesForCredit = (liabilities, amount) => {
        if (!amount) return;
        liabilities.proveedores = (liabilities.proveedores || 0) + amount;
      };

      const methodNew = normalizePaymentMethod(
        paymentMethod || newItem?.payment_method,
      );
      const methodOld = normalizePaymentMethod(oldItem?.payment_method);
      const newAmount = getItemAmount(newItem);
      const oldAmount = getItemAmount(oldItem);

      // Obtener todos los items de inventario para calcular el total
      const { data: allItems, error: fetchError } = await supabase
        .from("inventory")
        .select("stock, purchase_value")
        .eq("user_id", userId);

      if (fetchError) {
        console.error(
          "[Inventory] Error fetching inventory for assets update:",
          fetchError,
        );
        return;
      }

      // Calcular el total del inventario en valor de compra
      const totalInventoryValue = (allItems || []).reduce((sum, item) => {
        const stock = Number(item.stock) || 0;
        const purchaseValue = Number(item.purchase_value) || 0;
        return sum + stock * purchaseValue;
      }, 0);

      console.log("[Inventory] Total inventory value:", totalInventoryValue);

      // Obtener los activos actuales
      const { data: currentAssets, error: assetsError } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (assetsError && assetsError.code !== "PGRST116") {
        console.error(
          "[Inventory] Error fetching current assets:",
          assetsError,
        );
        return;
      }

      const baseAssets = currentAssets
        ? {
            efectivo: currentAssets.efectivo || 0,
            bancos: currentAssets.bancos || 0,
            clientes: currentAssets.clientes || 0,
            inventarios: currentAssets.inventarios || 0,
            vehiculo: currentAssets.vehiculo || 0,
            maquinaria_mobiliario: currentAssets.maquinaria_mobiliario || 0,
            equipo_comunicacion: currentAssets.equipo_comunicacion || 0,
            terreno: currentAssets.terreno || 0,
            casa: currentAssets.casa || 0,
            muebles_enseres: currentAssets.muebles_enseres || 0,
            herramientas: currentAssets.herramientas || 0,
            inversiones: currentAssets.inversiones || 0,
          }
        : {
            efectivo: 0,
            bancos: 0,
            clientes: 0,
            inventarios: 0,
            vehiculo: 0,
            maquinaria_mobiliario: 0,
            equipo_comunicacion: 0,
            terreno: 0,
            casa: 0,
            muebles_enseres: 0,
            herramientas: 0,
            inversiones: 0,
          };

      const nextAssets = {
        ...baseAssets,
        inventarios: totalInventoryValue,
      };

      if (oldItem && newItem) {
        if (methodOld && methodNew && methodOld !== methodNew) {
          adjustAssetsForPayment(nextAssets, methodOld, -oldAmount);
          adjustAssetsForPayment(nextAssets, methodNew, newAmount);
        } else {
          const delta = newAmount - oldAmount;
          adjustAssetsForPayment(nextAssets, methodNew || methodOld, delta);
        }
      } else if (!oldItem && newItem) {
        adjustAssetsForPayment(nextAssets, methodNew, newAmount);
      } else if (oldItem && !newItem) {
        adjustAssetsForPayment(nextAssets, methodOld, -oldAmount);
      }

      // Actualizar o crear activos si no existen
      const { error: updateError } = await supabase
        .from("assets")
        .upsert({ user_id: userId, ...nextAssets });

      if (updateError) {
        console.error(
          "[Inventory] Error updating inventory assets:",
          updateError,
        );
        return;
      }

      const creditMethod = "credito";
      const shouldAdjustLiabilities =
        methodOld === creditMethod || methodNew === creditMethod;

      if (shouldAdjustLiabilities) {
        const { data: currentLiabilities, error: liabilitiesError } =
          await supabase
            .from("liabilities")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (liabilitiesError && liabilitiesError.code !== "PGRST116") {
          console.error(
            "[Inventory] Error fetching current liabilities:",
            liabilitiesError,
          );
          return;
        }

        const baseLiabilities = currentLiabilities
          ? {
              proveedores: currentLiabilities.proveedores || 0,
              obligaciones_financieras:
                currentLiabilities.obligaciones_financieras || 0,
              cuentas_por_pagar: currentLiabilities.cuentas_por_pagar || 0,
              salarios_por_pagar: currentLiabilities.salarios_por_pagar || 0,
            }
          : {
              proveedores: 0,
              obligaciones_financieras: 0,
              cuentas_por_pagar: 0,
              salarios_por_pagar: 0,
            };

        const nextLiabilities = { ...baseLiabilities };

        if (oldItem && newItem) {
          if (methodOld !== methodNew) {
            if (methodOld === creditMethod) {
              adjustLiabilitiesForCredit(nextLiabilities, -oldAmount);
            }
            if (methodNew === creditMethod) {
              adjustLiabilitiesForCredit(nextLiabilities, newAmount);
            }
          } else if (methodNew === creditMethod) {
            const delta = newAmount - oldAmount;
            adjustLiabilitiesForCredit(nextLiabilities, delta);
          }
        } else if (!oldItem && newItem && methodNew === creditMethod) {
          adjustLiabilitiesForCredit(nextLiabilities, newAmount);
        } else if (oldItem && !newItem && methodOld === creditMethod) {
          adjustLiabilitiesForCredit(nextLiabilities, -oldAmount);
        }

        const { error: liabilitiesUpdateError } = await supabase
          .from("liabilities")
          .upsert({ user_id: userId, ...nextLiabilities });

        if (liabilitiesUpdateError) {
          console.error(
            "[Inventory] Error updating liabilities:",
            liabilitiesUpdateError,
          );
        }
      }

      console.log("[Inventory] Inventory assets updated successfully");
    } catch (error) {
      console.error(
        "[Inventory] Unexpected error updating inventory assets:",
        error,
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("[Inventory] Saving inventory item:", formData);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Calcular total basado en stock actual * precio de compra
      const total = formData.stock * formData.purchase_value;

      const { supplier_name, ...restFormData } = formData;
      const inventoryData = {
        user_id: user.id,
        ...restFormData,
        supplier: supplier_name || "",
        total,
      };

      let error;
      let oldItem = null;

      if (editingId) {
        // Obtener el item anterior para calcular la diferencia
        const { data: oldItemData } = await supabase
          .from("inventory")
          .select("stock, purchase_value, payment_method")
          .eq("id", editingId)
          .single();
        oldItem = oldItemData;

        ({ error } = await supabase
          .from("inventory")
          .update(inventoryData)
          .eq("id", editingId));
      } else {
        ({ error } = await supabase.from("inventory").insert(inventoryData));
      }

      if (error) throw error;

      // Actualizar el activo de inventarios con el método de pago
      await updateInventoryAssets(
        user.id,
        oldItem,
        inventoryData,
        formData.payment_method,
      );

      setFormData({
        concept: "",
        quantity: 0,
        purchase_value: 0,
        profit_margin: 0,
        sale_price: 0,
        stock: 0,
        supplier_id: "",
        supplier_name: "",
        payment_method: "Efectivo",
      });

      setShowForm(false);
      setEditingId(null);
      fetchInventoryData();
    } catch (error) {
      console.error("[Inventory] Error saving inventory:", error);
      alert("Error al guardar el inventario");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      concept: item.concept,
      quantity: item.quantity,
      purchase_value: item.purchase_value,
      profit_margin: item.profit_margin,
      sale_price: item.sale_price,
      stock: item.stock,
      supplier_id: item.supplier_id || "",
      supplier_name: item.supplier || "",
      payment_method: item.payment_method || "Efectivo",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este item?")) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const itemToDelete = inventoryList.find((item) => item.id === id) || null;

      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;

      // Actualizar el activo de inventarios después de eliminar
      await updateInventoryAssets(
        user.id,
        itemToDelete,
        null,
        itemToDelete?.payment_method,
      );

      fetchInventoryData();
    } catch (error) {
      console.error("[Inventory] Error deleting inventory:", error);
      alert("Error al eliminar el item");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                Inventario
              </h1>
            </div>
            <Button
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setFormData({
                  concept: "",
                  quantity: 0,
                  purchase_value: 0,
                  profit_margin: 0,
                  sale_price: 0,
                  stock: 0,
                  supplier_id: "",
                  supplier_name: "",
                  payment_method: "Efectivo",
                });
              }}
              size="sm"
              className="flex-shrink-0 px-2 sm:px-4"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Item</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Item" : "Registrar Nuevo Item"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="concept">Concepto</Label>
                    <Input
                      id="concept"
                      name="concept"
                      value={formData.concept}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="supplier_id">Proveedor</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={handleSupplierChange}
                    >
                      <SelectTrigger id="supplier_id">
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="payment_method">Método de Pago</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) =>
                        setFormData({ ...formData, payment_method: value })
                      }
                    >
                      <SelectTrigger id="payment_method">
                        <SelectValue placeholder="Seleccionar método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia Bancaria">
                          Transferencia Bancaria
                        </SelectItem>
                        <SelectItem value="Crédito">Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="purchase_value">Valor de Compra</Label>
                    <Input
                      id="purchase_value"
                      name="purchase_value"
                      type="number"
                      min="0"
                      placeholder="$ 0"
                      value={formData.purchase_value}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="profit_margin">
                      Margen de Ganancia (%)
                    </Label>
                    <Input
                      id="profit_margin"
                      name="profit_margin"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.profit_margin}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="sale_price">Precio de Venta</Label>
                    <Input
                      id="sale_price"
                      name="sale_price"
                      type="number"
                      min="0"
                      value={formData.sale_price.toFixed(2)}
                      readOnly
                      className="bg-slate-100 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock">Stock Actual</Label>
                    <Input
                      id="stock"
                      name="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Inventario</CardTitle>
            <CardDescription>
              Total Inventario:{" "}
              {formatCurrency(
                inventoryList.reduce(
                  (sum, item) => sum + item.stock * item.purchase_value,
                  0,
                ),
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inventoryList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.concept}</p>
                    <p className="text-sm text-muted-foreground">
                      Cantidad: {item.quantity} | Stock: {item.stock}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Compra: {formatCurrency(item.purchase_value)} | Venta:{" "}
                      {formatCurrency(item.sale_price)}
                    </p>
                    {item.supplier && (
                      <p className="text-xs text-muted-foreground">
                        Proveedor: {item.supplier}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">
                      {formatCurrency(item.stock * item.purchase_value)}
                    </p>
                    <p className="text-xs text-green-600">
                      +{item.profit_margin}%
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
