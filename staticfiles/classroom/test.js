// Обработка выбора ответа
function handleTestAnswerSelect(input) {
    const taskId = input.closest('.task-item').id.replace('task-', '');
    const questionId = input.dataset.questionId;
    const answerId = input.dataset.answerId;

    // Сохранение ответа
    saveUserAnswer(taskId, classroomId, {
        question_id: questionId,
        answer_id: answerId,
        type: 'test'
    });

    // Отправка через WebSocket
    sendMessage('TEST_ANSWER', "all", {
        taskId: taskId,
        questionId: questionId,
        answerId: answerId
    });
}

// Проверка теста
function checkTest(taskId) {
    const form = document.querySelector(`#task-${taskId} .test-form`);
    form.querySelectorAll('.answer-item').forEach(item => {
        const input = item.querySelector('input');
        const isCorrect = item.classList.contains('correct-answer');

        if (input.checked) {
            item.classList.add(isCorrect ? 'text-success' : 'text-danger');
            input.disabled = true;
        }
    });
}

// Инициализация теста
function initTestTask() {
    // Обработка выбора радио-кнопок
    document.querySelectorAll('.test-form input[type="radio"]').forEach(input => {
        input.addEventListener('change', function() {
            handleTestAnswerSelect(this);
        });
    });

    // Обработка кнопки проверки
    document.querySelectorAll('.check-test-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const taskId = this.closest('.task-item').id.replace('task-', '');
            checkTest(taskId);
        });
    });
}

function resetTestTask(taskId) {
    // Находим контейнер задачи
    const taskContainer = document.getElementById(`task-${taskId}`);
    if (!taskContainer) {
        console.error(`Контейнер с id "task-${taskId}" не найден.`);
        return;
    }

    // Сбрасываем все выбранные радио-кнопки
    const radioButtons = taskContainer.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        console.log(radio);
        radio.checked = false; // Снимаем выбор
        radio.disabled = false; // Включаем радио-кнопки, если они были отключены
    });

    // Убираем подсветку правильных/неправильных ответов
    const answerItems = taskContainer.querySelectorAll('.answer-item');
    answerItems.forEach(item => {
        item.classList.remove('bg-success', 'bg-danger'); // Убираем стили
    });

    // Включаем кнопку "Проверить тест"
    const checkButton = taskContainer.querySelector('.check-test-btn');
    if (checkButton) {
        checkButton.disabled = false;
    }

    // Сбрасываем счет (если есть)
    const scoreDisplay = taskContainer.querySelector('.score-value');
    if (scoreDisplay) {
        scoreDisplay.innerText = 0;
        scoreDisplay.dataset.realScore = 0;
    }

    console.log(`Тестовое задание с id "task-${taskId}" успешно сброшено.`);
}


document.addEventListener('DOMContentLoaded', function() {
    initTestTask();
});