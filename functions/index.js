
const functions = require("firebase-functions");

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
