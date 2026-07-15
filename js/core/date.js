export function getToday() {
    const date = new Date();
    // Ajustar a la zona horaria local (UTC-5 para Colombia)
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().split('T')[0];
}
