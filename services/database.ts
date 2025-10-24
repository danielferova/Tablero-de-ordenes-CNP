import { Order, SubOrder, Unit, PaymentMethod, OrderStatus } from '../types';
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    writeBatch,
    query,
    getDocs,
    limit,
    serverTimestamp, // Although not used, good to know for future date fields
} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: "tablero-ordenes-cnp.firebaseapp.com",
    projectId: "tablero-ordenes-cnp",
    storageBucket: "tablero-ordenes-cnp.firebasestorage.app",
    messagingSenderId: "639529927991",
    appId: "1:639529927991:web:6a6193dfe3062947d186b2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ordersCollection = collection(db, 'orders');
const subOrdersCollection = collection(db, 'subOrders');

// --- Real-time Data Listener ---
export function listenToData(callback: (data: { orders: Order[], subOrders: SubOrder[] }) => void) {
    let orders: Order[] = [];
    let subOrders: SubOrder[] = [];

    let ordersLoaded = false;
    let subOrdersLoaded = false;

    const combinedCallback = () => {
        if (ordersLoaded && subOrdersLoaded) {
            callback({ orders, subOrders });
        }
    };

    const unsubscribeOrders = onSnapshot(ordersCollection, (snapshot) => {
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        ordersLoaded = true;
        combinedCallback();
    }, (error) => {
        console.error("Error listening to orders collection: ", error);
    });

    const unsubscribeSubOrders = onSnapshot(subOrdersCollection, (snapshot) => {
        subOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubOrder));
        subOrdersLoaded = true;
        combinedCallback();
    }, (error) => {
        console.error("Error listening to subOrders collection: ", error);
    });

    // Return a function that unsubscribes from both listeners
    return () => {
        unsubscribeOrders();
        unsubscribeSubOrders();
    };
}


// --- Write Operations ---

export async function createOrder(
    orderData: { client: string; description: string; workType: string; quotedAmount: number; paymentMethod: PaymentMethod },
    units: Unit[]
): Promise<{ newOrder: Order, newSubOrders: SubOrder[] }> {
    const ordersSnapshot = await getDocs(query(ordersCollection));
    const orderCount = ordersSnapshot.size;
    
    const newOrderNumber = `OT-${String(orderCount + 1).padStart(4, '0')}`;
    const currentDate = new Date().toISOString().split('T')[0];
    
    const newOrderData = {
        ...orderData,
        orderNumber: newOrderNumber,
        creationDate: currentDate,
    };

    const orderDocRef = await addDoc(ordersCollection, newOrderData);
    const newOrder = { id: orderDocRef.id, ...newOrderData } as Order;

    const batch = writeBatch(db);
    const newSubOrders: SubOrder[] = [];

    units.forEach((unit, index) => {
        const subOrderData: Omit<SubOrder, 'id'> = {
            orderId: newOrder.id,
            subOrderNumber: `${newOrderNumber}-${index + 1}`,
            unit,
            status: OrderStatus.Pendiente,
            workType: orderData.workType,
            description: orderData.description,
            creationDate: currentDate,
        };
        const subOrderDocRef = doc(subOrdersCollection); // Create a new doc reference
        batch.set(subOrderDocRef, subOrderData);
        newSubOrders.push({ id: subOrderDocRef.id, ...subOrderData } as SubOrder);
    });

    await batch.commit();

    return { newOrder, newSubOrders };
}

export async function createSubOrder(subOrderData: Omit<SubOrder, 'id'>): Promise<SubOrder> {
    const docRef = await addDoc(subOrdersCollection, subOrderData);
    return { id: docRef.id, ...subOrderData } as SubOrder;
}


export async function updateSubOrder(updatedSubOrder: SubOrder): Promise<SubOrder> {
    const { id, ...dataToUpdate } = updatedSubOrder;
    const subOrderDocRef = doc(db, 'subOrders', id);
    await updateDoc(subOrderDocRef, dataToUpdate);
    return updatedSubOrder;
}

export async function updateOrderWithSubOrders(
    updatedOrder: Order,
    updatedSubOrders: SubOrder[]
): Promise<{ order: Order, subOrders: SubOrder[] }> {
    const batch = writeBatch(db);

    const { id: orderId, ...orderData } = updatedOrder;
    const orderDocRef = doc(db, 'orders', orderId);
    batch.update(orderDocRef, orderData);

    updatedSubOrders.forEach(subOrder => {
        const { id: subOrderId, ...subOrderData } = subOrder;
        const subOrderDocRef = doc(db, 'subOrders', subOrderId);
        batch.update(subOrderDocRef, subOrderData);
    });

    await batch.commit();

    return { order: updatedOrder, subOrders: updatedSubOrders };
}

// --- Data Seeding for First Use ---
async function seedDatabaseIfEmpty() {
    const q = query(ordersCollection, limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        console.log("Database is empty. Seeding initial data...");
        const initialOrders: Omit<Order, 'id'>[] = [
            { orderNumber: 'OT-0001', client: 'Tech Solutions Inc.', description: 'Campaña de Marketing Digital Q3', workType: 'Servicio', creationDate: '2023-10-01', quotedAmount: 40000, invoiceNumber: 'FAC-GRAL-101', invoiceDate: '2023-10-21', paymentMethod: PaymentMethod.Credito, paymentDate: '2023-11-20', invoiceTotalAmount: 40000, paidAmount: 40000 },
            { orderNumber: 'OT-0002', client: 'Global Goods Co.', description: 'Impresión de Lonas Publicitarias', workType: 'Producto', creationDate: '2023-10-05', quotedAmount: 9000, paymentMethod: PaymentMethod.Anticipo },
        ];
        
        const batch = writeBatch(db);
        const order1Ref = doc(collection(db, "orders"));
        batch.set(order1Ref, initialOrders[0]);

        const order2Ref = doc(collection(db, "orders"));
        batch.set(order2Ref, initialOrders[1]);
        
        const initialSubOrders: Omit<SubOrder, 'id' | 'orderId'>[] = [
            { subOrderNumber: 'OT-0001-1', unit: Unit.CNPAgencia, workType: 'Gestión de Redes', description: 'Campaña en Instagram y Facebook', amount: 15000, status: OrderStatus.Cobrado, observations: 'Cliente pidió reporte semanal', creationDate: '2023-10-01' },
            { subOrderNumber: 'OT-0001-2', unit: Unit.PautaPuntual, workType: 'Publicidad Pagada', description: 'Inversión en Google Ads', amount: 25000, status: OrderStatus.Cobrado, creationDate: '2023-10-01' },
            { subOrderNumber: 'OT-0002-1', unit: Unit.SuperImpresiones, workType: 'Impresión Gran Formato', description: 'Lona de 10x5 metros', amount: 8000, status: OrderStatus.Pendiente, creationDate: '2023-10-05' },
        ];
        
        const subOrder1Ref = doc(collection(db, "subOrders"));
        batch.set(subOrder1Ref, { ...initialSubOrders[0], orderId: order1Ref.id });

        const subOrder2Ref = doc(collection(db, "subOrders"));
        batch.set(subOrder2Ref, { ...initialSubOrders[1], orderId: order1Ref.id });

        const subOrder3Ref = doc(collection(db, "subOrders"));
        batch.set(subOrder3Ref, { ...initialSubOrders[2], orderId: order2Ref.id });

        await batch.commit();
        console.log("Initial data seeded successfully.");
    }
}

seedDatabaseIfEmpty();