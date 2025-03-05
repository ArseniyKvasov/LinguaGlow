function fillBlanksHandleInput(event, isRemote=false) {
    const input = event.target;
    const correctAnswer = input.dataset.correct;
    const taskId = input.dataset.taskId;
    const blankId = input.dataset.blankId;

    // Проверяем, является ли событие удаленным
    const isRemoteEvent = event.isRemote || isRemote;

    const isCorrect = input.value.trim().toLowerCase() === correctAnswer.toLowerCase();

    // Визуальная обратная связь
    input.classList.remove('correct-answer', 'incorrect-answer');
    input.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');

    if (isCorrect) {
        input.disabled = true;

        // Находим соответствующее слово в списке и отмечаем его как использованное
        const wordItem = document.querySelector(`.word-item[data-word="${correctAnswer}"]:not(.used)`);
        if (wordItem) {
            wordItem.classList.add('used'); // Зачеркиваем и делаем полупрозрачным
        }

        // Переход к следующему пропуску
        const nextInput = input.parentElement.nextElementSibling?.querySelector('.blank-input');
        nextInput?.focus();

        if (!isRemoteEvent) {
            // Сохранение ответа
            saveUserAnswer(taskId, classroomId, {
                blankId: blankId,
                answer: input.value,
                type: 'fill_blank'
            });

            // Отправка сообщения о завершении
            sendMessage('FILL_BLANK_ANSWER', "all", {
                taskId: taskId,
                blankId: blankId,
                status: 'completed',
                answer: input.value
            });
        }
    } else {
        // Неверный ответ - анимация
        if (!isRemoteEvent) {
            // Сохранение ответа
            saveUserAnswer(taskId, classroomId, {
                blankId: blankId,
                answer: input.value,
                type: 'fill_blank'
            });

            // Отправка сообщения о завершении
            sendMessage('FILL_BLANK_ANSWER', "all", {
                taskId: taskId,
                blankId: blankId,
                status: 'incorrect',
                answer: input.value
            });
        }

        input.style.transform = 'translateX(5px)';
        setTimeout(() => { input.style.transform = ''; }, 100);
    }

    // Автоматическое изменение ширины
    input.style.width = '60px';
    input.style.width = Math.max(input.scrollWidth+10, 60) + 'px';
}

// Инициализация для новых инпутов
function fillBlanksInit() {
    document.querySelectorAll('.blank-input:not([disabled])').forEach(input => {
        input.addEventListener('blur', fillBlanksHandleInput);


        // Подсказка для учителей
        input.addEventListener('mouseenter', function (e) {
            if (this.parentElement.querySelector('.correct-tooltip')) {
                this.parentElement.querySelector('.correct-tooltip').style.display = 'block';
            }
        });
        input.addEventListener('mouseleave', function (e) {
            if (this.parentElement.querySelector('.correct-tooltip')) {
                this.parentElement.querySelector('.correct-tooltip').style.display = 'none';
            }
        });
    });
}

function resetFillBlanksTask(taskId) {
    const task = document.getElementById(taskId);
    task.querySelectorAll('.blank-input').forEach(input => {
        input.value = '';
        input.classList.remove('correct-answer', 'incorrect-answer');
    });
}

document.addEventListener('DOMContentLoaded', fillBlanksInit);