import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, SubOrder, FinancialMovement, TaxType } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { WarningIcon } from './icons/WarningIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { UploadIcon } from './icons/UploadIcon';
import InvoiceDetailModal from './InvoiceDetailModal';

interface EditOrderModalProps {
    order: Order;
    subOrders: SubOrder[];
    financialMovements: FinancialMovement[];
    onClose: () => void;
    onSubmit: (order: Order, subOrders: SubOrder[], financialMovements: FinancialMovement[]) => void;
}

const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'Q0.00';
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value);
};

type BillingType = 'perTask' | 'global';

const BillingModeSelector: React.FC<{
    isPermanent: boolean;
    activeMode: BillingType | null;
    onSelect: (mode: BillingType) => void;
}> = ({ isPermanent, activeMode, onSelect }) => {
    const getButtonClasses = (mode: BillingType) => {
        const baseClasses = "py-2 px-4 text-sm font-semibold rounded-md transition-colors flex-1";
        const isActive = activeMode === mode;

        if (isActive) {
            return `${baseClasses} bg-brand-primary text-white shadow-md`;
        }
        if (isPermanent && !isActive) {
            return `${baseClasses} bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed`;
        }
        // Is not permanent and not active
        return `${baseClasses} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600`;
    };

    return (
        <div className="flex justify-center space-x-2 mb-6 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
            <button
                type="button"
                onClick={() => !isPermanent && onSelect('perTask')}
                className={getButtonClasses('perTask')}
                disabled={isPermanent}
            >
                Facturación por Tarea
            </button>
            <button
                type="button"
                onClick={() => !isPermanent && onSelect('global')}
                className={getButtonClasses('global')}
                disabled={isPermanent}
            >
                Facturación Global
            </button>
        </div>
    );
};

const SummaryCard: React.FC<{ title: string; amount: number; color?: string; description?: string }> = ({ title, amount, color = 'text-gray-900 dark:text-white', description }) => (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex flex-col justify-between">
        <div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</span>
            <p className={`text-2xl font-semibold mt-1 ${color}`}>{formatCurrency(amount)}</p>
        </div>
        {description && <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">{description}</p>}
    </div>
);


const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, subOrders, financialMovements, onClose, onSubmit }) => {
    const getInitialBillingType = () => {
        if (order.billingType) {
            return order.billingType;
        }
        if (financialMovements && financialMovements.length > 0) {
            const hasPerTaskMovements = financialMovements.some(m => m.subOrderId);
            if (hasPerTaskMovements) {
                return 'perTask';
            }
            const hasGlobalMovements = financialMovements.some(m => m.orderId && !m.subOrderId);
            if (hasGlobalMovements) {
                return 'global';
            }
        }
        return null;
    };
    
    const [localMovements, setLocalMovements] = useState<FinancialMovement[]>([]);
    const [activeForm, setActiveForm] = useState<{ type: 'add' | 'edit'; subOrderId?: string; orderId?: string; movementId?: string } | null>(null);
    const [billingType, setBillingType] = useState<BillingType | null>(getInitialBillingType());
    const [financialObservations, setFinancialObservations] = useState(order.financialObservations || '');
    const [viewingMovement, setViewingMovement] = useState<FinancialMovement | null>(null);

    const isModePermanent = !!order.billingType || (financialMovements && financialMovements.length > 0);

    useEffect(() => {
        const clonedMovements = financialMovements.map(m => ({
            id: m.id,
            subOrderId: m.subOrderId,
            orderId: m.orderId,
            invoiceNumber: m.invoiceNumber,
            invoiceDate: m.invoiceDate,
            invoiceAmount: m.invoiceAmount,
            paymentDate: m.paymentDate,
            paidAmount: m.paidAmount,
            creationDate: m.creationDate,
            taxType: m.taxType,
            issuerName: m.issuerName,
            issuerNit: m.issuerNit,
            receiverName: m.receiverName,
            receiverNit: m.receiverNit,
            issueDateTime: m.issueDateTime,
            authorizationUuid: m.authorizationUuid,
            series: m.series,
            dteNumber: m.dteNumber,
            vatWithholdingAgent: m.vatWithholdingAgent,
        }));
        setLocalMovements(clonedMovements);
    }, [financialMovements]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!billingType) {
            alert('Por favor, seleccione un método de facturación para guardar los cambios.');
            return;
        }
        const updatedOrder = { ...order, billingType, financialObservations };
        onSubmit(updatedOrder, subOrders, localMovements);
    };
    
    const handleSaveMovement = (movement: FinancialMovement) => {
        const sanitizedMovement: FinancialMovement = {
            ...movement,
            invoiceAmount: movement.invoiceAmount === null || isNaN(Number(movement.invoiceAmount)) ? null : Number(movement.invoiceAmount),
            paidAmount: movement.paidAmount === null || isNaN(Number(movement.paidAmount)) ? null : Number(movement.paidAmount),
            taxType: movement.taxType || null,
        };

        if (activeForm?.type === 'add') {
            const newMovement: FinancialMovement = {
                ...sanitizedMovement,
                id: `local-${Date.now()}`,
                creationDate: new Date().toISOString().split('T')[0],
            };
            setLocalMovements(prev => [...prev, newMovement]);
        } else if (activeForm?.type === 'edit') {
            setLocalMovements(prev => 
                prev.map(m => (m.id === sanitizedMovement.id ? sanitizedMovement : m))
            );
        }
        setActiveForm(null);
    };

    const handleDeleteMovement = (movementId: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este movimiento?')) {
            setLocalMovements(prev => prev.filter(m => m.id !== movementId));
            setActiveForm(null);
        }
    };
    
    const totalOrderAmount = useMemo(() => subOrders.reduce((sum, so) => sum + (so.amount || 0), 0), [subOrders]);
    
    const calculateNetTotal = (movements: FinancialMovement[], amountField: 'invoiceAmount' | 'paidAmount'): number => {
        return movements.reduce((sum, m) => {
            const grossAmount = m[amountField] || 0;
            let netAmount = grossAmount;
            if (m.taxType === TaxType.IVA) {
                netAmount = grossAmount / 1.12;
            } else if (m.taxType === TaxType.IVA_TIMBRE) {
                netAmount = grossAmount / 1.125;
            }
            return sum + netAmount;
        }, 0);
    };

    const totalInvoicedOverall = useMemo(() => localMovements.reduce((sum, m) => sum + (m.invoiceAmount || 0), 0), [localMovements]);
    const totalPaidOverall = useMemo(() => localMovements.reduce((sum, m) => sum + (m.paidAmount || 0), 0), [localMovements]);
    const totalNetInvoicedOverall = useMemo(() => calculateNetTotal(localMovements, 'invoiceAmount'), [localMovements]);
    const totalNetPaidOverall = useMemo(() => calculateNetTotal(localMovements, 'paidAmount'), [localMovements]);


    const renderPerTaskView = () => (
         <div className="space-y-6">
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-900/50 border-b-2 border-brand-primary mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Resumen General de la Orden</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SummaryCard title="Monto Total Orden" amount={totalOrderAmount} />
                    <SummaryCard title="Total Facturado (Bruto)" amount={totalInvoicedOverall} />
                    <SummaryCard title="Venta Real Facturado (Neto)" amount={totalNetInvoicedOverall} color="text-green-600 dark:text-green-400" />
                    <SummaryCard title="Total Cobrado (Bruto)" amount={totalPaidOverall} />
                    <SummaryCard title="Venta Real Cobrado (Neto)" amount={totalNetPaidOverall} color="text-green-600 dark:text-green-400" />
                    <SummaryCard title="Saldo Pendiente" amount={totalInvoicedOverall - totalPaidOverall} color={totalInvoicedOverall - totalPaidOverall > 0 ? 'text-red-500' : undefined} />
                </div>
            </div>
            {subOrders.map(so => {
                const movementsForSubOrder = localMovements.filter(m => m.subOrderId === so.id);
                return (
                    <div key={so.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{so.subOrderNumber} - {so.unit}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{so.description}</p>
                            </div>
                            <button 
                                onClick={() => setActiveForm({ type: 'add', subOrderId: so.id })}
                                className="flex items-center text-sm bg-brand-primary hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                disabled={!so.amount}
                                title={!so.amount ? 'Debe asignar un monto a la tarea primero' : 'Añadir nuevo movimiento'}
                            >
                                <PlusIcon className="w-4 h-4 mr-1.5" />
                                Añadir Movimiento
                            </button>
                        </div>
                        
                        {(!so.amount || so.amount === 0) &&
                            <div className="flex items-center text-yellow-600 dark:text-yellow-400 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm mb-3">
                                <WarningIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                                Esta tarea no tiene un monto asignado. No se pueden añadir movimientos financieros.
                            </div>
                        }

                        {activeForm?.type === 'add' && activeForm.subOrderId === so.id && (
                            <MovementForm 
                                identifier={{ subOrderId: so.id }}
                                onSave={handleSaveMovement}
                                onCancel={() => setActiveForm(null)}
                            />
                        )}

                        <MovementsTable
                            movements={movementsForSubOrder}
                            activeForm={activeForm}
                            setActiveForm={setActiveForm}
                            handleSaveMovement={handleSaveMovement}
                            handleDeleteMovement={handleDeleteMovement}
                            identifier={{ subOrderId: so.id }}
                            onViewDetails={setViewingMovement}
                        />
                    </div>
                );
            })}
        </div>
    );
    
    const renderGlobalView = () => {
        const globalMovements = localMovements.filter(m => m.orderId === order.id && !m.subOrderId);
        const totalInvoiced = globalMovements.reduce((sum, m) => sum + (m.invoiceAmount || 0), 0);
        const totalPaid = globalMovements.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
        const balance = totalInvoiced - totalPaid;
        const totalNetInvoiced = calculateNetTotal(globalMovements, 'invoiceAmount');
        const totalNetPaid = calculateNetTotal(globalMovements, 'paidAmount');
        
        const invoicedMismatch = totalOrderAmount > 0 && Math.abs(totalInvoiced - totalOrderAmount) > 0.01;
        const paidMismatch = totalOrderAmount > 0 && Math.abs(totalPaid - totalOrderAmount) > 0.01;

        return (
             <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Facturación Global para {order.orderNumber}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Los movimientos aquí aplican al total de la orden.</p>
                    </div>
                    <button 
                        onClick={() => setActiveForm({ type: 'add', orderId: order.id })}
                        className="flex items-center text-sm bg-brand-primary hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md transition-colors"
                    >
                        <PlusIcon className="w-4 h-4 mr-1.5" />
                        Añadir Movimiento
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <SummaryCard title="Monto Total Orden" amount={totalOrderAmount} />
                    <SummaryCard title="Total Facturado (Bruto)" amount={totalInvoiced} description={invoicedMismatch ? `Debería ser: ${formatCurrency(totalOrderAmount)}` : undefined} />
                    <SummaryCard title="Venta Real Facturado (Neto)" amount={totalNetInvoiced} color="text-green-600 dark:text-green-400" />
                    <SummaryCard title="Total Cobrado (Bruto)" amount={totalPaid} description={paidMismatch ? `Debería ser: ${formatCurrency(totalOrderAmount)}` : undefined} />
                    <SummaryCard title="Venta Real Cobrado (Neto)" amount={totalNetPaid} color="text-green-600 dark:text-green-400" />
                    <SummaryCard title="Saldo Pendiente" amount={balance} color={balance > 0 ? 'text-red-500' : undefined} />
                </div>
                
                {activeForm?.type === 'add' && activeForm.orderId === order.id && (
                    <MovementForm 
                        identifier={{ orderId: order.id }}
                        onSave={handleSaveMovement}
                        onCancel={() => setActiveForm(null)}
                    />
                )}

                <MovementsTable
                    movements={globalMovements}
                    activeForm={activeForm}
                    setActiveForm={setActiveForm}
                    handleSaveMovement={handleSaveMovement}
                    handleDeleteMovement={handleDeleteMovement}
                    identifier={{ orderId: order.id }}
                    onViewDetails={setViewingMovement}
                />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Gestionar Finanzas: <span className="text-brand-primary">{order.orderNumber}</span>
                    </h2>
                </header>

                <main className="p-6 overflow-y-auto flex-grow">
                   <BillingModeSelector
                        isPermanent={isModePermanent}
                        activeMode={billingType}
                        onSelect={setBillingType}
                    />
                    
                    <div className="mb-6">
                        <label htmlFor="financialObservations" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Observaciones Financieras (Evidencia, Comentarios)
                        </label>
                        <textarea
                            id="financialObservations"
                            name="financialObservations"
                            rows={3}
                            className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            placeholder="Añada notas sobre facturas, pagos, o cualquier detalle relevante para gerencia..."
                            value={financialObservations}
                            onChange={(e) => setFinancialObservations(e.target.value)}
                        />
                    </div>

                    {billingType === null ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500 dark:text-gray-400">
                            <h3 className="text-xl font-semibold mb-2">Seleccione un método de facturación</h3>
                            <p>Elija "Facturación por Tarea" o "Facturación Global" para comenzar a gestionar las finanzas de la orden.</p>
                        </div>
                    ) : (
                       billingType === 'perTask' ? renderPerTaskView() : renderGlobalView()
                    )}
                </main>

                <footer className="p-4 flex justify-end space-x-4 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                    <button type="button" onClick={handleSubmit} className="py-2 px-4 bg-brand-primary text-white rounded-md hover:bg-red-700">Guardar Cambios</button>
                </footer>
                 {viewingMovement && (
                    <InvoiceDetailModal movement={viewingMovement} onClose={() => setViewingMovement(null)} />
                )}
            </div>
        </div>
    );
};

interface MovementsTableProps {
    movements: FinancialMovement[];
    activeForm: any;
    setActiveForm: (form: any) => void;
    handleSaveMovement: (movement: FinancialMovement) => void;
    handleDeleteMovement: (id: string) => void;
    identifier: { subOrderId?: string; orderId?: string; };
    onViewDetails: (movement: FinancialMovement) => void;
}

const MovementsTable: React.FC<MovementsTableProps> = ({ movements, activeForm, setActiveForm, handleSaveMovement, handleDeleteMovement, identifier, onViewDetails }) => {
    if (movements.length === 0 && (!activeForm || activeForm.type !== 'add')) return <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No hay movimientos registrados.</p>;


    return (
        <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                        <th className="p-2">No. Factura</th>
                        <th className="p-2">Fecha Factura</th>
                        <th className="p-2">Monto Factura</th>
                        <th className="p-2">Fecha Pago</th>
                        <th className="p-2">Monto Pagado</th>
                        <th className="p-2 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {movements.map(mov => (
                    <React.Fragment key={mov.id}>
                        {activeForm?.type === 'edit' && activeForm.movementId === mov.id ? (
                           <tr>
                                <td colSpan={6}>
                                    <MovementForm 
                                        identifier={identifier}
                                        movement={mov}
                                        onSave={handleSaveMovement}
                                        onCancel={() => setActiveForm(null)}
                                    />
                                </td>
                           </tr>
                        ) : (
                            <tr className="hover:bg-gray-100 dark:hover:bg-gray-800">
                                <td className="p-2">{mov.invoiceNumber || '-'}</td>
                                <td className="p-2">{mov.invoiceDate || '-'}</td>
                                <td className="p-2">{formatCurrency(mov.invoiceAmount)}</td>
                                <td className="p-2">{mov.paymentDate || '-'}</td>
                                <td className="p-2">{formatCurrency(mov.paidAmount)}</td>
                                <td className="p-2 text-right space-x-1">
                                    <button onClick={() => setActiveForm({ type: 'edit', movementId: mov.id, ...identifier })} className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Editar"><PencilIcon className="w-4 h-4"/></button>
                                    {mov.authorizationUuid && (
                                        <button onClick={() => onViewDetails(mov)} className="p-1 text-gray-500 hover:text-green-600 dark:hover:text-green-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Ver detalle de DTE">
                                            <DocumentIcon className="w-4 h-4"/>
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteMovement(mov.id)} className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Eliminar"><TrashIcon className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))}
                </tbody>
            </table>
        </div>
    );
};

interface XmlInvoiceData {
    issuerName: string;
    issuerNit: string;
    receiverName: string;
    receiverNit: string;
    series: string;
    dteNumber: string;
    issueDateTime: string | null;
    authorizationUuid: string;
    vatWithholdingAgent: string;
    displayIssuer: string;
    displayReceiver: string;
    displayIssueDateTime: string;
}

interface MovementFormProps {
    identifier: { subOrderId?: string; orderId?: string; };
    movement?: FinancialMovement;
    onSave: (movement: FinancialMovement) => void;
    onCancel: () => void;
}

const MovementForm: React.FC<MovementFormProps> = ({ identifier, movement, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        invoiceDate: '',
        invoiceAmount: '',
        paymentDate: '',
        paidAmount: '',
        taxType: '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [xmlData, setXmlData] = useState<XmlInvoiceData | null>(null);


    const handleXmlUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
            alert('Por favor, seleccione un archivo XML válido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const xmlString = e.target?.result as string;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, "application/xml");

                const errorNode = xmlDoc.querySelector("parsererror");
                if (errorNode) {
                    throw new Error("Error al procesar el archivo XML.");
                }
                
                const emisorNode = xmlDoc.getElementsByTagName("dte:Emisor")[0];
                const receptorNode = xmlDoc.getElementsByTagName("dte:Receptor")[0];
                const datosGenerales = xmlDoc.getElementsByTagName("dte:DatosGenerales")[0];
                const granTotalNode = xmlDoc.getElementsByTagName("dte:GranTotal")[0];
                const numeroAutorizacionNode = xmlDoc.getElementsByTagName("dte:NumeroAutorizacion")[0];

                if (!emisorNode || !receptorNode || !datosGenerales || !granTotalNode || !numeroAutorizacionNode) {
                    throw new Error("El archivo XML no tiene el formato esperado. Faltan etiquetas DTE requeridas (Emisor, Receptor, DatosGenerales, GranTotal, NumeroAutorizacion).");
                }
                
                const issueDateTime = datosGenerales.getAttribute("FechaHoraEmision");
                const invoiceDate = issueDateTime ? issueDateTime.split('T')[0] : '';
                const invoiceAmount = granTotalNode.textContent || '';
                const series = numeroAutorizacionNode.getAttribute("Serie");
                const dteNumber = numeroAutorizacionNode.getAttribute("Numero");
                const invoiceNumber = (series && dteNumber) ? `${series}-${dteNumber}` : '';
                
                setFormData(prev => ({
                    ...prev,
                    invoiceNumber: invoiceNumber,
                    invoiceDate: invoiceDate,
                    invoiceAmount: invoiceAmount,
                }));
                
                const issuerName = emisorNode.getAttribute("NombreEmisor") || 'No encontrado';
                const issuerNit = emisorNode.getAttribute("NITEmisor") || 'No encontrado';
                const receiverName = receptorNode?.getAttribute("NombreReceptor") || 'No encontrado';
                const receiverNit = receptorNode?.getAttribute("IDReceptor") || 'No encontrado';
                const formattedIssueDateTime = issueDateTime ? new Date(issueDateTime).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : 'No encontrada';
                const authorizationUuid = numeroAutorizacionNode?.textContent || 'No encontrada';
                const afiliacionIVA = emisorNode?.getAttribute("AfiliacionIVA");
                
                let agenteRetencion = 'Información no disponible';
                if (afiliacionIVA === 'GEN') agenteRetencion = 'No es agente de retención.';
                else if (afiliacionIVA === 'PEQ') agenteRetencion = 'Pequeño Contribuyente';
                else if (afiliacionIVA === 'EXE') agenteRetencion = 'Exento';


                setXmlData({
                    issuerName,
                    issuerNit,
                    receiverName,
                    receiverNit,
                    series: series || 'No encontrado',
                    dteNumber: dteNumber || 'No encontrado',
                    issueDateTime,
                    authorizationUuid,
                    vatWithholdingAgent: agenteRetencion,
                    displayIssuer: `${issuerNit} - ${issuerName}`,
                    displayReceiver: `${receiverNit} - ${receiverName}`,
                    displayIssueDateTime: formattedIssueDateTime,
                });
                
            } catch (error) {
                console.error("XML Parsing Error:", error);
                alert(error instanceof Error ? error.message : 'Ocurrió un error al leer el archivo XML.');
            } finally {
                if(fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };


    useEffect(() => {
        setXmlData(null); 
        if (movement) {
            setFormData({
                invoiceNumber: movement.invoiceNumber || '',
                invoiceDate: movement.invoiceDate || '',
                invoiceAmount: movement.invoiceAmount?.toString() ?? '',
                paymentDate: movement.paymentDate || '',
                paidAmount: movement.paidAmount?.toString() ?? '',
                taxType: movement.taxType || '',
            });
        } else {
            setFormData({
                invoiceNumber: '',
                invoiceDate: '',
                invoiceAmount: '',
                paymentDate: '',
                paidAmount: '',
                taxType: '',
            });
        }
    }, [movement]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const parsedInvoiceAmount = formData.invoiceAmount ? parseFloat(String(formData.invoiceAmount)) : null;
        const parsedPaidAmount = formData.paidAmount ? parseFloat(String(formData.paidAmount)) : null;

        const payload = {
            ...(movement as FinancialMovement),
            ...identifier,
            invoiceNumber: formData.invoiceNumber || null,
            invoiceDate: formData.invoiceDate || null,
            invoiceAmount: (parsedInvoiceAmount === null || isNaN(parsedInvoiceAmount)) ? null : parsedInvoiceAmount,
            paymentDate: formData.paymentDate || null,
            paidAmount: (parsedPaidAmount === null || isNaN(parsedPaidAmount)) ? null : parsedPaidAmount,
            taxType: (formData.taxType as TaxType) || null,
            ...(xmlData && {
                issuerName: xmlData.issuerName,
                issuerNit: xmlData.issuerNit,
                receiverName: xmlData.receiverName,
                receiverNit: xmlData.receiverNit,
                issueDateTime: xmlData.issueDateTime,
                authorizationUuid: xmlData.authorizationUuid,
                series: xmlData.series,
                dteNumber: xmlData.dteNumber,
                vatWithholdingAgent: xmlData.vatWithholdingAgent,
            })
        };

        onSave(payload as FinancialMovement);
    }

    const inputClasses = "w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary";
    
    const renderInfoRow = (label: string, value: string | null | undefined, options: { mono?: boolean, truncate?: boolean, break?: boolean } = {}) => (
        <>
            <div className="p-2 bg-teal-600 text-white font-semibold text-sm border-t border-teal-700">{label}</div>
            <div className={`p-2 text-sm text-gray-800 dark:text-gray-200 border-t border-gray-200 dark:border-gray-700 ${options.mono ? 'font-mono text-xs' : ''} ${options.truncate ? 'truncate' : ''} ${options.break ? 'break-all' : ''}`} title={value || ''}>
                {value || 'N/A'}
            </div>
        </>
    );

    return (
        <form onSubmit={handleFormSubmit} className="p-3 my-2 bg-gray-100 dark:bg-gray-900/50 rounded-md border border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4 items-end">
                <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">No. Factura</label>
                    <div className="flex">
                        <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="Serie-Número" className={`${inputClasses} rounded-r-none focus:z-10 relative`} />
                        <input type="file" ref={fileInputRef} onChange={handleXmlUpload} accept="text/xml,.xml" className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 border border-l-0 border-gray-300 dark:border-gray-500 rounded-r-md" title="Cargar desde XML">
                           <UploadIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
                <div>
                     <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Fecha Factura</label>
                    <input type="date" name="invoiceDate" value={formData.invoiceDate} onChange={handleChange} className={inputClasses} />
                </div>
                 <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Monto Factura</label>
                    <input type="number" name="invoiceAmount" value={formData.invoiceAmount} onChange={handleChange} placeholder="Monto" step="0.01" className={inputClasses} />
                </div>
                 <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Fecha Pago</label>
                    <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Monto Pagado</label>
                    <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} placeholder="Monto" step="0.01" className={inputClasses} />
                </div>
                 <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Régimen Fiscal</label>
                    <select name="taxType" value={formData.taxType} onChange={handleChange} className={inputClasses} required>
                        <option value="" disabled>Seleccionar...</option>
                        <option value={TaxType.IVA}>Normal (Solo IVA)</option>
                        <option value={TaxType.IVA_TIMBRE}>Especial (IVA + Timbre)</option>
                        <option value={TaxType.EXENTO}>Exento de Impuestos</option>
                    </select>
                </div>
            </div>
            {xmlData && (
                 <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <h4 className="text-base font-semibold text-gray-800 dark:text-white p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-300 dark:border-gray-600">
                        Detalle del Documento
                    </h4>
                    <div className="grid grid-cols-[180px,1fr] bg-white dark:bg-gray-800">
                       {renderInfoRow('Emisor:', xmlData.displayIssuer, { truncate: true })}
                       {renderInfoRow('Receptor:', xmlData.displayReceiver, { truncate: true })}
                       {renderInfoRow('Fecha Emisión:', xmlData.displayIssueDateTime)}
                       {renderInfoRow('Agente de Retención IVA:', xmlData.vatWithholdingAgent)}
                       {renderInfoRow('Autorización:', xmlData.authorizationUuid, { mono: true, break: true })}
                       {renderInfoRow('Serie:', xmlData.series)}
                       {renderInfoRow('Número del DTE:', xmlData.dteNumber)}
                    </div>
                </div>
            )}
            <div className="flex justify-end space-x-2 mt-3">
                <button type="button" onClick={onCancel} className="text-xs py-1 px-3 bg-gray-300 dark:bg-gray-600 rounded-md">Cancelar</button>
                <button type="submit" className="text-xs py-1 px-3 bg-blue-600 text-white rounded-md">Guardar</button>
            </div>
        </form>
    );
};


export default EditOrderModal;