function saveAnswer(params, payloads) {
    // Из params получаем taskId
    // Из payloads получаем ответ
    // Сохраняем ответ в БД
}

function handleMatch(taskContainer) {
    // Вызов функции saveAnswer
}

function answerMatch(taskContainer, payloads) {
    // Обработка соотнесения слова с переводом
}

function resetMatch(taskContainer) {
    // Сбрасываем все соотнесения слов с переводами
}

function handleUnscramble(taskContainer) {
    // Вызов функции saveAnswer
}

function answerUnscramble(taskContainer, payloads) {
    // Обработка расстановки букв
}

function resetUnscramble(taskContainer) {
    // Сбрасываем все стили
}

function handleLabel(taskContainer) {

}

function handleBlanks(taskContainer) {

}

function handleNote(taskContainer) {

}

function handleArticle(taskContainer) {

}

function handleTest(taskContainer) {

}

function handleStatements(taskContainer) {

}

function handleSentences(taskContainer) {

}

function handleEssay(taskContainer) {

}

function handleInteractions(taskContainer) {

}

function handleColumns(taskContainer) {

}

function contentHandler(taskContainer) {
    // Вызываем нужную функцию в зависимости от типа задания
}

function prohibitCopying() {
    // Запрет копирования всех страниц
}

function allowCopying() {
    // Разрешаем копирование всех страниц
}

function setTimer(seconds) {

}

function stopTimer() {

}





// ВебСокет
const socket = new WebSocket(`ws://${window.location.host}/ws/classroom/${classroomId}/`);

socket.onopen = () => {
    // Передача сообщения о подключении пользователя учителю
}

socket.onmessage = (event) => {
    // Обработка полученных от учителя ответов
    // Обработка событий сброса задания, его скрытия, редактирования
}