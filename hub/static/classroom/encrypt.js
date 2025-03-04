function init(taskContainer) {
    // Добавление обработки кликов
    // Важно! Не стоит использовать event для вызова handleAnswer
}

function handleAnswer(params, isRemote) {
    // Обработка клика
    // Отправка в WebSocket
    // Сохранение ответов
}

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.message_type === 'taskType') {
        // Обработка ответа, вызов handleAnswer
    }
}

function uploadAnswers(payloads) {
    // Заполнение всех ответов
}

function resetTask(taskContainer) {
    // Сброс всех полей и стилей до начального состояния
}