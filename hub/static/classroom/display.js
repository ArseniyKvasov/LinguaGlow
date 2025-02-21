document.addEventListener("DOMContentLoaded", function () {
    const taskContainers = document.querySelectorAll("[data-task-type='match-words']");
    taskContainers.forEach(taskContainer => {
        shuffleWords(taskContainer);
        const resetButton = document.createElement("button");
        resetButton.textContent = "Сбросить";
        resetButton.className = "btn btn-warning mt-3";
        resetButton.addEventListener("click", () => {
            const taskId = taskContainer.id.replace('task-', '');
            sendMessage("reset", "all", {task_id: taskId, classroom_id: classroomId, type: "match_words"});
            saveUserAnswer(taskId, classroomId, {}, "reset");
            resetMatchWordsTask(taskId);
        });
        taskContainer.querySelector(".card-footer").appendChild(resetButton);
    });
});

document.querySelectorAll('.match-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const taskContainer = this.closest('[data-task-type="match-words"]');
        const taskId = taskContainer.id.replace('task-', '');
        const isWord = this.hasAttribute('data-word');

        // Сброс активных кнопок
        const columnButtons = isWord
            ? taskContainer.querySelectorAll('.match-btn[data-word]')
            : taskContainer.querySelectorAll('.match-btn[data-translation]');
        columnButtons.forEach(button => button.classList.remove('active'));

        this.classList.add('active');

        const activeBtn = taskContainer.querySelector(`.match-btn.active:not([data-word="${this.dataset.word}"]):not([data-translation="${this.dataset.translation}"])`);

        if (activeBtn) {
            const word = isWord ? this.dataset.word : activeBtn.dataset.word;
            const translation = isWord ? activeBtn.dataset.translation : this.dataset.translation;
            console.log(word, translation);

            const correct_pairs = JSON.parse(taskContainer.querySelector('.correct-pairs').dataset.pairs);
            const isMatchCorrect = checkPairCorrectness(correct_pairs, word, translation);

            const scoreDisplay = taskContainer.querySelector('.score-value');
            if (isMatchCorrect) {
                scoreDisplay.dataset.realScore = parseInt(scoreDisplay.dataset.realScore) + 1;
            } else {
                scoreDisplay.dataset.realScore = parseInt(scoreDisplay.dataset.realScore) - 1;
            }
            if (scoreDisplay.dataset.realScore >= 0) {
                scoreDisplay.innerText = scoreDisplay.dataset.realScore;
            }

            const payload = {
                task_id: taskId,
                word: word,
                translation: translation,
                score: isMatchCorrect ? 1 : -1,
            };

            sendMessage('match_pair', 'all', payload);
            saveUserAnswer(taskId, classroomId, payload);

            handlePairMatch(taskId, word, translation);
        }
    });
});

function handlePairMatch(task_id, word, translation) {
    const taskContainer = document.getElementById(`task-${task_id}`);

    const correct_pairs = JSON.parse(taskContainer.querySelector('.correct-pairs').dataset.pairs);

    // Выбираем соответствующие кнопки из интерфейса
    const existingWordButton = taskContainer.querySelector(`[data-word="${word}"]`);
    const existingTranslationButton = taskContainer.querySelector(`[data-translation="${translation}"]`);

    if (!checkPairCorrectness(correct_pairs, word, translation)) {
        handleIncorrectMatch(taskContainer, word, translation);
        existingWordButton.classList.remove('active');
        existingTranslationButton.classList.remove('active');
        return;
    }

    // Создаем новые кнопки для верной пары
    const pairButtonWord = document.createElement('button');
    const pairButtonTranslation = document.createElement('button');

    pairButtonWord.className = 'match-btn btn btn-success fs-6 fw-bold w-100 p-2 shadow-sm mb-2';
    pairButtonTranslation.className = 'match-btn btn btn-success fs-6 fw-bold w-100 p-2 shadow-sm mb-2';

    pairButtonWord.innerText = word;
    pairButtonTranslation.innerText = translation;

    pairButtonWord.style.pointerEvents = 'none'; // Делаем кнопки некликабельными
    pairButtonTranslation.style.pointerEvents = 'none';

    // Находим соответствующие колонки
    const wordColumn = taskContainer.querySelector('.col-6:first-child');
    const translationColumn = taskContainer.querySelector('.col-6:last-child');

    if (existingWordButton && existingTranslationButton) {
        existingWordButton.remove();
        existingTranslationButton.remove();

        // Добавляем кнопки в конец соответствующих колонок
        wordColumn.appendChild(pairButtonWord);
        translationColumn.appendChild(pairButtonTranslation);
    }
}

function handleIncorrectMatch(taskContainer, word, translation) {
    const wordColumn = taskContainer.querySelector('.col-6:first-child');
    const translationColumn = taskContainer.querySelector('.col-6:last-child');

    const btn1 = wordColumn.querySelector(`[data-word="${word}"]`);
    const btn2 = translationColumn.querySelector(`[data-translation="${translation}"]`);
    btn1.classList.add('btn-danger', 'disabled');
    btn2.classList.add('btn-danger', 'disabled');
    btn1.classList.remove('btn-outline-primary');
    btn2.classList.remove('btn-outline-primary');

    setTimeout(() => {
        btn1.classList.remove('btn-danger', 'disabled');
        btn2.classList.remove('btn-danger', 'disabled');
        btn1.classList.add('btn-outline-primary');
        btn2.classList.add('btn-outline-primary');
    }, 500);
}

function checkPairCorrectness(correctPairs, word, translation) {
    return Object.entries(correctPairs).some(
        ([correctWord, correctTranslation]) =>
            correctWord === word && correctTranslation === translation
    );
}

function shuffleWords(taskContainer) {
    const columns = taskContainer.querySelectorAll(".col-6");
    if (columns.length < 2) return;

    const [wordColumn, translationColumn] = columns;

    // Сохраняем исходные пары перед перемешиванием
    const originalPairs = Array.from(
        taskContainer.querySelectorAll('.match-btn[data-word]')
    ).map(btn => ({
        word: btn.dataset.word,
        translation: btn.closest('.task-container')
            .querySelector(`[data-translation="${btn.dataset.word}"]`)
            ?.dataset.translation
    }));

    // Перемешиваем элементы в колонках
    shuffleArray(wordColumn.children);
    shuffleArray(translationColumn.children);

    // Выравниваем высоты по позициям
    syncHeightsByPosition(taskContainer);
}

// Новая функция для синхронизации высот по позициям
function syncHeightsByPosition(taskContainer) {
    const wordButtons = Array.from(
        taskContainer.querySelectorAll('.col-6:first-child .match-btn')
    );
    const transButtons = Array.from(
        taskContainer.querySelectorAll('.col-6:last-child .match-btn')
    );

    const maxLength = Math.max(wordButtons.length, transButtons.length);

    for (let i = 0; i < maxLength; i++) {
        const wordBtn = wordButtons[i];
        const transBtn = transButtons[i];

        if (!wordBtn || !transBtn) continue;

        // Сбрасываем высоты перед расчетом
        wordBtn.style.height = '';
        transBtn.style.height = '';

        // Получаем натуральные высоты
        const wordHeight = wordBtn.offsetHeight;
        const transHeight = transBtn.offsetHeight;

        // Устанавливаем максимальную высоту
        const maxHeight = Math.max(wordHeight, transHeight);
        wordBtn.style.height = `${maxHeight}px`;
        transBtn.style.height = `${maxHeight}px`;
    }
}

// Вспомогательная функция для перемешивания DOM элементов
function shuffleArray(parent) {
    const children = Array.from(parent.children);
    for (let i = children.length; i >= 0; i--) {
        parent.appendChild(children[Math.random() * i | 0]);
    }
}

// Обновляем обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.task-container').forEach(syncHeightsByPosition);
});

window.addEventListener('resize', () => {
    document.querySelectorAll('.task-container').forEach(container => {
        Array.from(container.querySelectorAll('.match-btn')).forEach(btn => {
            btn.style.height = ''; // Сброс перед перерасчетом
        });
        syncHeightsByPosition(container);
    });
});

// Функция для сброса задания
function resetMatchWordsTask(task_id) {
    const taskContainer = document.getElementById(`task-${task_id}`);
    const correctPairs = JSON.parse(taskContainer.querySelector('.correct-pairs').dataset.pairs);

    // Очищаем текущие кнопки
    const columns = taskContainer.querySelectorAll(".col-6");
    columns.forEach(column => column.innerHTML = "");

    // Восстанавливаем все кнопки
    Object.keys(correctPairs).forEach(word => {
        const wordButton = document.createElement('button');
        wordButton.className = 'match-btn btn btn-outline-primary fs-6 fw-bold w-100 p-2 shadow-sm mb-2';
        wordButton.innerText = word;
        wordButton.setAttribute('data-word', word);
        columns[0].appendChild(wordButton);

        const translationButton = document.createElement('button');
        translationButton.className = 'match-btn btn btn-outline-primary fs-6 fw-bold w-100 p-2 shadow-sm mb-2';
        translationButton.innerText = correctPairs[word];
        translationButton.setAttribute('data-translation', correctPairs[word]);
        columns[1].appendChild(translationButton);
    });

    // Обнуляем счет
    const scoreElement = taskContainer.querySelector(".score-value");
    if (scoreElement) {
        scoreElement.textContent = "0";
        scoreElement.setAttribute("data-real-score", "0");
    }

    // Перемешиваем слова заново
    shuffleWords(taskContainer);
}
