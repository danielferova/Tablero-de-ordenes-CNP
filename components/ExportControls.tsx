import React from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

interface ExportControlsProps {
  filteredData: any[];
  managementDashboardRef: React.RefObject<HTMLDivElement>;
}

const ExportControls: React.FC<ExportControlsProps> = ({ filteredData, managementDashboardRef }) => {
  const handlePdfDownload = async () => {
    const { jsPDF } = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;

    const dashboardElement = managementDashboardRef.current;
    if (!dashboardElement) {
        alert("No se pudo encontrar el dashboard para exportar.");
        return;
    }

    try {
        const canvas = await html2canvas(dashboardElement, { 
            scale: 2,
            useCORS: true, 
            backgroundColor: '#111827' // Dark background for better capture
        });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Reporte_Gerencial_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Ocurrió un error al generar el PDF. Por favor, intente de nuevo.");
    }
  };

  const handleExcelDownload = () => {
    const XLSX = (window as any).XLSX;

    if (filteredData.length === 0) {
        alert("No hay datos para exportar. Por favor, ajuste los filtros.");
        return;
    }

    const dataToExport = filteredData.map(item => ({
        'No. Orden': item.orderNumber,
        'Cliente': item.client,
        'Fecha Creación': item.creationDate,
        'Monto Cotizado': item.quotedAmount,
        'No. Sub-Orden': item.subOrderNumber,
        'Unidad': item.unit,
        'Tipo Trabajo (Tarea)': item.workType,
        'Descripción (Tarea)': item.description,
        'Monto (Tarea)': item.amount,
        'Estado (Tarea)': item.status,
        'No. Factura Gral.': item.invoiceNumber,
        'Fecha Factura': item.invoiceDate,
        'Monto Factura': item.invoiceTotalAmount,
        'Método Pago': item.paymentMethod,
        'Fecha Pago': item.paymentDate,
        'Monto Pagado': item.paidAmount,
        'Saldo Pendiente': (item.invoiceTotalAmount || 0) - (item.paidAmount || 0)
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes');
    XLSX.writeFile(workbook, `Reporte_Ordenes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex items-center space-x-2">
        <button
            onClick={handlePdfDownload}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm"
            title="Descargar un reporte en PDF del Dashboard Gerencial"
        >
            <DownloadIcon className="h-4 w-4 mr-2" />
            PDF
        </button>
        <button
            onClick={handleExcelDownload}
            className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out shadow-md text-sm"
            title="Descargar un reporte en Excel de la tabla de datos filtrada"
        >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Excel
        </button>
    </div>
  );
};

export default ExportControls;