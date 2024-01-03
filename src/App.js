// Importación de módulos y librerías necesarios
import React, { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { doc, setDoc, getDoc} from "firebase/firestore";

const App = () => {
  // Estados para almacenar información del usuario y su autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uniqueCode, setUniqueCode] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [emailFromAuth, setEmailFromAuth] = useState(null);
  const [isCheckVerificationCalled, setIsCheckVerificationCalled] = useState(false);
  const [tokenToPOST, setTokenToPOST] = useState(null);
  const [tokenInURL, setTokenInURL] = useState(null);
  const [trelloResponse, setTrelloResponse] = useState(null);

  // Se ejecuta cuando la aplicación se carga por primera vez
  useEffect(() => {
    // Extrae el token de la URL si está presente
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    
    if (token) {
      setTokenToPOST(token);
      setTokenInURL(token); // Guarda el token en el estado
      console.log("Token:", token);
    }

    // Recupera el email guardado en la sesión si existe
    const savedEmail = sessionStorage.getItem("emailFromAuth");
    if (savedEmail) {
      setEmailFromAuth(savedEmail);
    }
  }, []);

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

  // Función para vincular la cuenta del usuario con su cuenta de Trello
  const linkTrelloAccount = async () => {

    // Define las credenciales y parámetros necesarios para la autenticación de Trello
    const apiKey = process.env.REACT_APP_TRELLO_API_KEY; // Clave de API de Trello
    const appName = process.env.REACT_APP_TRELLO_APP_NAME; // Nombre de la aplicación que se muestra en Trello
    const returnUrl = process.env.REACT_APP_TRELLO_REDIRECT_URI; // URL a la que Trello redirigirá después de la autenticación
    const scope = process.env.REACT_APP_TRELLO_SCOPE; // Permisos solicitados a Trello (lectura y escritura)
    const expiration = process.env.REACT_APP_TRELLO_EXPIRATION; // Duración de la validez del token de Trello


/*     const apiKey = "70158910c469bee6a6091cee35786b57"; // Clave de API de Trello
    const appName = "Authparausuarios"; // Nombre de la aplicación que se muestra en Trello
    const returnUrl = "http://localhost:3000/"; // URL a la que Trello redirigirá después de la autenticación
    const scope = "read,write"; // Permisos solicitados a Trello (lectura y escritura)
    const expiration = "30days"; // Duración de la validez del token de Trello */

    // Construye la URL de autenticación de Trello con los parámetros anteriores
    const authUrl = `https://trello.com/1/authorize?expiration=${expiration}&name=${appName}&scope=${scope}&response_type=token&key=${apiKey}&return_url=${returnUrl}&callback_method=fragment`;

    // Redirige al usuario a la URL de autenticación de Trello
    window.location.href = authUrl;
  };

  // Función para verificar si la cuenta del usuario está verificada en otras plataformas
  const checkVerification = async () => {
    // Establece que la función de verificación ha sido llamada
    setIsCheckVerificationCalled(true);

    // Comprueba si el usuario está autenticado (si tiene un email registrado)
    if (!emailFromAuth) {
      console.log("User not authenticated");
      return; // Si no está autenticado, termina la función aquí
    }

    try {
      // Crea una referencia al documento en Firestore usando el email del usuario
      const docRef = doc(db, "estudiantesMappings", emailFromAuth);
      // Obtiene el documento de Firestore
      const docSnap = await getDoc(docRef);

      // Comprueba si el documento existe
      if (docSnap.exists()) {
        // Extrae los datos del documento
        const data = docSnap.data();

        // Comprueba si el campo 'discordUserID' en los datos no es nulo
        if (data && data.discordUserID !== null) {
          // Si 'discordUserID' no es nulo, significa que el usuario está verificado en Discord
          setIsVerified(true);
        } else {
          // Si 'discordUserID' es nulo, el usuario no está verificado en Discord
          setIsVerified(false);
        }
      } else {
        // Si el documento no existe, el usuario no está verificado
        setIsVerified(false);
      }
    } catch (error) {
      // Manejo de errores en caso de problemas al acceder a Firestore
      console.error("Error checking verification: ", error);
      setIsVerified(false);
    }
  };

  // Función para recargar la página sin parámetros en la URL
  function reloadWithoutParams() {
    // Obtén la URL actual sin los parámetros de consulta (query parameters)
    const currentURLWithoutParams =
      window.location.origin + window.location.pathname;

    // Navega a la URL modificada, que es la URL base sin parámetros
    window.location.href = currentURLWithoutParams;

    // Recarga la página para asegurar que se cargue con la URL limpia
    window.location.reload();
  }

  // Función para publicar en una función de nube de Trello y vincular la cuenta
  const postToTrelloCloudFunction = () => {
    // Construye la URL de la función de nube que se va a llamar
    // Esta URL contiene la dirección del endpoint de la función de nube y pasa
    // el email y el token como parámetros de la consulta
    const url = `${process.env.REACT_APP_VERIFY_TRELLO_USER_CLOUD_FUNCTION_URL}?email=${emailFromAuth}&token=${tokenToPOST}`;

    // Realiza una llamada HTTP GET a la función de nube
    fetch(url, {
      method: "GET", // Método HTTP GET
      mode: "cors", // Modo CORS para permitir solicitudes entre dominios
      headers: { "Content-Type": "application/json" }, // Define el tipo de contenido como JSON
    })
      .then((response) => response.json()) // Convierte la respuesta en JSON
      .then((data) => {
        // Procesa la respuesta de la función de nube
        if (data && data[0].memberType === "normal") {
          // Si la respuesta indica que el usuario tiene una cuenta normal en Trello
          console.log("Success linking Trello account");
          setTrelloResponse("success"); // Actualiza el estado para reflejar el éxito en la vinculación
        } else if (data && data[0].memberType === "ghost") {
          // Si la respuesta indica que el usuario no tiene una cuenta en Trello
          console.log("User doesnt have Trello account");
          setTrelloResponse("notTrelloUser"); // Actualiza el estado para reflejar que no es un usuario de Trello
        } else {
          // Si la respuesta es otra cosa (por ejemplo, un error)
          console.log("Cloud function response:", data);
          setTrelloResponse("undefined"); // Actualiza el estado para reflejar una respuesta indefinida
        }
      })
      .catch((error) => {
        // Maneja cualquier error que ocurra durante la llamada a la función de nube
        console.error("Error calling cloud function:", error);
      });
  };

  // Interfaz de usuario: botones y mensajes para la autenticación y vinculación de cuentas
  return (
    <div className="p-4">
      {
        /* Condicional para mostrar diferentes elementos según el estado de autenticación */

        !isAuthenticated && !tokenInURL ? (
          /* Div contenedor para los botones de inicio y cierre de sesión con diseño centrado y fondo claro */
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            {/* Botón para iniciar sesión con Google, al hacer clic llama a handleGoogleSignIn */}
            <button
              onClick={handleGoogleSignIn}
              className="bg-blue-500 text-white p-4 rounded"
            >
              Iniciar sesión
            </button>
            {/* Botón para cerrar sesión, al hacer clic llama a handleSignOut */}
            <button
              onClick={handleSignOut}
              className="bg-red-500 text-white p-4 rounded ml-4"
            >
              Salir
            </button>
          </div>
        ) : (
          /* Div contenedor para la interfaz de usuario post-autenticación */
          <div className="min-h-screen flex flex-col gap-3 items-center justify-center bg-gray-50">
            {/* Título de bienvenida */}
            <h1 className="text-2xl font-semibold mb-4">
              ¡Bienvenido! Vincula tus otras cuentas
            </h1>

            {/* Div contenedor para mostrar el estado de verificación de la cuenta de Discord */}
            <div
              className={
                isVerified
                  ? "bg-green-500 text-white font-bold py-2 px-4 rounded-full text-center"
                  : "bg-blue-500 text-white font-bold py-2 px-4 rounded-full text-center"
              }
            >
              {isVerified
                ? "Cuenta de Discord correctamente verificada"
                : "Vincular cuenta de Discord"}
            </div>

            {/* Condición para mostrar instrucciones si la cuenta no está verificada */}
            {!isVerified && (
              /* Div contenedor para instrucciones de vinculación con Discord */
              <div className="mt-4 p-4 border rounded bg-gray-100">
                <p className="text-lg font-semibold">
                  Instrucciones para vincular Discord:
                </p>
                {/* Lista ordenada para las instrucciones */}
                <ol className="list-decimal ml-8 mt-2">
                  <li>
                    Abrir Discord y dirigirse al servidor donde se encuentra el
                    bot.
                  </li>
                  <li>Enviar el siguiente comando en el chat:</li>
                  {/* Div contenedor para el comando a enviar en Discord */}
                  <pre className="mt-2 bg-gray-200 p-2 rounded">
                    <code>{`/linkaccounts --code ${uniqueCode} --email ${emailFromAuth}`}</code>
                  </pre>
                  <li>
                    Asegúrate de estar conectado en Discord con la cuenta que
                    deseas verificar.
                  </li>
                </ol>
              </div>
            )}

            {/* Botón para comprobar si el usuario está verificado, llama a checkVerification al hacer clic */}
            {!isCheckVerificationCalled && (
              <button
                onClick={checkVerification}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full"
              >
                Revisar si estoy verificado
              </button>
            )}
            {/* Condición para mostrar un botón diferente si la verificación ya fue solicitada */}
            {isCheckVerificationCalled &&
              (isVerified ? (
                <span className=""></span>
              ) : (
                <button
                  onClick={checkVerification}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full"
                >
                  Intenta de nuevo
                </button>
              ))}

            {
              /* Comprueba si la respuesta de Trello es nula, lo que indica que aún no se ha intentado vincular la cuenta */
              trelloResponse === null && (
                <button
                  /* El evento onClick decide qué función llamar dependiendo de si ya se obtuvo un token */
                  onClick={
                    tokenToPOST ? postToTrelloCloudFunction : linkTrelloAccount
                  }
                  /* Estilos del botón usando Tailwind CSS */
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full ml-4"
                >
                  {/* El texto del botón cambia según si ya se tiene un token o no */}
                  {tokenToPOST
                    ? "Enlazar cuenta a la ESAT"
                    : "Vincular cuenta de Trello"}
                </button>
              )
            }

            {
              /* Condición para mostrar un mensaje si la vinculación con Trello fue exitosa */
              trelloResponse === "success" && (
                <div
                  /* Estilos del mensaje de éxito */
                  className="bg-[#EF7D00] text-white font-bold py-2 px-4 rounded-full ml-4"
                >
                  Cuenta de Trello correctamente vinculada
                </div>
              )
            }

            {
              /* Condición para mostrar un enlace si el usuario no tiene cuenta en Trello */
              trelloResponse === "notTrelloUser" && (
                <a
                  /* Enlace para registrarse en Trello */
                  href="https://trello.com/signup"
                  target="_blank"
                  rel="noreferrer"
                  /* Evento onClick para recargar la página sin parámetros */
                  onClick={reloadWithoutParams}
                  /* Estilos del enlace usando Tailwind CSS */
                  className="bg-yellow-500 hover:bg-yellow-400 text-white font-bold py-2 px-4 rounded-full ml-4"
                >
                  Debes de tener una cuenta en Trello, crea una aquí
                </a>
              )
            }

            {
              /* Condición para mostrar un mensaje en caso de una respuesta indefinida de la función de nube */
              trelloResponse === "undefined" && (
                <div
                  /* Estilos del mensaje de error */
                  className="bg-red-200 text-white font-bold py-2 px-4 rounded-full ml-4"
                >
                  Error desconocido, contacta a soporte.
                </div>
              )
            }
          </div>
        )
      }
    </div>
  );
};

export default App;
