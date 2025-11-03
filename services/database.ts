import { Order, SubOrder, Unit, PaymentMethod, OrderStatus, FinancialMovement, Director } from '../types';
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
    where,
    deleteDoc,
} from 'firebase/firestore';
import { ALL_UNITS } from '../constants';

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
const financialMovementsCollection = collection(db, 'financialMovements');
const clientsCollection = collection(db, 'clients');
const directorsCollection = collection(db, 'directors');
const executivesCollection = collection(db, 'executives');
const unitsCollection = collection(db, 'units');


// --- Real-time Data Listeners ---
export function listenToData(callback: (data: { orders: Order[], subOrders: SubOrder[], financialMovements: FinancialMovement[] }) => void) {
    let orders: Order[] = [];
    let subOrders: SubOrder[] = [];
    let financialMovements: FinancialMovement[] = [];

    let ordersLoaded = false;
    let subOrdersLoaded = false;
    let movementsLoaded = false;

    const combinedCallback = () => {
        if (ordersLoaded && subOrdersLoaded && movementsLoaded) {
            callback({ orders, subOrders, financialMovements });
        }
    };

    const unsubscribeOrders = onSnapshot(ordersCollection, (snapshot) => {
        orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                orderNumber: data.orderNumber,
                client: data.client,
                description: data.description,
                workType: data.workType,
                creationDate: data.creationDate,
                quotedAmount: data.quotedAmount ?? null,
                invoiceNumber: data.invoiceNumber || null,
                invoiceDate: data.invoiceDate || null,
                paymentDate: data.paymentDate || null,
                paymentMethod: data.paymentMethod || null,
                invoiceTotalAmount: data.invoiceTotalAmount ?? null,
                paidAmount: data.paidAmount ?? null,
                executive: data.executive || null,
                director: data.director || null,
                billingType: data.billingType || null,
                financialObservations: data.financialObservations || null
            } as Order;
        });
        ordersLoaded = true;
        combinedCallback();
    }, (error) => {
        console.error("Error listening to orders collection: ", error);
    });

    const unsubscribeSubOrders = onSnapshot(subOrdersCollection, (snapshot) => {
        subOrders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                orderId: data.orderId,
                subOrderNumber: data.subOrderNumber,
                unit: data.unit,
                workType: data.workType,
                description: data.description,
                amount: data.amount ?? null,
                budgetedAmount: data.budgetedAmount ?? null,
                observations: data.observations || null,
                status: data.status,
                creationDate: data.creationDate,
            } as SubOrder;
        });
        subOrdersLoaded = true;
        combinedCallback();
    }, (error) => {
        console.error("Error listening to subOrders collection: ", error);
    });
    
    const unsubscribeMovements = onSnapshot(financialMovementsCollection, (snapshot) => {
        financialMovements = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                subOrderId: data.subOrderId || null,
                orderId: data.orderId || null,
                invoiceNumber: data.invoiceNumber || null,
                invoiceDate: data.invoiceDate || null,
                invoiceAmount: data.invoiceAmount ?? null,
                paymentDate: data.paymentDate || null,
                paidAmount: data.paidAmount ?? null,
                creationDate: data.creationDate,
            } as FinancialMovement;
        });
        movementsLoaded = true;
        combinedCallback();
    }, (error) => {
        console.error("Error listening to financialMovements collection: ", error);
    });

    return () => {
        unsubscribeOrders();
        unsubscribeSubOrders();
        unsubscribeMovements();
    };
}

function createNameListener(collectionRef: any, collectionName: string) {
    return (callback: (names: string[]) => void) => {
        const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
            const names = snapshot.docs
                .map(doc => doc.data().name)
                .filter((name): name is string => typeof name === 'string' && name.length > 0);
            
            callback(names.sort((a, b) => a.localeCompare(b)));
        }, (error) => {
            console.error(`Error listening to ${collectionName} collection: `, error);
        });
        return unsubscribe;
    };
}

export const listenToClients = createNameListener(clientsCollection, 'clients');
export const listenToExecutives = createNameListener(executivesCollection, 'executives');

export function listenToDirectors(callback: (directors: Director[]) => void) {
    const unsubscribe = onSnapshot(directorsCollection, (snapshot) => {
        const directorData = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    name: data.name,
                    team: data.team,
                    password: data.password
                } as Director;
            })
            .filter((dir): dir is Director => typeof dir.name === 'string' && dir.name.length > 0);
        
        callback(directorData.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
        console.error(`Error listening to directors collection: `, error);
    });
    return unsubscribe;
}

export function listenToUnits(callback: (units: { name: Unit, password: string }[]) => void) {
    const unsubscribe = onSnapshot(unitsCollection, (snapshot) => {
        const unitCredentials = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                name: data.name as Unit,
                password: data.password as string,
            };
        });
        callback(unitCredentials);
    }, (error) => {
        console.error("Error listening to units collection: ", error);
    });
    return unsubscribe;
}


// --- Write Operations ---

export async function createClient(name: string): Promise<void> {
    const trimmedName = name.trim();
    const q = query(clientsCollection, where("name_lowercase", "==", trimmedName.toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        await addDoc(clientsCollection, { 
            name: trimmedName,
            name_lowercase: trimmedName.toLowerCase() // Store a lowercase version for case-insensitive checks
        });
    } else {
        console.warn(`Client "${trimmedName}" already exists.`);
    }
}

export async function createOrder(
    orderData: { client: string; description: string; workType: string; quotedAmount: number; paymentMethod: PaymentMethod; director: string; executive: string; billingType: 'perTask' | 'global'; },
    unitsWithAmounts: { unit: Unit, amount?: number }[]
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

    unitsWithAmounts.forEach((assignment, index) => {
        const subOrderData: Omit<SubOrder, 'id'> = {
            orderId: newOrder.id,
            subOrderNumber: `${newOrderNumber}-${index + 1}`,
            unit: assignment.unit,
            status: OrderStatus.Pendiente,
            workType: orderData.workType,
            description: orderData.description,
            creationDate: currentDate,
            amount: assignment.amount, // Assign amount if provided
            budgetedAmount: assignment.amount, // Also save it as the initial budget
        };
        const subOrderDocRef = doc(subOrdersCollection);
        batch.set(subOrderDocRef, subOrderData);
        newSubOrders.push({ id: subOrderDocRef.id, ...subOrderData } as SubOrder);
    });

    await batch.commit();

    return { newOrder, newSubOrders };
}

export async function createSubOrder(subOrderData: Omit<SubOrder, 'id'>): Promise<SubOrder> {
    const docRef = await addDoc(subOrdersCollection, subOrderData);
    return { id: docRef.id, ...subOrderData };
}


export async function updateSubOrder(updatedSubOrder: SubOrder): Promise<SubOrder> {
    const { id } = updatedSubOrder;
    const subOrderDocRef = doc(db, 'subOrders', id);

    // Create a new, clean object with only SubOrder properties.
    // This explicitly handles cases where a merged object (like FullOrderData) is passed in,
    // preventing circular structure errors when sending data to Firestore.
    const cleanData: Omit<SubOrder, 'id'> = {
      orderId: updatedSubOrder.orderId,
      subOrderNumber: updatedSubOrder.subOrderNumber,
      unit: updatedSubOrder.unit,
      workType: updatedSubOrder.workType,
      description: updatedSubOrder.description,
      amount: updatedSubOrder.amount ?? null,
      budgetedAmount: updatedSubOrder.budgetedAmount ?? null,
      observations: updatedSubOrder.observations ?? null,
      status: updatedSubOrder.status,
      creationDate: updatedSubOrder.creationDate,
    };

    await updateDoc(subOrderDocRef, cleanData as { [key: string]: any });

    // Return a new object combining the ID and the clean data, ensuring no circular refs are returned.
    return { id, ...cleanData };
}

export async function updateOrderFinances(
    orderId: string,
    orderUpdates: Partial<Order>,
    subOrdersToUpdate: SubOrder[],
    movementsToCreate: Omit<FinancialMovement, 'id'>[],
    movementsToUpdate: FinancialMovement[],
    movementsToDelete: FinancialMovement[]
): Promise<void> {
    const batch = writeBatch(db);

    if (Object.keys(orderUpdates).length > 0) {
        const orderDocRef = doc(db, 'orders', orderId);
        batch.update(orderDocRef, orderUpdates);
    }
    
    subOrdersToUpdate.forEach(subOrder => {
        const subOrderDocRef = doc(db, 'subOrders', subOrder.id);
        batch.update(subOrderDocRef, { status: subOrder.status });
    });

    movementsToCreate.forEach(movementData => {
        const movementDocRef = doc(financialMovementsCollection);
        batch.set(movementDocRef, movementData);
    });

    movementsToUpdate.forEach(movement => {
        const movementDocRef = doc(db, 'financialMovements', movement.id);
        // FIX: Create a clean data object to prevent circular reference errors.
        // Instead of spreading the potentially complex 'movement' object, we explicitly
        // map only the properties defined in the FinancialMovement interface.
        const cleanMovementData = {
            subOrderId: movement.subOrderId,
            orderId: movement.orderId,
            invoiceNumber: movement.invoiceNumber,
            invoiceDate: movement.invoiceDate,
            invoiceAmount: movement.invoiceAmount,
            paymentDate: movement.paymentDate,
            paidAmount: movement.paidAmount,
            creationDate: movement.creationDate,
        };
        batch.update(movementDocRef, cleanMovementData);
    });
    
    movementsToDelete.forEach(movement => {
        const movementDocRef = doc(db, 'financialMovements', movement.id);
        batch.delete(movementDocRef);
    });

    await batch.commit();
}

export async function updateOrderBudgets(
    orderId: string, 
    newQuotedAmount: number, 
    subOrdersToUpdate: { id: string; budgetedAmount: number; amount: number }[]
): Promise<void> {
    const batch = writeBatch(db);

    const orderDocRef = doc(db, 'orders', orderId);
    batch.update(orderDocRef, { quotedAmount: newQuotedAmount });

    subOrdersToUpdate.forEach(so => {
        const subOrderDocRef = doc(db, 'subOrders', so.id);
        batch.update(subOrderDocRef, { 
            budgetedAmount: so.budgetedAmount,
            amount: so.amount 
        });
    });

    await batch.commit();
}

// --- Data Seeding ---

async function seedCollectionIfEmpty(collectionRef: any, collectionName: string, dataList: string[]) {
    const snapshot = await getDocs(query(collectionRef, limit(1)));
    if (snapshot.empty) {
        console.log(`${collectionName} collection is empty. Seeding initial list...`);
        const uniqueItems = [...new Set(dataList.map(c => c.trim()).filter(Boolean))];

        const batch = writeBatch(db);
        uniqueItems.forEach(itemName => {
            const docRef = doc(collectionRef);
            batch.set(docRef, { 
                name: itemName, 
                name_lowercase: itemName.toLowerCase()
            });
        });
        await batch.commit();
        console.log(`${uniqueItems.length} unique ${collectionName} seeded successfully.`);
    }
}

async function seedDirectors() {
    const directorsToSeed = [
        { name: "Michael Marizuya", team: "Equipo Senior", password: "senior123", name_lowercase: "michael marizuya" },
        { name: "Pedro Luis Martinez", team: "Equipo Junior", password: "junior123", name_lowercase: "pedro luis martinez" }
    ];

    const snapshot = await getDocs(directorsCollection);
    
    if (snapshot.empty) {
        console.log("Directors collection is empty. Seeding initial directors with credentials...");
        const batch = writeBatch(db);
        directorsToSeed.forEach(dir => {
            const docRef = doc(directorsCollection);
            batch.set(docRef, dir);
        });
        await batch.commit();
        console.log(`${directorsToSeed.length} directors seeded successfully.`);
    } else {
        console.log("Directors collection exists. Checking for missing fields...");
        const batch = writeBatch(db);
        let updatesMade = false;
        
        const existingDirectors = new Map<string, { id: string; data: any }>();
        snapshot.docs.forEach(doc => {
            existingDirectors.set(doc.data().name_lowercase, { id: doc.id, data: doc.data() });
        });

        directorsToSeed.forEach(seedDir => {
            const existingDoc = existingDirectors.get(seedDir.name_lowercase);
            if (existingDoc) {
                // Document exists, check if password or team is missing
                if (!existingDoc.data.password || !existingDoc.data.team) {
                    console.log(`Updating director: ${seedDir.name}`);
                    const docRef = doc(db, 'directors', existingDoc.id);
                    batch.update(docRef, {
                        team: seedDir.team,
                        password: seedDir.password
                    });
                    updatesMade = true;
                }
            } else {
                // Document does not exist, so we should create it.
                console.log(`Creating missing director: ${seedDir.name}`);
                const docRef = doc(directorsCollection);
                batch.set(docRef, seedDir);
                updatesMade = true;
            }
        });

        if (updatesMade) {
            await batch.commit();
            console.log("Director data updated successfully.");
        } else {
            console.log("All director data is up to date.");
        }
    }
}

async function seedUnits() {
    const snapshot = await getDocs(query(unitsCollection, limit(1)));
    if (snapshot.empty) {
        console.log("Units collection is empty. Seeding initial units and passwords...");
        // NOTE: Storing plain-text passwords is insecure. This is for demonstration and administrative convenience
        // as requested. In a production environment, a secure authentication system (e.g., Firebase Auth) should be used.
        const batch = writeBatch(db);
        ALL_UNITS.forEach(unit => {
            const password = unit.toLowerCase().replace(/[^a-z0-9]/g, '') + '123';
            const docRef = doc(unitsCollection);
            batch.set(docRef, {
                name: unit,
                password: password,
            });
        });
        await batch.commit();
        console.log(`${ALL_UNITS.length} units seeded successfully.`);
    }
}

const seedClients = () => seedCollectionIfEmpty(clientsCollection, 'Clients', [
    "& CAFÉ", "12+12", "ABBOT", "Acces Media", "ACREDICOM", "ADICLA", "AG Automotriz", "Agencias Way", "AHORRENT", "AIWA", "Akí", "Al Cilantro", "Aldo Nero", "Alexis Bargeles / Restaurante El Marinero.", "ALMACENES JAPON", "Aloe Vera", "Ambev", "Ambrella", "Amigo Presta", "Amore", "Andrea Arroyave / El Zeppelin", "Andrea Ríos / La Butik clothe & more", "Anfora", "ANIMOTION", "Antillon", "APROFAM", "Aracely Ajanel/ Ceramica Castelli.", "AUTO FIX PANTALLAS LED", "AUTOMOTRIS XELA PANTALLAS LED", "Azote BG", "BAC", "Banco Azteca", "Banco Cuscatlan", "Banco de Antigua", "Banco GYT Continental", "Banco Industrial", "Banrural", "Bantrab", "BAYER", "Bectris", "BMP AUTO PARTES PANTALLAS LED", "BMW", "Bounty Hunter", "Brander´s", "Busch Light", "Calera San Miguel", "Camara de Comercio", "Camara de Construcción", "Camas Fontex", "Campero", "Cantonesa", "Carlos Ruedas/ Serteco & Villas el Nido", "Carnaval", "Carolina Ríos/ Gobernación Departamental Quetgo.", "Casa del Ron", "Casa instrumental", "Casa Solar", "Cecodent", "CEI", "Cemaco", "Cementos Progreso", "CEMGUA", "Central de Medios", "Centro comercial Los Altos de Totonicapan", "Centro comercial Los Celajes", "CENTRO DENTAL TOOTH", "Centro Dermatológico de Occidente (CDO)", "Centro Odontológico Joy Dental", "Ceramipisos", "Cerveceria nacional", "Changan", "Chery", "Chicote", "Chiva Prenda", "CHN", "Claro", "COCA COLA", "Colegio Claremont", "Colegio El Pilar", "Colegio Inevoc", "Colegio La Patria", "Colegio Maria Auxiliadora", "Colegio Monte Verde", "Colegio Pino Montano", "Colegio Q'anill", "Colegio Salamanca", "Colua", "CONTINENTAL MOTORS", "Controlingooh", "Cool", "COOPERATIVA 31 DE JULIO", "Cooperativa Coopach", "COOPERATIVA COPELIBER R.L PANTALLASS LED", "COOPERATIVA CRECECOPE PANTALLAS LDE", "Cooperativa Ecosaba", "COPECHAPIN R.L RRSS", "COPEOORO", "Copeoro RL", "Coralsa", "Corium", "CORPORACIÓN AVANZA", "COSAMI ES MI COPE / CAMIONES VALLA / PANTALALS LED", "Creatbot", "CREDICHAPIN", "CREDIGUATE", "CREDIMARQ", "Credimás", "CREDIMAS + ESPERANZA RRSS / PANTALLAS LED", "CRUZ VERDE", "Cubata", "CUIK", "Curacao", "d4 McCann", "Daniel Quijivix / Laboratorio Inmunotest", "D'Antoni", "De La Granja", "Del Frutal", "Del Monte", "Delicia", "DISMACO DISTRIBUIDORA PANTALLAS LED", "DM OCCIDENTE PANTALLAS LED", "DOMINOS EXPRESS", "DOMINOS PIZZA", "Don Franklin", "Doña Ody", "DPCrea", "Dra Glendy Sum", "Ducal", "DUNKIN´DUNUTS", "Dynant", "Eagle Media", "Eco Resort Samalá", "Ecofiltro", "Econosuper", "El Arenal", "EL CAFETALITO", "El Gallo Mas Gallo", "Elecktra", "Electroma", "Emilio López/ Buckle", "EMISORAS UNIDAS", "Emporium", "Energuate", "Enrique Cay / Estudio de Arte Cay", "EPA", "Esto es Marte", "Etrog", "FABRICA DECORA XELA PANTALLAS LED", "FARMA COSTO", "FARMACIAS BATRES", "Feat", "FERCO", "Fernando de León/ Taller C&V", "FETICHE PRADERA XELA PANTALLAS LED", "FFACSA", "Ficohsa", "Filemón", "Finca La Azotea", "Finca la soledad/ Jimena Fuentes", "Foremost", "FREEDOM", "Friapp", "Fritolay", "Fulano Sutano", "Fundea", "G&T", "Gabriela Camas/ Neurodiagnostico", "Gallo", "Gamma", "Genesis empresarial", "Good Modd", "Granjero", "Grapete", "Grupo Construferro", "Grupo MeMe", "GRUPO MASTER", "Grupo Onyx", "Grupo Q", "H. Alvarez", "Havas", "Hospital totonicapan", "HOTEL LOS ARCOS PANTALLAS LED / RRSS", "House Dentsu", "HS Centro", "Hyundai", "Idealsa", "Ina", "Intecap", "INTERCOP", "Irtra", "Issima", "J. Gutierrez / Motos Haohue", "Jairo Daniel/ App Ziengo", "Jessica Castillo/ Gerente Comercial Cayala.", "JIM", "JLMarketing", "Johana Calvillo / Salon de Belleza Acuarius.", "Kalea", "KAPITAL SOLUCIONES PANTALLAS LED", "KATO KI", "Kern´s", "Kid Planeta", "L´IMAGE INTERPLAZA PANTALLAS LED", "La Colonia", "LA CURACAO", "La Hacienda Del Chef", "La Luna", "La Sevillana", "La Torre", "LA TRONADORA", "Lafabrica&jotabequ", "Lala", "Lala Kids", "LATAM", "Le Bolsha", "Lecleire", "Leticia Rojas / Excel Automotriz FUSO", "LEVUNI", "LICORES DE GUATEMALA", "Little Caesar´s", "LOCOS DE ASAR", "LSUD", "Macdonals", "Maderas San Miguel", "Magic Touch", "Mansión Los Guichos", "Maravilla", "Marcela Girón/ Eventos HAMA", "Marinero", "MARIOT´S BOUTIQUE", "Marlon Rodriguez/ Gourmet", "Marsa", "Maty & Paul", "MAX", "Mayatour", "Mazda", "Mazola", "MCI", "Media Naranja", "Media Partners", "Medios&Mas", "MEGA BLOCK", "MEGA SHOES", "MEGATRONCH´S", "Mevecon", "Mi casita Montesori", "Miguel de León Regil / Hospital Veterinario Zoo Mascota", "Ministerio de Gobernación", "Modelo", "Molinos Modernos", "Mosca", "Mostro", "MOTOPLUS", "Motoresa", "MULTIMATERIALES PANTALLAS LED", "MUNICIPALIDAD DE LA ESPERANZA", "Muriel Feterman/ Muriel Postres", "NESCAFE", "Nestle", "Norcom", "Nube Blanca", "Nueva Esperanza", "Nutry Lety", "Ogilvy", "OMD", "OPTICA LOURDES PANTALLAS LED", "Optical Center", "Osberto Aguilar/ Laboratorio Aguilar", "Pablo Galicia/ Colegio Salamanca", "Palm Era", "Panamericana", "Papa John's", "PAPELERA INTERNACIONAL", "PATSY RESTAURANTE", "Pedidos ya", "Pepsi", "Peter Jordan", "PeYa", "PHARA", "PHD", "PICACIA", "PICADILY PANTALLAS LED", "PICK A POKE XELA", "Pieles y Napas de Occidente", "PINTER PANTALLAS", "Pizza Hut", "PLAZA 7 RRSS", "Pollolandia", "PRADERA XELA PANRTALLAS LED", "Pricesmart", "Progreso", "Promerica", "Publicidad Comercial", "Publinac", "Puma", "Quinta de las flores", "Raptor", "Red Azul", "Repuestos alvarez", "Restaurante Don Andres", "RESTAURANTE EL POTRERO RRSS / PANTALLAS LED", "Revive", "Rodrigo Echeverria/ Monster", "Roobik", "ROSAL", "Rufo", "Saatchi", "Salamanca", "Salvavidas", "SANITISU", "SANTA CRUZ R.L", "Santa Delfina", "Saúl", "Schell", "SCOTT PAPEL PANTALLAS LED", "Sears", "Seguros Universales", "Senator", "Señorial", "SERVI", "Sherwin williams", "Siboney", "Siciliana", "Sinergia", "SISA Seguros de Guatemala", "SISTEGUA", "Sitesa", "Smartfit", "SOLAR CITY", "Starcom", "Stephany Licardié (Mediadora)", "Sublime", "Suma", "Super del Barrio", "TACOS EL PORTON PANTALLAS LED", "Tacticas", "Talishte", "Tampico", "Tatiana Camposeco/ Psicoclínica", "TAYTEC RRSS", "TBWA RIOT", "Te del Monte", "Teatro THRIAMBOS", "Tecnofácil", "Texaco", "TEXACO- GRUPO PERZA", "Tiendas El Tejar", "Tigo", "Tiky", "TMU ROPA PANTALLAS LED", "Top Publicidad", "TORETES RESTAURANTES LED", "TRE FRATELLI", "Tropigas", "TV AZTECA", "TVS", "UDEO", "ULTRACEM", "UMG", "Unicomer", "UNIMARCKS S.A XELA PANTALLAS LED", "Union Export", "UNIPHARM", "UNIVERSIDAD DA VINCI", "UNIVERSIDAD DEL VALLE", "UNIVERSIDAD GALILEO", "UNIVERSIDAD MESOAMERICANA", "UNO", "UPA", "Vana", "Venite", "Venza", "VESUVIO", "Villeda", "WASH & DRIVE PANTALLAS LED", "WCA", "Wendy´s", "YA ESTA", "YAMAHA MOTOS", "Yoko", "Zixx"
]);

const seedExecutives = () => seedCollectionIfEmpty(executivesCollection, 'Executives', [
    "Lupita Chavarria", "Michael Marizuya", "Stephanie Gallardo", "Jorge González", 
    "Marisol Herce", "Roberto Calderón", "Ashly Rodas", "Luis Suriano", 
    "Karla Tzorín", "Ada Tellez"
]);

async function seedDatabaseIfEmpty() {
    const q = query(ordersCollection, limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        console.log("Database is empty. Seeding initial data based on user-provided state...");

        const batch = writeBatch(db);

        // --- Document References ---
        const order1Ref = doc(collection(db, "orders")); // OT-0001
        const order2Ref = doc(collection(db, "orders")); // OT-0002
        const order3Ref = doc(collection(db, "orders")); // OT-0003
        const order4Ref = doc(collection(db, "orders")); // OT-0004

        const so1_1Ref = doc(collection(db, "subOrders")); // OT-0001-1
        
        const so2_1Ref = doc(collection(db, "subOrders")); // OT-0002-1
        const so2_2Ref = doc(collection(db, "subOrders")); // OT-0002-2
        
        const so3_1Ref = doc(collection(db, "subOrders")); // OT-0003-1

        const so4_1Ref = doc(collection(db, "subOrders")); // OT-0004-1

        const mov1Ref = doc(collection(db, "financialMovements")); // For OT-0001
        const mov2Ref = doc(collection(db, "financialMovements")); // For OT-0002

        // --- Data Definitions based on screenshot ---

        // OT-0001: Claro, Completado
        batch.set(order1Ref, { 
            orderNumber: 'OT-0001', client: 'Claro', creationDate: '2025-10-28', 
            quotedAmount: 3000, director: 'Michael Marizuya', executive: 'Lupita Chavarria',
            paymentMethod: PaymentMethod.Credito, billingType: 'global'
        });
        batch.set(so1_1Ref, {
            orderId: order1Ref.id, subOrderNumber: 'OT-0001-1', unit: Unit.CNPAgencia,
            workType: 'Servicio', description: 'Campaña de Marketing', amount: 3000,
            status: OrderStatus.Cobrado, creationDate: '2025-10-28'
        });
        batch.set(mov1Ref, {
            orderId: order1Ref.id, invoiceNumber: 'FAC-GRAL-102', invoiceDate: '2025-10-29',
            invoiceAmount: 3000, paymentDate: '2025-10-30', paidAmount: 3000,
            creationDate: '2025-10-29'
        });

        // OT-0002: Emporium, En Progreso
        batch.set(order2Ref, {
            orderNumber: 'OT-0002', client: 'Emporium', creationDate: '2025-10-28',
            quotedAmount: 1000, director: 'Pedro Luis Martinez', executive: 'Jorge González',
            paymentMethod: PaymentMethod.Contado, billingType: 'perTask'
        });
        batch.set(so2_1Ref, { // Tarea Facturada
            orderId: order2Ref.id, subOrderNumber: 'OT-0002-1', unit: Unit.SuperImpresiones,
            workType: 'Producto', description: 'Impresión de volantes', amount: 500,
            status: OrderStatus.Facturado, creationDate: '2025-10-28'
        });
        batch.set(so2_2Ref, { // Tarea Pendiente
            orderId: order2Ref.id, subOrderNumber: 'OT-0002-2', unit: Unit.PublicidadMovimiento,
            workType: 'Servicio', description: 'Valla móvil', amount: 500,
            status: OrderStatus.Pendiente, creationDate: '2025-10-28'
        });
        batch.set(mov2Ref, {
            subOrderId: so2_1Ref.id, invoiceNumber: 'FAC-GRAL-112', invoiceDate: '2025-11-13',
            invoiceAmount: 500, paymentDate: '2025-11-03', paidAmount: 250,
            creationDate: '2025-11-13'
        });

        // OT-0003: Intra, Pendiente
        batch.set(order3Ref, {
            orderNumber: 'OT-0003', client: 'Intra', creationDate: '2025-10-29',
            quotedAmount: 900, director: 'Michael Marizuya', executive: 'Karla Tzorín',
            paymentMethod: PaymentMethod.Credito, billingType: 'perTask'
        });
        batch.set(so3_1Ref, {
            orderId: order3Ref.id, subOrderNumber: 'OT-0003-1', unit: Unit.Publiest,
            workType: 'Servicio', description: 'Activación BTL', amount: 900,
            status: OrderStatus.Pendiente, creationDate: '2025-10-29'
        });

        // OT-0004: Don Franklin, Pendiente
        batch.set(order4Ref, {
            orderNumber: 'OT-0004', client: 'Don Franklin', creationDate: '2025-10-29',
            quotedAmount: 2000, director: 'Pedro Luis Martinez', executive: 'Ada Tellez',
            paymentMethod: PaymentMethod.Anticipo, billingType: 'perTask'
        });
        batch.set(so4_1Ref, {
            orderId: order4Ref.id, subOrderNumber: 'OT-0004-1', unit: Unit.Dmetal,
            workType: 'Producto', description: 'Estructura metálica', amount: 1000,
            status: OrderStatus.Pendiente, creationDate: '2025-10-29'
        });

        await batch.commit();
        console.log("Initial data seeded successfully with user-provided state.");
    }
}

// Initial data seeding calls
// seedDatabaseIfEmpty();
seedClients();
seedDirectors();
seedExecutives();
seedUnits();