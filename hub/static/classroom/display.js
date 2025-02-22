// Добавляем обработчики событий для всех кнопок
function addMatchWordsButtonsListeners(taskContainer) {
    const taskId = taskContainer.id.replace('task-', '');
    // Находим кнопку сброса
    const resetButton = taskContainer.querySelector('.reset-button');

    // Добавляем обработчик события
    resetButton.addEventListener('click', () => {
        // Отправляем сообщение о сбросе
        sendMessage('reset', 'all', {
            task_id: taskId,
            classroom_id: classroomId,
            type: 'match_words',
        });

        // Сохраняем сброшенное состояние
        saveUserAnswer(taskId, classroomId, {}, "reset");
    });

    const buttons = taskContainer.querySelectorAll('.match-btn');

    let selectedWordButton = null; // Выбранная кнопка из первой колонки
    let selectedTranslationButton = null; // Выбранная кнопка из второй колонки

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Если кнопка уже выбрана, ничего не делаем
            if (button.classList.contains('active')) {
                return;
            }

            // Если кнопка из первой колонки (data-word)
            if (button.hasAttribute('data-word')) {
                // Если уже выбрана другая кнопка из первой колонки, снимаем выделение
                if (selectedWordButton) {
                    selectedWordButton.classList.remove('active');
                }
                selectedWordButton = button; // Запоминаем выбранную кнопку
                button.classList.add('active'); // Добавляем класс active
            }

            // Если кнопка из второй колонки (data-translation)
            if (button.hasAttribute('data-translation')) {
                // Если уже выбрана другая кнопка из второй колонки, снимаем выделение
                if (selectedTranslationButton) {
                    selectedTranslationButton.classList.remove('active');
                }
                selectedTranslationButton = button; // Запоминаем выбранную кнопку
                button.classList.add('active'); // Добавляем класс active
            }

            // Если выбраны обе кнопки (одна из первой колонки и одна из второй)
            if (selectedWordButton && selectedTranslationButton) {
                // Получаем значения data-word и data-translation
                const word = selectedWordButton.getAttribute('data-word');
                const translation = selectedTranslationButton.getAttribute('data-translation');

                // Убираем класс active
                selectedWordButton.classList.remove('active');
                selectedTranslationButton.classList.remove('active');

                // Проверяем, правильно ли сопоставлены слова
                const isCorrect = checkPairCorrectness(word, translation);

                // Формируем payload
                const payload = {
                    task_id: taskId, // Извлекаем task_id из id контейнера
                    word: word,
                    translation: translation,
                    score: isCorrect ? 1 : -1, // 1 за правильный ответ, -1 за неправильный
                };

                // Отправляем сообщение
                sendMessage('match_pair', 'all', payload);
                saveUserAnswer(taskId, classroomId, payload)

                const scoreDisplay = taskContainer.querySelector('.score-value');
                if (isCorrect) {
                    scoreDisplay.dataset.realScore = parseInt(scoreDisplay.dataset.realScore) + 1;
                } else {
                    scoreDisplay.dataset.realScore = parseInt(scoreDisplay.dataset.realScore) - 1;
                }
                if (scoreDisplay.dataset.realScore >= 0) {
                    scoreDisplay.innerText = scoreDisplay.dataset.realScore;
                }

                // Сбрасываем выбранные кнопки
                selectedWordButton = null;
                selectedTranslationButton = null;
            }
        });
    });
    // Перемешиваем слова в колонках
    resizeMatchWords(taskContainer, true);
}

function checkPairCorrectness(word, translation) {
    // Находим контейнер с правильными парами
    const correctPairsContainer = document.querySelector('.correct-pairs');
    // Получаем данные о правильных парах из атрибута data-pairs
    const correctPairs = JSON.parse(correctPairsContainer.getAttribute('data-pairs'));

    // Проверяем, есть ли такая пара в правильных парах
    if (correctPairs[word] === translation) {
        return true;
    } else {
        return false;
    }
}

function handlePairSelection(task_id, word, translation, animation=true) {
    // Определяем контейнер
    const taskContainer = document.getElementById(`task-${task_id}`);

    // Проверяем корректность пары
    const isCorrect = checkPairCorrectness(word, translation);

    // Находим кнопки, соответствующие выбранным слову и переводу
    const wordButton = taskContainer.querySelector(`.match-btn[data-word="${word}"]`);
    const translationButton = taskContainer.querySelector(`.match-btn[data-translation="${translation}"]`);

    if (wordButton && translationButton) {
        if (isCorrect) {
            // Если пара верна, перемещаем кнопки вниз и применяем стили
            moveButtonsToBottom(taskContainer, wordButton, translationButton);
            wordButton.classList.add('btn-success');
            translationButton.classList.add('btn-success');
            wordButton.style.pointerEvents = 'none';
            translationButton.style.pointerEvents = 'none';
        } else {
            // Если пара неверна, временно отключаем кнопки и окрашиваем в красный
            if (animation) {
                disableButtonsTemporarily(wordButton, translationButton);
            }
        }
    }
}

// Функция для перемещения кнопок вниз
function moveButtonsToBottom(taskContainer, button1, button2) {
    const container = taskContainer.querySelector('.container'); // Контейнер, куда перемещаем кнопки

    // Создаем новую строку
    const newRow = document.createElement('div');
    newRow.classList = "row pair mb-2";

    // Добавляем кнопки в новую строку
    const col1 = document.createElement('div');
    col1.className = 'col-6';
    col1.appendChild(button1); // Перемещаем кнопку, не удаляя её из DOM

    const col2 = document.createElement('div');
    col2.className = 'col-6';
    col2.appendChild(button2); // Перемещаем кнопку, не удаляя её из DOM

    newRow.appendChild(col1);
    newRow.appendChild(col2);

    // Добавляем новую строку в конец контейнера
    container.appendChild(newRow);

    // Применяем стили к кнопкам
    button1.classList.add('btn-success');
    button2.classList.add('btn-success');
    button1.classList.remove('btn-outline-primary');
    button2.classList.remove('btn-outline-primary');
    button1.style.pointerEvents = 'none';
    button2.style.pointerEvents = 'none';

    resizeMatchWords(taskContainer);
}

// Функция для временного отключения кнопок
function disableButtonsTemporarily(button1, button2) {
    button1.classList.remove('btn-outline-primary');
    button2.classList.remove('btn-outline-primary');
    button1.classList.add('btn-danger');
    button2.classList.add('btn-danger');
    button1.disabled = true;
    button2.disabled = true;

    // Включаем кнопки через 0.5 секунды
    setTimeout(() => {
        button1.classList.remove('btn-danger');
        button2.classList.remove('btn-danger');
        button1.classList.add('btn-outline-primary');
        button2.classList.add('btn-outline-primary');
        button1.disabled = false;
        button2.disabled = false;
    }, 500);
}

function resizeMatchWords(taskContainer, shouldShuffle=false) {
    // Находим все кнопки, которые не имеют класса btn-success
    const buttons = taskContainer.querySelectorAll('.match-btn:not(.btn-success)');

    // Разделяем кнопки на два массива: wordButtons и translationButtons
    let wordButtons = [];
    let translationButtons = [];

    buttons.forEach(button => {
        if (button.hasAttribute('data-word')) {
            wordButtons.push(button);
        } else if (button.hasAttribute('data-translation')) {
            translationButtons.push(button);
        }
    });

    if (shouldShuffle) {
        const { shuffledWordButtons, shuffledTranslationButtons } = shuffleArrays(wordButtons, translationButtons);
        wordButtons = shuffledWordButtons; // Обновляем исходные массивы
        translationButtons = shuffledTranslationButtons;
    }

    // Находим контейнер
    const container = taskContainer.querySelector('.container');

    // Удаляем старые строки, которые не содержат кнопок с btn-success
    const oldRows = container.querySelectorAll('.row.pair.mb-2');
    oldRows.forEach(row => {
        if (!row.querySelector('.btn-success')) {
            row.remove(); // Удаляем строку, если в ней нет кнопок с btn-success
        }
    });

    // Создаем новые строки и добавляем кнопки сверху
    for (let i = Math.max(wordButtons.length, translationButtons.length); i >= 0; i--) {
        const newRow = document.createElement('div');
        newRow.className = 'row pair mb-2';

        // Добавляем кнопку из левой колонки (wordButtons)
        const col1 = document.createElement('div');
        col1.className = 'col-6';
        if (wordButtons[i]) {
            col1.appendChild(wordButtons[i]); // Перемещаем кнопку
        }
        newRow.appendChild(col1);

        // Добавляем кнопку из правой колонки (translationButtons)
        const col2 = document.createElement('div');
        col2.className = 'col-6';
        if (translationButtons[i]) {
            col2.appendChild(translationButtons[i]); // Перемещаем кнопку
        }
        newRow.appendChild(col2);

        // Вставляем новую строку в начало контейнера
        if (container.firstChild) {
            container.insertBefore(newRow, container.firstChild);
        } else {
            container.appendChild(newRow);
        }
    }
}

function shuffleArrays(wordButtons, translationButtons) {
    // Функция для перемешивания массива (алгоритм Фишера-Йетса)
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); // Случайный индекс от 0 до i
            [array[i], array[j]] = [array[j], array[i]]; // Меняем местами элементы
        }
        return array;
    }

    // Перемешиваем кнопки внутри своих колонок
    const shuffledWordButtons = shuffle([...wordButtons]);
    const shuffledTranslationButtons = shuffle([...translationButtons]);

    return {
        shuffledWordButtons,
        shuffledTranslationButtons,
    };
}

function resetMatchWordsTask(taskId) {
    // Находим контейнер задачи
    const taskContainer = document.getElementById(`task-${taskId}`);
    if (!taskContainer) {
        console.error(`Контейнер с id "task-${taskId}" не найден.`);
        return;
    }

    // Возвращаем кнопкам исходные стили и включаем их
    const buttons = taskContainer.querySelectorAll('.match-btn');
    buttons.forEach(button => {
        button.classList.remove('btn-success', 'btn-danger', 'active'); // Убираем все дополнительные классы
        button.classList.add('btn-outline-primary'); // Возвращаем исходный стиль
        button.style.pointerEvents = 'auto'; // Включаем кнопки
        button.disabled = false; // Включаем кнопки, если они были отключены
    });

    // Перемешиваем слова
    resizeMatchWords(taskContainer, true);

    const scoreDisplay = taskContainer.querySelector('.score-value');
    scoreDisplay.innerText = 0;
    scoreDisplay.dataset.realScore = 0;
}

function matchPairsScoreUpdate(task_id, score) {
    const taskContainer = document.getElementById(`task-${task_id}`);
    const scoreDisplay = taskContainer.querySelector('.score-value');
    const maxScore = taskContainer.querySelector('.correct-pairs').dataset.maxScore;

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

const taskContainers = document.querySelectorAll("[data-task-type='match-words']");
taskContainers.forEach(taskContainer => {
    addMatchWordsButtonsListeners(taskContainer);
});

