export default async function handleOrdineCreato(message) {
    const data = JSON.parse(message)
    console.log("Ordine creato:", data)
}
