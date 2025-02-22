function addUnscrambleButtonsListeners(taskContainer) {
    const taskId = taskContainer.id.replace('task-', '');

    // Находим кнопку сброса
    const resetButton = taskContainer.querySelector('.reset-button');
    resetButton.addEventListener('click', () => {
        sendMessage('reset', 'all', { task_id: taskId, classroom_id: classroomId, type: 'unscramble' });
        saveUserAnswer(taskId, classroomId, {}, "reset");
    });

    // Находим все кнопки с буквами
    const letterButtons = taskContainer.querySelectorAll('.scrambled-letter');
    const letterInputs = taskContainer.querySelectorAll('.letter-input');

    // Обработчики событий для кнопок с буквами
    letterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const letter = button.getAttribute('data-letter');
            const firstEmptyInput = Array.from(letterInputs).find(input => input.value === '');
            if (firstEmptyInput) {
                firstEmptyInput.value = letter;
                button.classList.add('disabled');
                button.disabled = true;
            }
        });
    });

    // Обработчики событий для полей букв
    letterInputs.forEach(input => {
        input.addEventListener('click', () => {
            const letter = input.value;
            const scrambledLetterButton = Array.from(letterButtons).find(button => button.getAttribute('data-letter') === letter);
            if (scrambledLetterButton) {
                input.value = '';
                scrambledLetterButton.classList.remove('disabled');
                scrambledLetterButton.disabled = false;
            }
        });
    });

    // Кнопка "Проверить"
    const checkButton = taskContainer.querySelector('.check-button');
    checkButton.addEventListener('click', () => {
        const correctLetters = Array.from(letterInputs).map(input => input.value);
        const correctWord = correctLetters.join('');
        const correctWordsContainer = taskContainer.querySelector('.correct-words');
        const correctWords = JSON.parse(correctWordsContainer.getAttribute('data-words'));

        // Проверяем правильность слова
        const isCorrect = correctWords.some(word => word.original_word.toLowerCase() === correctWord.toLowerCase());

        if (isCorrect) {
            highlightCorrectLetters(letterInputs, 'bg-success');
            moveToNextWord(taskContainer, taskId);
        } else {
            highlightIncorrectLetters(letterInputs, 'bg-danger');
            setTimeout(() => {
                highlightIncorrectLetters(letterInputs, 'bg-light');
            }, 500);
        }
    });
}

// Функция для подсветки правильных букв зелёным
function highlightCorrectLetters(inputs, className) {
    inputs.forEach(input => input.classList.add(className));
}

// Функция для подсветки неправильных букв красным
function highlightIncorrectLetters(inputs, className) {
    inputs.forEach(input => input.classList.add(className));
}

// Функция для перехода к следующему слову
function moveToNextWord(taskContainer, taskId) {
    const correctWordsContainer = taskContainer.querySelector('.correct-words');
    const correctWords = JSON.parse(correctWordsContainer.getAttribute('data-words'));
    const currentWordIndex = Array.from(taskContainer.querySelectorAll('.word-field')).indexOf(taskContainer.querySelector('.word-field.active'));
    const nextWordIndex = (currentWordIndex + 1) % correctWords.length;

    // Переключаем активное слово
    Array.from(taskContainer.querySelectorAll('.word-field')).forEach(field => field.classList.remove('active'));
    Array.from(taskContainer.querySelectorAll('.scrambled-letters')).forEach(field => field.classList.remove('active'));
    Array.from(taskContainer.querySelectorAll('.word-field'))[nextWordIndex].classList.add('active');
    Array.from(taskContainer.querySelectorAll('.scrambled-letters'))[nextWordIndex].classList.add('active');
}

// Функция для сброса задания
function resetUnscrambleTask(taskId) {
    const taskContainer = document.getElementById(`task-${taskId}`);
    const letterButtons = taskContainer.querySelectorAll('.scrambled-letter');
    const letterInputs = taskContainer.querySelectorAll('.letter-input');

    letterButtons.forEach(button => {
        button.classList.remove('disabled');
        button.disabled = false;
    });

    letterInputs.forEach(input => {
        input.value = '';
    });

    moveToNextWord(taskContainer, taskId);
}

// Функция для обновления счета
function updateUnscrambleScore(task_id, score) {
    const taskContainer = document.getElementById(`task-${task_id}`);
    const scoreDisplay = taskContainer.querySelector('.score-value');
    const maxScore = taskContainer.querySelector('.correct-words').dataset.maxScore;
    scoreDisplay.dataset.realScore = score;
    if (score <= maxScore && score >= 0) {
        scoreDisplay.innerText = score;
    } else {
        if (score < 0) {
            scoreDisplay.innerText = 0;
        } else {
            scoreDisplay.innerText = maxScore;
        }
    }
}

// Добавляем обработчики событий для всех контейнеров заданий
const taskContainers = document.querySelectorAll("[data-task-type='unscramble']");
taskContainers.forEach(taskContainer => {
    addUnscrambleButtonsListeners(taskContainer);
});