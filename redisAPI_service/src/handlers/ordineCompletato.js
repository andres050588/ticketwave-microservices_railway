export default async function handleOrdineCompletato(message) {
    const data = JSON.parse(message)
    console.log("Ordine completato ricevuto:", data)
}
