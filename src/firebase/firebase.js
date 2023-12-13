// Importa la función para inicializar la aplicación desde el SDK de Firebase
import { initializeApp } from "firebase/app";

// Importa la función para obtener el servicio de autenticación de Firebase
import { getAuth } from "firebase/auth";

// Importa la función para obtener el servicio de Firestore (base de datos) de Firebase
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase para tu aplicación web
// Aquí se definen las claves y los identificadores necesarios para conectar con Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY, // Clave de la API de Firebase
  authDomain: process.env.FIREBASE_AUTH_DOMAIN, // Dominio de autenticación de Firebase
  projectId: process.env.FIREBASE_PROJECT_ID, // ID del proyecto en Firebase
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Bucket de almacenamiento en Firebase
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID, // ID del remitente de mensajería en Firebase
  appId: process.env.FIREBASE_APP_ID // ID de la aplicación en Firebase
};

// Inicializa la aplicación Firebase con la configuración proporcionada
const app = initializeApp(firebaseConfig);

// Inicializa el servicio de autenticación de Firebase
const auth = getAuth(app);

// Inicializa Firestore (la base de datos de Firebase) con la aplicación configurada
const db = getFirestore(app);

// Exporta las variables para que puedan ser utilizadas en otros archivos
export { app, auth, db };
