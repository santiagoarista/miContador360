import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { InputGroup, InputGroupAddon } from "../components/ui/input-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function Income() {
  const [loading, setLoading] = useState(false);
  const [incomeList, setIncomeList] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const isSubmittingRef = useRef(false);
  const lastSubmitRef = useRef({ signature: "", time: 0 });
  const [selectedStock, setSelectedStock] = useState(null);
  const duplicateWindowMs = 5000;

  const [formData, setFormData] = useState({
    income_date: new Date().toISOString().split("T")[0],
    client_name: "",
    concept: "Servicios",
    detail: "",
    quantity: 1,
    value: 0,
    iva: 0,
    discount: 0,
    payment_method: "efectivo",
    inventory_id: null,
  });

  useEffect(() => {
    fetchIncomeData();
    fetchInventories();
    fetchClients();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchInventories();
      if (formData.inventory_id) {
        fetchSelectedStock(formData.inventory_id);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [formData.inventory_id]);

  useEffect(() => {
    if (!showForm || !formData.inventory_id) return;
    fetchSelectedStock(formData.inventory_id);
  }, [showForm, formData.inventory_id]);

  const fetchClients = async () => {
    console.log("[Income] Fetching clients...");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("third_parties")
        .select("id, full_name")
        .eq("user_id", user.id)
        .eq("classification", "Cliente")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("[Income] Error fetching clients:", error);
      } else {
        console.log("[Income] Clients fetched:", data);
        setClients(data || []);
      }
    } catch (err) {
      console.error("[Income] Unexpected error fetching clients:", err);
    }
  };

  const fetchInventories = async () => {
    console.log("[Income] Fetching inventories...");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("[Income] Error fetching inventories:", error);
      } else {
        console.log("[Income] Inventories fetched:", data);
        setInventories(data || []);
      }
    } catch (err) {
      console.error("[Income] Unexpected error:", err);
    }
  };

  const fetchIncomeData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("income")
        .select("*")
        .eq("user_id", user.id)
        .order("income_date", { ascending: false });

      if (error) throw error;

      setIncomeList(data || []);
    } catch (error) {
      console.error("[Income] Error fetching income:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "quantity" ||
        name === "value" ||
        name === "iva" ||
        name === "discount"
          ? name === "value"
            ? Math.round(parseFloat(value) || 0)
            : parseFloat(value) || 0
          : value,
    });
  };

  const calculateTotal = () => {
    const subtotal = formData.quantity * formData.value;
    const total = subtotal + formData.iva - formData.discount;
    return { subtotal, total };
  };

  const recalculateInventoryAssets = async (userId) => {
    try {
      const { data: allItems, error: fetchError } = await supabase
        .from("inventory")
        .select("stock, purchase_value")
        .eq("user_id", userId);

      if (fetchError) {
        console.error(
          "[Income] Error fetching inventory for assets update:",
          fetchError,
        );
        return;
      }

      const totalInventoryValue = (allItems || []).reduce((sum, item) => {
        const stock = Number(item.stock) || 0;
        const purchaseValue = Number(item.purchase_value) || 0;
        return sum + stock * purchaseValue;
      }, 0);

      const { error: updateError } = await supabase.from("assets").upsert(
        {
          user_id: userId,
          inventarios: totalInventoryValue,
        },
        { onConflict: "user_id" },
      );

      if (updateError) {
        console.error("[Income] Error updating inventory assets:", updateError);
      } else {
        console.log("[Income] Inventory assets recalculated successfully");
      }
    } catch (error) {
      console.error(
        "[Income] Unexpected error recalculating inventory assets:",
        error,
      );
    }
  };

  const logInventorySnapshot = async (label, productId) => {
    const { data, error } = await supabase
      .from("inventory")
      .select("stock")
      .eq("id", productId)
      .single();

    if (error) {
      console.error("[Income] Error reading stock snapshot:", error);
      return;
    }

    console.log(`[Income] ${label} - Stock snapshot:`, data?.stock ?? null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const normalizePaymentMethod = (method) =>
        (method || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      const createBaseAssets = (currentAssets) =>
        currentAssets
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      if (formData.concept === "Productos" && !formData.inventory_id) {
        alert("Selecciona un producto del inventario para registrar la venta");
        setLoading(false);
        return;
      }

      const { subtotal, total } = calculateTotal();

      const submitSignature = JSON.stringify({
        editingId,
        concept: formData.concept,
        inventory_id: formData.inventory_id,
        quantity: formData.quantity,
        value: formData.value,
        iva: formData.iva,
        discount: formData.discount,
        payment_method: formData.payment_method,
        client_name: formData.client_name,
        income_date: formData.income_date,
        total,
      });

      const storedSignature = sessionStorage.getItem("income:lastSignature");
      const storedTime = parseInt(
        sessionStorage.getItem("income:lastTime") || "0",
        10,
      );

      if (
        storedSignature === submitSignature &&
        Date.now() - storedTime < duplicateWindowMs
      ) {
        isSubmittingRef.current = false;
        setLoading(false);
        return;
      }

      if (
        lastSubmitRef.current.signature === submitSignature &&
        Date.now() - lastSubmitRef.current.time < 1500
      ) {
        isSubmittingRef.current = false;
        setLoading(false);
        return;
      }

      lastSubmitRef.current = {
        signature: submitSignature,
        time: Date.now(),
      };

      sessionStorage.setItem("income:lastSignature", submitSignature);
      sessionStorage.setItem("income:lastTime", Date.now().toString());

      console.log("[Income] Processing income with concept:", formData.concept);
      console.log("[Income] Payment method:", formData.payment_method);
      console.log("[Income] Inventory ID:", formData.inventory_id);

      // Si es un producto, manejar el stock ANTES de insertar/actualizar el ingreso
      let stockUpdated = false;
      let oldQuantity = 0;
      let oldInventoryId = null;
      let expectedStockAfterSale = null;

      if (formData.concept === "Productos" && formData.inventory_id) {
        await logInventorySnapshot("Before sale", formData.inventory_id);

        // Obtener datos del producto del inventario
        const { data: product, error: productError } = await supabase
          .from("inventory")
          .select("purchase_value, stock")
          .eq("id", formData.inventory_id)
          .single();

        if (productError) {
          console.error("[Income] Error fetching product:", productError);
          throw productError;
        }

        console.log("[Income] Product data:", product);

        if (selectedStock !== null && product.stock !== selectedStock) {
          alert(
            `El stock cambio de ${selectedStock} a ${product.stock} antes de guardar. Se actualizara el valor disponible.`,
          );
          setSelectedStock(product.stock);
        }

        // Si estamos editando, obtener datos del ingreso anterior
        if (editingId) {
          const { data: oldIncome } = await supabase
            .from("income")
            .select("quantity, inventory_id, concept")
            .eq("id", editingId)
            .single();

          if (oldIncome && oldIncome.concept === "Productos") {
            oldQuantity = oldIncome.quantity;
            oldInventoryId = oldIncome.inventory_id;

            // Si es el mismo producto, restaurar el stock anterior primero
            if (oldInventoryId === formData.inventory_id) {
              const restoredStock = product.stock + oldQuantity;
              console.log(
                "[Income] Restoring previous stock. Old quantity:",
                oldQuantity,
                "Current stock:",
                product.stock,
                "Restored stock:",
                restoredStock,
              );

              const { error: restoreError } = await supabase
                .from("inventory")
                .update({ stock: restoredStock })
                .eq("id", formData.inventory_id);

              if (restoreError) {
                console.error("[Income] Error restoring stock:", restoreError);
                throw restoreError;
              }

              // Actualizar el stock a usar
              product.stock = restoredStock;
            }
          }
        }

        // Validar que hay suficiente stock
        if (product.stock < formData.quantity) {
          alert(`No hay suficiente stock. Stock disponible: ${product.stock}`);
          setLoading(false);
          return;
        }

        // Actualizar el stock del producto en inventario
        const newStock = product.stock - formData.quantity;
        expectedStockAfterSale = newStock;
        console.log("[Income] Updating product stock to:", newStock);

        const { error: updateStockError } = await supabase
          .from("inventory")
          .update({ stock: newStock })
          .eq("id", formData.inventory_id);

        if (updateStockError) {
          console.error(
            "[Income] Error updating product stock:",
            updateStockError,
          );
          throw updateStockError;
        }

        console.log("[Income] Product stock updated successfully");
        stockUpdated = true;

        await logInventorySnapshot("After sale", formData.inventory_id);

        // Si estamos editando y el producto anterior era diferente, restaurar su stock
        if (
          editingId &&
          oldInventoryId &&
          oldInventoryId !== formData.inventory_id
        ) {
          const { data: oldProduct, error: oldProductError } = await supabase
            .from("inventory")
            .select("stock")
            .eq("id", oldInventoryId)
            .single();

          if (!oldProductError && oldProduct) {
            await supabase
              .from("inventory")
              .update({ stock: oldProduct.stock + oldQuantity })
              .eq("id", oldInventoryId);
            console.log(
              "[Income] Restored stock for previous product:",
              oldInventoryId,
            );
          }
        }
      }

      // Variables para manejar activos
      let oldTotal = 0;
      let oldPaymentMethod = "";
      let oldConcept = null;
      let shouldUpdateAssets = false;
      let shouldRecalculateInventoryAssets = false;

      if (editingId) {
        // Obtener el registro anterior para saber la cantidad anterior
        const { data: oldIncome } = await supabase
          .from("income")
          .select("quantity, inventory_id, total, payment_method, concept")
          .eq("id", editingId)
          .single();

        if (oldIncome) {
          oldTotal = oldIncome.total;
          oldPaymentMethod = oldIncome.payment_method;
          oldConcept = oldIncome.concept;
          if (oldConcept === "Productos") {
            shouldRecalculateInventoryAssets = true;
          }
        }

        // Actualizar registro existente
        const { error } = await supabase
          .from("income")
          .update({
            ...formData,
            subtotal,
            total,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Restar el valor anterior de los activos
        const oldMethod = normalizePaymentMethod(oldPaymentMethod);

        if (
          oldMethod === "efectivo" ||
          oldMethod === "transferencia bancaria" ||
          oldMethod === "cuenta por cobrar"
        ) {
          const { data: currentAssets, error: assetsError } = await supabase
            .from("assets")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (assetsError && assetsError.code !== "PGRST116") {
            console.error("[Income] Error fetching assets:", assetsError);
            throw assetsError;
          }

          const baseAssets = createBaseAssets(currentAssets);
          const restoreData = {};

          if (oldMethod === "efectivo") {
            restoreData.efectivo = baseAssets.efectivo - oldTotal;
          } else if (oldMethod === "transferencia bancaria") {
            restoreData.bancos = baseAssets.bancos - oldTotal;
          } else if (oldMethod === "cuenta por cobrar") {
            restoreData.clientes = baseAssets.clientes - oldTotal;
          }

          await supabase.from("assets").upsert(
            {
              user_id: user.id,
              ...baseAssets,
              ...restoreData,
            },
            { onConflict: "user_id" },
          );
        }

        shouldUpdateAssets = true;
      } else {
        // Crear nuevo registro
        const { error: incomeError } = await supabase.from("income").insert({
          user_id: user.id,
          ...formData,
          subtotal,
          total,
        });

        if (incomeError) throw incomeError;
        shouldUpdateAssets = true;

        // Si es un producto y ya actualizamos el stock, verificar que no haya un trigger que lo haya restado de nuevo
        if (
          formData.concept === "Productos" &&
          formData.inventory_id &&
          stockUpdated &&
          expectedStockAfterSale !== null
        ) {
          const { data: verifyProduct, error: verifyError } = await supabase
            .from("inventory")
            .select("stock")
            .eq("id", formData.inventory_id)
            .single();

          if (!verifyError && verifyProduct) {
            if (verifyProduct.stock !== expectedStockAfterSale) {
              console.warn(
                `[Income] Stock mismatch detected! Expected: ${expectedStockAfterSale}, Actual: ${verifyProduct.stock}. Possible database trigger detected. Correcting...`,
              );
              // Corregir el stock si un trigger lo modificó incorrectamente
              await supabase
                .from("inventory")
                .update({ stock: expectedStockAfterSale })
                .eq("id", formData.inventory_id);
              console.log(
                "[Income] Stock corrected to:",
                expectedStockAfterSale,
              );
            }
          }
        }
      }

      if (formData.concept === "Productos" && stockUpdated) {
        shouldRecalculateInventoryAssets = true;
      }

      if (shouldRecalculateInventoryAssets) {
        await recalculateInventoryAssets(user.id);
      }

      // Agregar ingresos a activos según método de pago (solo si es nuevo o si cambió el total/método)
      const methodNew = normalizePaymentMethod(formData.payment_method);

      if (
        shouldUpdateAssets &&
        (methodNew === "efectivo" ||
          methodNew === "transferencia bancaria" ||
          methodNew === "cuenta por cobrar")
      ) {
        console.log("[Income] Adding income to assets...");

        // Obtener activos actuales
        const { data: currentAssets, error: assetsError } = await supabase
          .from("assets")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (assetsError && assetsError.code !== "PGRST116") {
          console.error("[Income] Error fetching assets:", assetsError);
          throw assetsError;
        }

        console.log("[Income] Current assets:", currentAssets);

        const baseAssets = createBaseAssets(currentAssets);

        // Actualizar el activo correspondiente según el método de pago
        const updateData = {};
        if (methodNew === "efectivo") {
          updateData.efectivo = baseAssets.efectivo + total;
          console.log("[Income] New cash balance:", updateData.efectivo);
        } else if (methodNew === "transferencia bancaria") {
          updateData.bancos = baseAssets.bancos + total;
          console.log("[Income] New bank balance:", updateData.bancos);
        } else if (methodNew === "cuenta por cobrar") {
          updateData.clientes = baseAssets.clientes + total;
          console.log(
            "[Income] New accounts receivable balance:",
            updateData.clientes,
          );
        }

        // Actualizar activos
        const { error: updateAssetsError } = await supabase
          .from("assets")
          .upsert(
            {
              user_id: user.id,
              ...baseAssets,
              ...updateData,
            },
            { onConflict: "user_id" },
          );

        if (updateAssetsError) {
          console.error("[Income] Error updating assets:", updateAssetsError);
          throw updateAssetsError;
        }

        console.log("[Income] Assets updated successfully with income");
      }

      setFormData({
        income_date: new Date().toISOString().split("T")[0],
        client_name: "",
        concept: "Servicios",
        detail: "",
        quantity: 1,
        value: 0,
        iva: 0,
        discount: 0,
        payment_method: "efectivo",
        inventory_id: null,
      });
      setSelectedStock(null);

      setShowForm(false);
      setEditingId(null);
      fetchIncomeData();
      fetchInventories();
    } catch (error) {
      console.error("[Income] Error saving income:", error);
      alert("Error al guardar el ingreso: " + error.message);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleEdit = (income) => {
    console.log("[Income] Editing income:", income);
    setFormData({
      income_date: income.income_date,
      client_name: income.client_name,
      concept: income.concept,
      detail: income.detail || "",
      quantity: income.quantity,
      value: income.value,
      iva: income.iva,
      discount: income.discount,
      payment_method: income.payment_method,
      inventory_id: income.inventory_id,
    });
    setEditingId(income.id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      income_date: new Date().toISOString().split("T")[0],
      client_name: "",
      concept: "Servicios",
      detail: "",
      quantity: 1,
      value: 0,
      iva: 0,
      discount: 0,
      payment_method: "efectivo",
      inventory_id: null,
    });
    setEditingId(null);
    setSelectedStock(null);
    setShowForm(false);
  };

  const handleNewIncome = () => {
    fetchInventories();
    setFormData({
      income_date: new Date().toISOString().split("T")[0],
      client_name: "",
      concept: "Servicios",
      detail: "",
      quantity: 1,
      value: 0,
      iva: 0,
      discount: 0,
      payment_method: "efectivo",
      inventory_id: null,
    });
    setEditingId(null);
    setSelectedStock(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este ingreso?")) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: income, error: incomeError } = await supabase
        .from("income")
        .select("concept, inventory_id, quantity")
        .eq("id", id)
        .single();

      if (incomeError) throw incomeError;

      // Guardar el stock esperado antes de eliminar
      let expectedStockAfterDelete = null;

      if (income?.concept === "Productos" && income.inventory_id) {
        const { data: product, error: productError } = await supabase
          .from("inventory")
          .select("stock")
          .eq("id", income.inventory_id)
          .single();

        if (productError) throw productError;

        // Calcular el stock esperado después de eliminar
        expectedStockAfterDelete = (product?.stock || 0) + income.quantity;
        console.log(
          "[Income] Before delete - Current stock:",
          product.stock,
          "Quantity to restore:",
          income.quantity,
          "Expected stock after delete:",
          expectedStockAfterDelete,
        );

        // Actualizar el stock manualmente
        await supabase
          .from("inventory")
          .update({ stock: expectedStockAfterDelete })
          .eq("id", income.inventory_id);

        console.log(
          "[Income] Stock restored manually to:",
          expectedStockAfterDelete,
        );
      }

      // Eliminar el registro
      const { error } = await supabase.from("income").delete().eq("id", id);
      if (error) throw error;

      // Si es un producto, verificar que no haya un trigger que haya sumado el stock de nuevo
      if (
        income?.concept === "Productos" &&
        income.inventory_id &&
        expectedStockAfterDelete !== null
      ) {
        const { data: verifyProduct, error: verifyError } = await supabase
          .from("inventory")
          .select("stock")
          .eq("id", income.inventory_id)
          .single();

        if (!verifyError && verifyProduct) {
          if (verifyProduct.stock !== expectedStockAfterDelete) {
            console.warn(
              `[Income] Stock mismatch after delete! Expected: ${expectedStockAfterDelete}, Actual: ${verifyProduct.stock}. Possible database trigger detected. Correcting...`,
            );
            // Corregir el stock si un trigger lo modificó incorrectamente
            await supabase
              .from("inventory")
              .update({ stock: expectedStockAfterDelete })
              .eq("id", income.inventory_id);
            console.log(
              "[Income] Stock corrected to:",
              expectedStockAfterDelete,
            );
          }
        }
      }

      if (income?.concept === "Productos" && income.inventory_id) {
        await recalculateInventoryAssets(user.id);
      }

      fetchIncomeData();
    } catch (error) {
      console.error("[Income] Error deleting income:", error);
      alert("Error al eliminar el ingreso");
    }
  };

  const fetchSelectedStock = async (productId) => {
    const { data, error } = await supabase
      .from("inventory")
      .select("concept, sale_price, stock")
      .eq("id", productId)
      .single();

    if (error) {
      console.error("[Income] Error fetching product stock:", error);
      return;
    }

    if (data) {
      setFormData((prev) => ({
        ...prev,
        inventory_id: productId,
        value: Math.round(data.sale_price),
        detail: data.concept,
      }));
    }

    setSelectedStock(data?.stock ?? null);
  };

  const handleProductSelect = (productId) => {
    console.log("[Income] Product selected:", productId);
    const selectedProduct = inventories.find((p) => p.id === productId);
    if (selectedProduct) {
      console.log("[Income] Selected product data:", selectedProduct);
    }

    fetchSelectedStock(productId);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ingresos</h1>
        <Button onClick={handleNewIncome} size="sm" className="px-2 sm:px-4">
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Nuevo Ingreso</span>
        </Button>
      </div>
      <main>
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Ingreso" : "Registrar Nuevo Ingreso"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="income_date">Fecha</Label>
                    <Input
                      id="income_date"
                      name="income_date"
                      type="date"
                      value={formData.income_date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="client_name">Cliente</Label>
                    <Select
                      value={formData.client_name}
                      onValueChange={(value) =>
                        setFormData({ ...formData, client_name: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.full_name}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="concept">Concepto</Label>
                    <Select
                      value={formData.concept}
                      onValueChange={(value) => {
                        const nextData = { ...formData, concept: value };
                        if (value !== "Productos") {
                          nextData.inventory_id = null;
                        }
                        setFormData(nextData);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Servicios">Servicios</SelectItem>
                        <SelectItem value="Productos">Productos</SelectItem>
                        <SelectItem value="Salarios">Salarios</SelectItem>
                        <SelectItem value="Otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.concept === "Productos" && (
                    <div>
                      <Label htmlFor="product_selector">
                        Seleccionar Producto
                      </Label>
                      <Select
                        value={formData.inventory_id || ""}
                        onValueChange={handleProductSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventories.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.concept} -{" "}
                              {formatCurrency(product.sale_price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.inventory_id && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Precio sugerido: {formatCurrency(formData.value)}
                        </p>
                      )}
                      {formData.inventory_id && selectedStock !== null && (
                        <p className="text-sm text-muted-foreground">
                          Stock disponible: {selectedStock}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="payment_method">Método de Pago</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) =>
                        setFormData({ ...formData, payment_method: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia bancaria">
                          Transferencia Bancaria
                        </SelectItem>
                        <SelectItem value="cuenta por cobrar">
                          Cuenta por Cobrar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="value">Valor Unitario</Label>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">$</InputGroupAddon>
                      <Input
                        id="value"
                        name="value"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={formData.value}
                        onChange={handleChange}
                        required
                      />
                    </InputGroup>
                  </div>

                  <div>
                    <Label htmlFor="iva">IVA</Label>
                    <Input
                      id="iva"
                      name="iva"
                      type="number"
                      min="0"
                      placeholder="$ 0"
                      value={formData.iva}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="discount">Descuento</Label>
                    <Input
                      id="discount"
                      name="discount"
                      type="number"
                      min="0"
                      placeholder="$ 0"
                      value={formData.discount}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="detail">Detalle</Label>
                  <Input
                    id="detail"
                    name="detail"
                    value={formData.detail}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Subtotal: {formatCurrency(calculateTotal().subtotal)}
                    </p>
                    <p className="text-lg font-bold">
                      Total: {formatCurrency(calculateTotal().total)}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading
                        ? "Guardando..."
                        : editingId
                          ? "Actualizar"
                          : "Guardar"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Historial de Ingresos</CardTitle>
            <CardDescription>
              Total:{" "}
              {formatCurrency(
                incomeList.reduce((sum, item) => sum + item.total, 0),
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {incomeList.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{income.client_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {income.concept} - {income.income_date}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {income.detail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">
                      {formatCurrency(income.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {income.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(income)}
                    >
                      <Edit className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(income.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
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
