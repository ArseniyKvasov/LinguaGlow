// Обработка ввода подписи
function handleLabelInput(event) {
    console.log('Key pressed:', event.key); // Проверяем, какая клавиша нажата

    if (event.key !== 'Enter') return; // Проверяем только по нажатию Enter

    const input = event.target;
    const taskId = input.dataset.taskId;
    const imageId = input.dataset.imageId;
    const correctLabel = input.dataset.correctLabel; // Правильная подпись для картинки
    const userAnswer = input.value.trim();

    // Проверяем, соответствует ли введенное слово правильной подписи
    const isCorrect = userAnswer.toLowerCase() === correctLabel.toLowerCase();

    // Подсветка поля ввода
    input.classList.remove('is-valid', 'is-invalid');
    input.classList.add(isCorrect ? 'is-valid' : 'is-invalid');

    // Помечаем слово как использованное (если оно есть в списке)
    const wordList = document.querySelectorAll(`#task-${taskId} .word-item`);
    wordList.forEach(wordItem => {
        if (wordItem.dataset.word.toLowerCase() === userAnswer.toLowerCase() && !wordItem.classList.contains('used') && isCorrect) {
            wordItem.classList.add('used');
        }
    });

    // Сохранение ответа
    saveUserAnswer(taskId, classroomId, {
        image_id: imageId,
        label: userAnswer,
        is_correct: isCorrect,
        type: 'label_images'
    });

    // Отправка через WebSocket
    sendMessage('LABEL_IMAGE_ANSWER', "all", {
        taskId: taskId,
        imageId: imageId,
        label: userAnswer,
        isCorrect: isCorrect
    });
}

// Инициализация задания
function initLabelImagesTask() {
    document.querySelectorAll('.label-image').forEach(input => {
        input.addEventListener('blur', handleLabelInput); // Слушаем потерю фокуса
    });
}


// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function () {
    initLabelImagesTask();
});

function resetLabelImagesTask(taskId) {
    // Находим контейнер задачи
    const taskContainer = document.getElementById(`task-${taskId}`);
    if (!taskContainer) {
        console.error(`Контейнер с id "task-${taskId}" не найден.`);
        return;
    }

    // Сбрасываем все текстовые поля
    const inputs = taskContainer.querySelectorAll('.label-input');
    inputs.forEach(input => {
        input.value = ''; // Очищаем поле ввода
        input.classList.remove('is-valid', 'is-invalid'); // Убираем подсветку
        input.disabled = false; // Включаем поле ввода, если оно было отключено
    });

    // Сбрасываем состояние слов в списке
    const wordItems = taskContainer.querySelectorAll('.word-item');
    wordItems.forEach(wordItem => {
        wordItem.classList.remove('used'); // Убираем отметку "использовано"
    });
}