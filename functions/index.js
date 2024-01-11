
const functions = require("firebase-functions");
const nacl = require('tweetnacl');
const { Client } = require('discord.js');
const { InteractionType, InteractionResponseType } = require('discord-interactions');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');

// Inicializa Firebase Admin para interactuar con servicios de Firebase como Firestore
admin.initializeApp();

 exports.helloWorld = functions.https.onRequest((request, response) => {

    response.send("Hola desde Firebase!");
    
 });


// Esta función se activa cuando recibe una solicitud HTTP desde Discord.
exports.discordLinkAccounts = functions.https.onRequest(async (req, res) => {

   // Obtener la clave pública de Discord desde la configuración de Firebase Functions.
   const PUBLIC_KEY = functions.config().discord.public_key;
 
   // Recoger la firma y el sello de tiempo de la solicitud para verificación.
   const signature = req.header('X-Signature-Ed25519');
   const timestamp = req.header('X-Signature-Timestamp');
   const body = JSON.stringify(req.body);  // Convertir el cuerpo de la solicitud a un string para la verificación.
   
   // Verificar la firma usando criptografía de clave pública.
   const isVerified = nacl.sign.detached.verify(
     Buffer.from(timestamp + body),
     Buffer.from(signature, 'hex'),
     Buffer.from(PUBLIC_KEY, 'hex')
   );
   
   // Si la firma no es válida, rechazar la solicitud.
   if (!isVerified) {
     return res.status(401).end('Invalid request signature');
   }
   
   // Manejar la interacción con Discord.
   const { type, data } = req.body;

   // Comprobación de tipo de interacción de Discord (Ping, Slash Command, etc.).
   if (type === InteractionType.PING) {
     // Responder a los Pings de Discord para mantener la conexión activa.
     return res.status(200).send({ type: InteractionResponseType.PONG });
   }

   // Manejo específico para comandos Slash.
   if (type === 2) {  // El tipo '2' corresponde a los comandos Slash.

     console.log("Command slash type detected");

     // Responder inmediatamente a Discord para evitar timeouts.
     res.status(200).send({
       type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
     });

     // Extracción del nombre del comando y las opciones proporcionadas.
     const { name, options } = data;

     // Procesar el comando 'linkaccount' para enlazar cuentas.
     if (name === 'linkaccount') {
       
       console.log("linkaccount detected");

       // Obtener los parámetros del comando (código único y email).
       const uniqueCode = options.find(opt => opt.name === 'code').value;
       const emailFromDiscord = options.find(opt => opt.name === 'email').value;

       // Buscar en Firestore si existe una entrada para el email proporcionado.
       const docRef = admin.firestore().collection('estudiantesMappings').doc(emailFromDiscord);
       const doc = await docRef.get();

       // Verificar si el documento existe en Firestore.
       if (doc.exists) {

         // Comparar el código único proporcionado con el almacenado en Firestore.
         const storedUniqueCode = doc.data().uniqueCode;

         if (storedUniqueCode === uniqueCode) {

           // Si los códigos coinciden, actualizar la entrada de Firestore con el ID de usuario de Discord.
           await doc.ref.update({ discordUserID: req.body.member.user.id });

           // Enviar un mensaje de éxito a Discord.
           await editOriginalMessage("Cuenta de Discord correctamente asociada");

         } else {
           // Enviar un mensaje de error si los códigos no coinciden.
           return res.send({
             type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
             data: {
               content: 'Código único inválido'
             }
           });
         }
       } else {
         // Enviar un mensaje de error si el email no se encuentra en Firestore.
         return res.send({
           type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
           data: {
             content: 'Email no encontrado'
           }
         });
       }
     }
   }

   // Responder con un mensaje de comando no soportado si se recibe otro tipo de comando.
   return res.send({
     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
     data: {
       content: 'Unsupported command'
     }
   });
});


// Define la función que busca información de un usuario en Trello utilizando su email y un token, y luego almacena la cuenta de Trello en Firestore si el usuario existe. 
exports.linkTrelloAccount = functions.https.onRequest((req, res) => {
   // Imprime un mensaje de log para seguimiento
   console.log("linkTrelloAccount final version with data logs and data[0] changed to data");

   // Obtener la clave de la API de Trello desde la configuración de Firebase Functions.
   const API_KEY = functions.config().trello.api_key;
 
   // Maneja las solicitudes CORS para permitir o restringir el acceso a la función
   cors(req, res, async () => {
     // Obtiene los parámetros 'email' y 'token' de la solicitud
     const email = req.query.email;
     const token = req.query.token;
 
     // Imprime los parámetros para seguimiento
     console.log("Query params from getUserInfoFromTrello:", email, token);
 
     // Verifica si el email y el token están presentes
     if (!email || !token) {
       // Si faltan, envía una respuesta de error
       res.status(400).json({ message: 'Email and API Token are required' });
       return;
     }
 
     // Construye la URL para la API de Trello
     const apiUrl = `https://api.trello.com/1/search/members?query=${email}&key=${API_KEY}&token=${token}`;
 
     try {
       // Realiza una solicitud HTTP a la API de Trello y espera la respuesta
       const response = await fetch(apiUrl);
       const data = await response.json();
 
       // Imprime los datos recibidos para seguimiento
       console.log("data", data);
 
       // Verifica si el usuario tiene una cuenta de Trello normal
       if (data && data[0].memberType === "normal") {
         // Almacena la información del usuario de Trello en Firestore
         const docRef = admin.firestore().collection('estudiantesMappings').doc(email);
         await docRef.set({
           trelloUsername: data[0].username,
           trelloUserId: data[0].id
         }, { merge: true });
 
         // Envía una respuesta exitosa con los datos de Trello
         res.status(200).send(data);
 
       } else if (data && data[0].memberType === "ghost") {
         // Maneja el caso en que el usuario no tiene una cuenta de Trello
         console.log("User doesn't have a Trello account");
         console.log("data not Trello user", data);
 
         // Envía una respuesta con los datos indicando que no tiene cuenta de Trello
         res.status(200).send(data);
 
       } else {
         // En caso de que el usuario no se encuentre, envía una respuesta de error
         res.status(404).json({ message: 'User not found' });
       }
     } catch (error) {
       // Maneja cualquier error en la solicitud HTTP
       console.error('Error fetching data from Trello:', error);
       res.status(500).json({ message: 'Internal Server Error' });
     }
   });
 });

 // Esta es una función asincrónica que envía mensajes a Discord.
async function sendDiscordNotification(message) {

  // URL del webhook de Discord
  const WEBHOOK_URL= functions.config().discord.webhook_url;

  // Realiza una petición HTTP POST a Discord
  await fetch(WEBHOOK_URL, {
    method: 'POST', // Tipo de petición: POST
    headers: {
      'Content-Type': 'application/json' // Especifica que el contenido es JSON
    },
    body: JSON.stringify({ content: message }) // Convierte el mensaje a JSON y lo envía
  });
  console.log("Message sent to Discord"); // Registra en consola que el mensaje fue enviado
}


// Esta función maneja las peticiones HTTP a tu Cloud Function
exports.trelloWebhookToDiscordHandler = functions.https.onRequest(async (request, response) => {

  console.log("trelloWebhookToDiscordHandler called with request corrected");

  try {
    // Revisa si el método de la petición es HEAD y responde con 'OK'
    if (request.method === 'HEAD') {
      response.status(200).send('OK');
      return;
    }
    
    const { body } = request; // Obtiene el cuerpo de la petición

    // Verifica si el cuerpo de la petición tiene la estructura esperada
    if (!body || !body.action || !body.action.data || !body.action.data.text) {
      console.log("Invalid request, action or text missing");
      response.status(400).send('Bad Request');
      return;
    }

    const commentText = body.action.data.text; // Extrae el texto del comentario de Trello

    // Si el texto del comentario incluye '@', envía una notificación a Discord
    if (commentText.includes('@')) {

      await sendDiscordNotification(`Un nuevo comentario de Trello incluye una mención: ${commentText}`);
      
    }

    // Responde a la petición con 'OK'
    response.status(200).send('OK');

  } catch (error) {
    console.error("An error occurred:", error);
    response.status(500).send('Internal Server Error'); // Maneja errores no esperados
  }
});
