// Importación de módulos necesarios
import React, { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

function App() {

  // Estados para manejar la autenticación y datos del usuario
  const [emailFromAuth, setEmailFromAuth] = useState(null);
  const [uniqueCode, setUniqueCode] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // useEffect para revisar si hay una sesión previa guardada
  useEffect(() => {
    // Obtener el email guardado en el almacenamiento de la sesión
    const savedEmail = sessionStorage.getItem("emailFromAuth");

    // Si hay un email guardado, actualizar el estado con ese email
    if (savedEmail) {
      setEmailFromAuth(savedEmail);
      setIsAuthenticated(true); // Asumir que el usuario está autenticado
    }
  }, []); // El array vacío indica que este efecto se ejecuta solo una vez, al cargar la app

  // Función para manejar el inicio de sesión con Google
  const handleGoogleSignIn = async () => {
    // Creación del proveedor de autenticación de Google
    const provider = new GoogleAuthProvider();

    try {
      // Autenticación con ventana emergente de Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = user.email;

      // Almacenar y mostrar el email del usuario autenticado
      setEmailFromAuth(email);
      sessionStorage.setItem("emailFromAuth", email); // Guardar email en el almacenamiento de la sesión

      // Operaciones con Firestore: verificar y almacenar datos del usuario
      const docRef = doc(db, "estudiantesMappings", email);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Generar código único si el usuario no existe en Firestore
        const uniqueCode = Math.random().toString(36).substr(2, 8);
        setUniqueCode(uniqueCode);

        // Crear un nuevo documento en Firestore con el código único
        await setDoc(docRef, {
          discordUserID: null,
          trelloUsername: null,
          uniqueCode: uniqueCode,
        });
      }

      // Confirmación de autenticación exitosa
      console.log("Success:", user);
      setIsAuthenticated(true);
    } catch (error) {
      // Manejo de errores en autenticación
      console.log("Error:", error);
    }
  };

  // Función para manejar el cierre de sesión
  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        // Limpiar el email guardado en el almacenamiento de la sesión al cerrar sesión
        sessionStorage.removeItem("emailFromAuth");
        setEmailFromAuth(null);
        setIsAuthenticated(false); // Actualizar estado a no autenticado
        console.log("Signed out");
      })
      .catch((error) => {
        console.log("Error signing out:", error);
      });
  };

  // Interfaz de usuario: botones para iniciar y cerrar sesión
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <button
        onClick={handleGoogleSignIn}
        className="bg-blue-500 text-white p-4 rounded"
      >
        Iniciar sesión
      </button>
      <button
        onClick={handleSignOut}
        className="bg-red-500 text-white p-4 rounded ml-4"
      >
        Salir
      </button>
    </div>
  );
}

export default App;
