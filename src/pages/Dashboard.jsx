import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Users,
  Package,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [financialData, setFinancialData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    incomeCount: 0,
    expensesCount: 0,
    totalAssets: 0,
  });
  const [incomeData, setIncomeData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  useEffect(() => {
    fetchUserData();
    fetchFinancialData();
  }, []);

  useEffect(() => {
    const onProfileUpdated = () => fetchUserData();
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Fetch user profile
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error && error.code === "PGRST116") {
          // Profile doesn't exist, create it
          console.log("[Dashboard] Profile doesn't exist, creating...");
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              email: user.email,
            })
            .select()
            .single();

          if (createError) {
            console.error("[Dashboard] Error creating profile:", createError);
          } else if (newProfile) {
            console.log("[Dashboard] Profile created:", newProfile);
            setUserProfile(newProfile);
          }
        } else if (error) {
          console.error("[Dashboard] Error fetching profile:", error);
        } else if (profile) {
          console.log("[Dashboard] Profile loaded:", profile);
          console.log("[Dashboard] Taxpayer type:", profile.taxpayer_type);
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.error("[Dashboard] Error in fetchUserData:", error);
    }
  };

  const fetchFinancialData = async () => {
    console.log("[Dashboard] Fetching financial data...");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch income data
      const { data: incomeData, error: incomeError } = await supabase
        .from("income")
        .select("*")
        .eq("user_id", user.id)
        .order("income_date", { ascending: false });

      console.log("[Dashboard] Income data fetched:", incomeData);

      if (incomeError) {
        console.error("[Dashboard] Income fetch error:", incomeError);
      }

      // Fetch expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });

      console.log("[Dashboard] Expense data fetched:", expensesData);

      if (expensesError) {
        console.error("[Dashboard] Expenses fetch error:", expensesError);
      }

      const totalIncome =
        incomeData?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
      const totalExpenses =
        expensesData?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;

      // Fetch assets data
      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      console.log("[Dashboard] Assets data fetched:", assetsData);

      if (assetsError && assetsError.code !== "PGRST116") {
        console.error("[Dashboard] Assets fetch error:", assetsError);
      }

      const totalAssets = assetsData
        ? Object.entries(assetsData)
          .filter(
            ([key]) =>
              !["id", "user_id", "created_at", "updated_at"].includes(key),
          )
          .reduce((sum, [, value]) => sum + (parseFloat(value) || 0), 0)
        : 0;

      setFinancialData({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        incomeCount: incomeData?.length || 0,
        expensesCount: expensesData?.length || 0,
        totalAssets,
      });

      // Guardar datos de ingresos para cálculos de IVA
      setIncomeData(incomeData || []);

      // Combine recent transactions
      const allTransactions = [
        ...(incomeData || []).slice(0, 5).map((item) => ({
          ...item,
          type: "income",
          date: item.income_date,
          description: item.concept || "Ingreso",
        })),
        ...(expensesData || []).slice(0, 5).map((item) => ({
          ...item,
          type: "expense",
          date: item.expense_date,
          description: item.concept || "Gasto",
        })),
      ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8);

      setRecentTransactions(allTransactions);

      // Calculate monthly data for chart
      const monthlyStats = calculateMonthlyStats(incomeData, expensesData);
      setMonthlyData(monthlyStats);
    } catch (error) {
      console.error("[Dashboard] Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (incomeData, expensesData) => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
    const stats = months.map((month) => ({
      month,
      income: 0,
      expenses: 0,
    }));

    // Calculate based on actual data if available
    if (incomeData && incomeData.length > 0) {
      incomeData.forEach((item) => {
        const monthIndex = new Date(item.income_date).getMonth();
        if (monthIndex < 6) {
          stats[monthIndex].income += item.total || 0;
        }
      });
    }

    if (expensesData && expensesData.length > 0) {
      expensesData.forEach((item) => {
        const monthIndex = new Date(item.expense_date).getMonth();
        if (monthIndex < 6) {
          stats[monthIndex].expenses += item.total || 0;
        }
      });
    }

    return stats;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTaxStatus = () => {
    const status = {
      isRentaDeclarant: false,
      isIvaDeclarant: false,
      messages: [],
      infoMessages: [],
    };

    const taxpayerType = userProfile?.taxpayer_type || "";

    // Calcular ingresos como asalariado vs independiente
    const salaryIncome = incomeData
      .filter((item) => item.concept === "Salarios")
      .reduce((sum, item) => sum + (item.total || 0), 0);

    const independentIncome = incomeData
      .filter((item) => item.concept !== "Salarios")
      .reduce((sum, item) => sum + (item.total || 0), 0);

    // Declarante de renta por ingresos
    if (financialData.totalIncome > 73324000) {
      status.isRentaDeclarant = true;
      status.messages.push({
        type: "warning",
        source: "income",
        text: "⚠️ Eres declarante de renta por ingresos",
      });
    } else {
      const remaining = 73324000 - financialData.totalIncome;
      status.infoMessages.push({
        type: "info",
        source: "income",
        text: `Te faltan ${formatCurrency(remaining)} para ser declarante de renta`,
      });
    }

    // Declarante de IVA por ingresos
    if (taxpayerType === "Asalariado") {
      // Si es asalariado y sus ingresos superan 183.309.000, NO es declarante de IVA
      if (financialData.totalIncome > 183309000) {
        status.messages.push({
          type: "info",
          source: "iva",
          text: "ℹ️ No es declarante de IVA (Asalariado con ingresos superiores a $183.309.000)",
        });
      } else {
        const remaining = 183309000 - financialData.totalIncome;
        status.infoMessages.push({
          type: "info",
          source: "iva",
          text: `Te faltan ${formatCurrency(remaining)} para superar el límite de $183.309.000`,
        });
      }
    } else if (taxpayerType === "Asalariado Independiente") {
      // Si es asalariado independiente:
      // - Si solo tiene ingresos como asalariado (sin ingresos independientes), NO es declarante de IVA aunque supere 183.309.000
      // - Si tiene ingresos independientes que superan el tope, SÍ es declarante de IVA
      if (independentIncome === 0) {
        // Solo tiene ingresos como asalariado
        if (financialData.totalIncome > 183309000) {
          status.messages.push({
            type: "info",
            source: "iva",
            text: "ℹ️ No es declarante de IVA (Asalariado Independiente con solo ingresos salariales superiores a $183.309.000)",
          });
        } else {
          const remaining = 183309000 - financialData.totalIncome;
          status.infoMessages.push({
            type: "info",
            source: "iva",
            text: `Te faltan ${formatCurrency(remaining)} para superar el límite de $183.309.000`,
          });
        }
      } else {
        // Tiene ingresos independientes
        if (independentIncome > 183309000) {
          status.isIvaDeclarant = true;
          status.messages.push({
            type: "warning",
            source: "iva",
            text: "⚠️ Eres declarante de IVA por ingresos independientes",
          });
        } else {
          const remaining = 183309000 - independentIncome;
          status.infoMessages.push({
            type: "info",
            source: "iva",
            text: `Te faltan ${formatCurrency(remaining)} en ingresos independientes para ser declarante de IVA`,
          });
        }
      }
    } else {
      // Para independientes y rentistas de capital
      if (financialData.totalIncome > 183309000) {
        status.isIvaDeclarant = true;
        status.messages.push({
          type: "warning",
          source: "iva",
          text: "⚠️ Eres declarante de IVA por ingresos",
        });
      } else {
        const remaining = 183309000 - financialData.totalIncome;
        status.infoMessages.push({
          type: "info",
          source: "iva",
          text: `Te faltan ${formatCurrency(remaining)} para ser declarante de IVA`,
        });
      }
    }

    // Declarante de renta por activos (umbral 73.324.000)
    if (financialData.totalAssets >= 73324000) {
      if (!status.isRentaDeclarant) {
        status.isRentaDeclarant = true;
      }
      status.messages.push({
        type: "warning",
        source: "assets",
        text: "⚠️ Eres declarante de renta por activos",
      });
    } else {
      const remainingRenta = 73324000 - financialData.totalAssets;
      status.infoMessages.push({
        type: "info",
        source: "assets",
        text: `Te faltan ${formatCurrency(remainingRenta)} en activos para ser declarante de renta`,
      });
    }

    // Declarante de IVA por activos (umbral 183.309.000)
    if (financialData.totalAssets >= 183309000) {
      status.messages.push({
        type: "warning",
        source: "assets",
        text: "⚠️ Eres declarante de IVA por activos",
      });
    } else {
      const remainingIva = 183309000 - financialData.totalAssets;
      status.infoMessages.push({
        type: "info",
        source: "assets",
        text: `Te faltan ${formatCurrency(remainingIva)} en activos para ser declarante de IVA`,
      });
    }

    return status;
  };

  const exportPDF = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      let yPosition = 15;

      // Encabezado
      pdf.setFontSize(20);
      pdf.text("MiContador360", 15, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text("Reporte Financiero Completo", 15, yPosition);
      yPosition += 8;

      // Información del usuario
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Usuario: ${user?.email || "No disponible"}`, 15, yPosition);
      yPosition += 6;
      pdf.text(
        `Fecha: ${new Date().toLocaleDateString("es-CO")}`,
        15,
        yPosition,
      );
      yPosition += 6;
      pdf.text(
        `Hora: ${new Date().toLocaleTimeString("es-CO")}`,
        15,
        yPosition,
      );
      yPosition += 12;

      // Línea divisoria
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);
      yPosition += 8;

      // Resumen Financiero
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.text("RESUMEN FINANCIERO", 15, yPosition);
      yPosition += 10;

      const summaryData = [
        [`Ingresos Totales:`, formatCurrency(financialData.totalIncome)],
        [`Gastos Totales:`, formatCurrency(financialData.totalExpenses)],
        [`Balance:`, formatCurrency(financialData.balance)],
        [`Total Activos:`, formatCurrency(financialData.totalAssets)],
      ];

      pdf.setFontSize(11);
      summaryData.forEach((row) => {
        pdf.setFont(undefined, "normal");
        pdf.text(row[0], 15, yPosition);
        pdf.setFont(undefined, "bold");
        pdf.text(row[1], 120, yPosition, { align: "right" });
        yPosition += 8;
      });

      yPosition += 5;
      pdf.line(15, yPosition, 195, yPosition);
      yPosition += 8;

      // Estado Tributario
      pdf.setFontSize(14);
      pdf.text("ESTADO TRIBUTARIO", 15, yPosition);
      yPosition += 10;

      const taxStatus = getTaxStatus();
      pdf.setFontSize(10);

      if (taxStatus.messages.length > 0) {
        pdf.setTextColor(200, 100, 0);
        taxStatus.messages.forEach((msg) => {
          pdf.text(`• ${msg.text}`, 15, yPosition);
          yPosition += 6;
        });
      }

      if (taxStatus.infoMessages.length > 0) {
        pdf.setTextColor(0, 100, 200);
        taxStatus.infoMessages.forEach((msg) => {
          pdf.text(`• ${msg.text}`, 15, yPosition);
          yPosition += 6;
        });
      }

      yPosition += 5;
      pdf.setTextColor(0, 0, 0);

      // Detalle de Transacciones Recientes
      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 15;
      }

      pdf.setFontSize(14);
      pdf.text("TRANSACCIONES RECIENTES", 15, yPosition);
      yPosition += 10;

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Tipo", 15, yPosition);
      pdf.text("Concepto", 40, yPosition);
      pdf.text("Fecha", 100, yPosition);
      pdf.text("Monto", 160, yPosition, { align: "right" });
      yPosition += 6;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);
      yPosition += 4;

      pdf.setTextColor(0, 0, 0);
      recentTransactions.slice(0, 10).forEach((transaction) => {
        const tipo = transaction.type === "income" ? "Ingreso" : "Gasto";
        const monto =
          transaction.type === "income"
            ? `+${formatCurrency(transaction.total || 0)}`
            : `-${formatCurrency(transaction.total || 0)}`;
        const fecha = new Date(transaction.date).toLocaleDateString("es-CO");

        pdf.text(tipo, 15, yPosition);
        pdf.text(transaction.description, 40, yPosition);
        pdf.text(fecha, 100, yPosition);
        pdf.text(monto, 160, yPosition, { align: "right" });
        yPosition += 6;

        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 15;
        }
      });

      yPosition += 8;

      // Estadísticas Mensuales
      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 15;
      }

      pdf.setFontSize(14);
      pdf.text("INGRESOS VS GASTOS (Últimos 6 Meses)", 15, yPosition);
      yPosition += 10;

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Mes", 15, yPosition);
      pdf.text("Ingresos", 50, yPosition);
      pdf.text("Gastos", 100, yPosition);
      pdf.text("Balance", 150, yPosition);
      yPosition += 6;

      pdf.line(15, yPosition, 195, yPosition);
      yPosition += 4;

      pdf.setTextColor(0, 0, 0);
      monthlyData.forEach((data) => {
        const balance = data.income - data.expenses;
        pdf.text(data.month, 15, yPosition);
        pdf.text(formatCurrency(data.income), 50, yPosition);
        pdf.text(formatCurrency(data.expenses), 100, yPosition);
        pdf.text(formatCurrency(balance), 150, yPosition);
        yPosition += 6;
      });

      // Pie de página
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.text(
          `Página ${i} de ${pageCount}`,
          105,
          pdf.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
      }

      pdf.save(`reporte-financiero-${new Date().getTime()}.pdf`);
      alert("PDF exportado exitosamente");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Error al exportar PDF: " + error.message);
    }
  };

  const exportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Hoja 1: Resumen General
      const resumenData = [
        ["MiContador360 - REPORTE FINANCIERO COMPLETO"],
        [],
        ["Información General"],
        ["Usuario:", user?.email || "No disponible"],
        ["Fecha:", new Date().toLocaleDateString("es-CO")],
        ["Hora:", new Date().toLocaleTimeString("es-CO")],
        [],
        ["RESUMEN FINANCIERO"],
        ["Concepto", "Valor"],
        ["Ingresos Totales", financialData.totalIncome],
        ["Gastos Totales", financialData.totalExpenses],
        ["Balance", financialData.balance],
        ["Total Activos", financialData.totalAssets],
        [],
        ["ESTADO TRIBUTARIO"],
      ];

      const taxStatus = getTaxStatus();
      taxStatus.messages.forEach((msg) => {
        resumenData.push([msg.text]);
      });
      taxStatus.infoMessages.forEach((msg) => {
        resumenData.push([msg.text]);
      });

      const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

      // Hoja 2: Transacciones Recientes
      const transaccionesData = [
        ["TRANSACCIONES RECIENTES"],
        [],
        ["Tipo", "Concepto", "Fecha", "Monto"],
      ];

      recentTransactions.slice(0, 50).forEach((transaction) => {
        const tipo = transaction.type === "income" ? "Ingreso" : "Gasto";
        const monto =
          transaction.type === "income"
            ? transaction.total || 0
            : -(transaction.total || 0);
        const fecha = new Date(transaction.date).toLocaleDateString("es-CO");

        transaccionesData.push([tipo, transaction.description, fecha, monto]);
      });

      const transaccionesSheet = XLSX.utils.aoa_to_sheet(transaccionesData);
      XLSX.utils.book_append_sheet(
        workbook,
        transaccionesSheet,
        "Transacciones",
      );

      // Hoja 3: Estadísticas Mensuales
      const estadisticasData = [
        ["INGRESOS VS GASTOS - ÚLTIMOS 6 MESES"],
        [],
        ["Mes", "Ingresos", "Gastos", "Balance"],
      ];

      monthlyData.forEach((data) => {
        const balance = data.income - data.expenses;
        estadisticasData.push([
          data.month,
          data.income,
          data.expenses,
          balance,
        ]);
      });

      const estadisticasSheet = XLSX.utils.aoa_to_sheet(estadisticasData);
      XLSX.utils.book_append_sheet(workbook, estadisticasSheet, "Estadísticas");

      // Hoja 4: Detalles de Activos (si están disponibles)
      const activosData = [["DETALLE DE ACTIVOS"], []];

      // Aquí puedes agregar detalles de activos si los tienes disponibles

      const activosSheet = XLSX.utils.aoa_to_sheet(activosData);
      XLSX.utils.book_append_sheet(workbook, activosSheet, "Activos");

      // Ajustar ancho de columnas
      resumenSheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
      transaccionesSheet["!cols"] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
      ];
      estadisticasSheet["!cols"] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.writeFile(
        workbook,
        `reporte-financiero-${new Date().getTime()}.xlsx`,
      );

      alert("Excel exportado exitosamente");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Error al exportar Excel: " + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="dashboard-content">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inicio</h1>
        </div>
        {/* Financial Summary Cards - arriba */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ingresos Totales
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : formatCurrency(financialData.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {financialData.incomeCount} registros
              </p>
              {!loading && (
                <div className="mt-3 space-y-2">
                  {getTaxStatus()
                    .messages.filter((message) => message.source !== "assets")
                    .map((message, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs p-2 rounded-md bg-warning/10 border border-warning/30"
                      >
                        <span className="text-warning font-medium">
                          {message.text}
                        </span>
                      </div>
                    ))}
                  {getTaxStatus()
                    .infoMessages.filter(
                      (message) => message.source !== "assets",
                    )
                    .map((message, index) => (
                      <div
                        key={`info-${index}`}
                        className="flex items-center gap-2 text-xs p-2 rounded-md bg-primary/10 border border-primary/30"
                      >
                        <span className="text-primary font-medium">
                          ℹ️ {message.text}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Gastos Totales
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {loading ? "..." : formatCurrency(financialData.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {financialData.expensesCount} registros
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${financialData.balance >= 0 ? "text-primary" : "text-warning"}`}
              >
                {loading ? "..." : formatCurrency(financialData.balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ingresos - Gastos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Activos
              </CardTitle>
              <PieChart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {loading ? "..." : formatCurrency(financialData.totalAssets)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Suma de activos
              </p>
              {!loading && (
                <div className="mt-3 space-y-2">
                  {getTaxStatus()
                    .messages.filter((message) => message.source === "assets")
                    .map((message, index) => (
                      <div
                        key={`asset-${index}`}
                        className="flex items-center gap-2 text-xs p-2 rounded-md bg-warning/10 border border-warning/30"
                      >
                        <span className="text-warning font-medium">
                          {message.text}
                        </span>
                      </div>
                    ))}
                  {getTaxStatus()
                    .infoMessages.filter(
                      (message) => message.source === "assets",
                    )
                    .map((message, index) => (
                      <div
                        key={`asset-info-${index}`}
                        className="flex items-center gap-2 text-xs p-2 rounded-md bg-primary/10 border border-primary/30"
                      >
                        <span className="text-primary font-medium">
                          ℹ️ {message.text}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Clientes
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">
                    {financialData.incomeCount}
                  </h3>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Proveedores
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">
                    {financialData.expensesCount}
                  </h3>
                </div>
                <Package className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Documentos
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">
                    {financialData.incomeCount + financialData.expensesCount}
                  </h3>
                </div>
                <FileText className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Este Mes
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">
                    {new Date().toLocaleDateString("es-CO", { month: "short" })}
                  </h3>
                </div>
                <Calendar className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-3 mb-6">
          <Button onClick={exportPDF} variant="destructive">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button
            onClick={exportExcel}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Charts and Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Ingresos vs Gastos Mensuales</CardTitle>
              <CardDescription>
                Comparación de los últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyData.map((data, index) => {
                  const maxValue = Math.max(
                    ...monthlyData.map((d) => Math.max(d.income, d.expenses)),
                  );
                  const incomeWidth =
                    maxValue > 0 ? (data.income / maxValue) * 100 : 0;
                  const expenseWidth =
                    maxValue > 0 ? (data.expenses / maxValue) * 100 : 0;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {data.month}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(data.income - data.expenses)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-success h-2 rounded-full transition-all duration-500"
                              style={{ width: `${incomeWidth}%` }}
                            />
                          </div>
                          <span className="text-xs text-success font-medium min-w-[80px] text-right">
                            {formatCurrency(data.income)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-destructive h-2 rounded-full transition-all duration-500"
                              style={{ width: `${expenseWidth}%` }}
                            />
                          </div>
                          <span className="text-xs text-destructive font-medium min-w-[80px] text-right">
                            {formatCurrency(data.expenses)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success rounded-full" />
                  <span className="text-sm text-muted-foreground">
                    Ingresos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive rounded-full" />
                  <span className="text-sm text-muted-foreground">
                    Gastos
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Transacciones Recientes</CardTitle>
              <CardDescription>Últimos movimientos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando transacciones...
                  </div>
                ) : recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${transaction.type === "income"
                              ? "bg-success/10"
                              : "bg-destructive/10"
                            }`}
                        >
                          {transaction.type === "income" ? (
                            <ArrowUpRight className="w-4 h-4 text-success" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString(
                              "es-CO",
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold ${transaction.type === "income"
                            ? "text-success"
                            : "text-destructive"
                          }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.total)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay transacciones recientes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

    </div>
  );
}
