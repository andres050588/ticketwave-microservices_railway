export default async function handleTicketCancellato(message) {
    const data = JSON.parse(message)
    console.log("Ticket cancellato ricevuto:", data)
}
