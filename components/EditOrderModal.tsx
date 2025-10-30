import React, { useState, useEffect, useMemo } from 'react';
import { Order, SubOrder, FinancialMovement } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { WarningIcon } from './icons/WarningIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

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


const AmountStatusCard: React.FC<{
    title: string;
    amount: number;
    referenceAmount?: number;
    isBalance?: boolean;
}> = ({ title, amount, referenceAmount, isBalance = false }) => {
    // Compare amounts with a small tolerance for floating point issues
    const amountsMatch = referenceAmount !== undefined && Math.abs(amount - referenceAmount) < 0.01;

    // Determine status only if there's a reference amount to compare against
    const showStatus = referenceAmount !== undefined && referenceAmount > 0;
    const isMismatched = showStatus && !amountsMatch;
    
    if (isBalance) {
        return (
             <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex flex-col justify-between">
                <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</span>
                    <p className={`text-2xl font-semibold mt-1 ${amount > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(amount)}</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`p-3 rounded-lg flex flex-col justify-between ${isMismatched ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-inset ring-yellow-300 dark:ring-yellow-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
            <div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</span>
                    {isMismatched && <WarningIcon className="w-5 h-5 text-yellow-500" title="El monto no coincide con el total de la orden" />}
                </div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{formatCurrency(amount)}</p>
            </div>
            {isMismatched && (
                 <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                    Debería ser: {formatCurrency(referenceAmount)}
                 </p>
            )}
        </div>
    );
};


const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, subOrders, financialMovements, onClose, onSubmit }) => {
    const getInitialBillingType = () => {
        // If billingType is explicitly set, it's the source of truth.
        if (order.billingType) {
            return order.billingType;
        }
        // If not set, try to infer from existing financial movements to handle legacy data.
        if (financialMovements && financialMovements.length > 0) {
            // If any movement is tied to a specific sub-task, it's per-task billing.
            const hasPerTaskMovements = financialMovements.some(m => m.subOrderId);
            if (hasPerTaskMovements) {
                return 'perTask';
            }
            // If any movement is tied to the order globally, it's global billing.
            const hasGlobalMovements = financialMovements.some(m => m.orderId && !m.subOrderId);
            if (hasGlobalMovements) {
                return 'global';
            }
        }
        // Default to null if no type is set and no movements exist, prompting user selection.
        return null;
    };
    
    const [localMovements, setLocalMovements] = useState<FinancialMovement[]>([]);
    const [activeForm, setActiveForm] = useState<{ type: 'add' | 'edit'; subOrderId?: string; orderId?: string; movementId?: string } | null>(null);
    const [billingType, setBillingType] = useState<BillingType | null>(getInitialBillingType());
    const [financialObservations, setFinancialObservations] = useState(order.financialObservations || '');
    
    // Make the billing mode selection permanent if a type is already saved OR if there are existing financial movements.
    const isModePermanent = !!order.billingType || (financialMovements && financialMovements.length > 0);

    useEffect(() => {
        // FIX: Replaced unsafe deep copy (JSON.stringify) with a safe, explicit property mapping.
        // This prevents "circular structure" errors by creating plain JavaScript objects
        // from the complex Firestore objects passed in props.
        const clonedMovements = financialMovements.map(m => ({
            id: m.id,
            subOrderId: m.subOrderId,
            orderId: m.orderId,
            invoiceNumber: m.invoiceNumber,
            invoiceDate: m.invoiceDate,
            invoiceAmount: m.invoiceAmount,
            paymentDate: m.paymentDate,
            paidAmount: m.paidAmount,
            creationDate: m.creationDate
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
        if (activeForm?.type === 'add') {
            const newMovement: FinancialMovement = {
                ...movement,
                id: `local-${Date.now()}`,
                creationDate: new Date().toISOString().split('T')[0],
            };
            setLocalMovements(prev => [...prev, newMovement]);
        } else if (activeForm?.type === 'edit') {
            setLocalMovements(prev => 
                prev.map(m => (m.id === movement.id ? movement : m))
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
    const totalInvoicedOverall = useMemo(() => localMovements.reduce((sum, m) => sum + (m.invoiceAmount || 0), 0), [localMovements]);
    const totalPaidOverall = useMemo(() => localMovements.reduce((sum, m) => sum + (m.paidAmount || 0), 0), [localMovements]);


    const renderPerTaskView = () => (
         <div className="space-y-6">
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-900/50 border-b-2 border-brand-primary mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Resumen General de la Orden</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <AmountStatusCard title="Monto Total Orden" amount={totalOrderAmount} />
                    <AmountStatusCard title="Total Facturado" amount={totalInvoicedOverall} referenceAmount={totalOrderAmount} />
                    <AmountStatusCard title="Total Cobrado" amount={totalPaidOverall} referenceAmount={totalOrderAmount} />
                    <AmountStatusCard title="Saldo Pendiente" amount={totalInvoicedOverall - totalPaidOverall} isBalance />
                </div>
            </div>
            {subOrders.map(so => {
                const movementsForSubOrder = localMovements.filter(m => m.subOrderId === so.id);
                const totalInvoiced = movementsForSubOrder.reduce((sum, m) => sum + (m.invoiceAmount || 0), 0);
                const totalPaid = movementsForSubOrder.reduce((sum, m) => sum + (m.paidAmount || 0), 0);
                const balance = (so.amount || 0) - totalPaid;

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

        return (
             <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Facturación Global para {order.orderNumber}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Los movimientos aquí aplican al total de la orden.</p>
                    </div>
                    <button 
                        onClick={() => setActiveForm({ type: 'add', orderId: order.id })}
                        className="flex items-center text-sm bg-brand-primary hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={globalMovements.length > 0}
                        title={globalMovements.length > 0 ? "Solo se puede añadir una factura en modo Global." : "Añadir nuevo movimiento"}
                    >
                        <PlusIcon className="w-4 h-4 mr-1.5" />
                        Añadir Movimiento
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <AmountStatusCard title="Monto Total Orden" amount={totalOrderAmount} />
                    <AmountStatusCard title="Total Facturado" amount={totalInvoiced} referenceAmount={totalOrderAmount} />
                    <AmountStatusCard title="Total Cobrado" amount={totalPaid} referenceAmount={totalOrderAmount} />
                    <AmountStatusCard title="Saldo Pendiente" amount={balance} isBalance />
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
}

const MovementsTable: React.FC<MovementsTableProps> = ({ movements, activeForm, setActiveForm, handleSaveMovement, handleDeleteMovement, identifier }) => {
    if (movements.length === 0 && (!activeForm || activeForm.type !== 'add')) return <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No hay movimientos registrados.</p>;


    return (
        <div className="overflow-x-auto mt-4">
            <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                        <th className="p-2">No. Factura</th>
                        <th className="p-2">Fecha Factura</th>
                        <th className="p-2">Monto Facturado</th>
                        <th className="p-2">Fecha Pago</th>
                        <th className="p-2">Monto Pagado</th>
                        <th className="p-2"></th>
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
                                <td className="p-2 text-right">
                                    <button onClick={() => setActiveForm({ type: 'edit', movementId: mov.id, ...identifier })} className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"><PencilIcon className="w-4 h-4"/></button>
                                    <button onClick={() => handleDeleteMovement(mov.id)} className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
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
    });

    useEffect(() => {
        if (movement) {
            setFormData({
                invoiceNumber: movement.invoiceNumber || '',
                invoiceDate: movement.invoiceDate || '',
                invoiceAmount: movement.invoiceAmount?.toString() ?? '',
                paymentDate: movement.paymentDate || '',
                paidAmount: movement.paidAmount?.toString() ?? '',
            });
        } else {
            // Reset for 'add' form
            setFormData({
                invoiceNumber: '',
                invoiceDate: '',
                invoiceAmount: '',
                paymentDate: '',
                paidAmount: '',
            });
        }
    }, [movement]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const parsedInvoiceAmount = formData.invoiceAmount ? parseFloat(String(formData.invoiceAmount)) : NaN;
        const parsedPaidAmount = formData.paidAmount ? parseFloat(String(formData.paidAmount)) : NaN;

        // Construct the payload, preserving existing properties during an edit.
        // Use `null` for empty fields, as Firestore handles `null` for clearing fields, but ignores `undefined`.
        const payload = {
            ...(movement as FinancialMovement),
            ...identifier,
            invoiceNumber: formData.invoiceNumber || null,
            invoiceDate: formData.invoiceDate || null,
            invoiceAmount: !isNaN(parsedInvoiceAmount) ? parsedInvoiceAmount : null,
            paymentDate: formData.paymentDate || null,
            paidAmount: !isNaN(parsedPaidAmount) ? parsedPaidAmount : null,
        };

        onSave(payload as FinancialMovement);
    }

    const inputClasses = "w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary";

    return (
        <form onSubmit={handleFormSubmit} className="p-3 my-2 bg-gray-100 dark:bg-gray-900/50 rounded-md border border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="No. Factura" className={inputClasses} />
                <input type="date" name="invoiceDate" value={formData.invoiceDate} onChange={handleChange} className={inputClasses} />
                <input type="number" name="invoiceAmount" value={formData.invoiceAmount} onChange={handleChange} placeholder="Monto Factura" step="0.01" className={inputClasses} />
                <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className={inputClasses} />
                <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} placeholder="Monto Pagado" step="0.01" className={inputClasses} />
            </div>
            <div className="flex justify-end space-x-2 mt-3">
                <button type="button" onClick={onCancel} className="text-xs py-1 px-3 bg-gray-300 dark:bg-gray-600 rounded-md">Cancelar</button>
                <button type="submit" className="text-xs py-1 px-3 bg-blue-600 text-white rounded-md">Guardar</button>
            </div>
        </form>
    );
};


export default EditOrderModal;