export default async function handleUserAggiornato(message) {
    const user = JSON.parse(message)
    console.log("User aggiornato ricevuto:", user)
}
