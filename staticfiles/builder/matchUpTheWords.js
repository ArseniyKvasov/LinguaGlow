export function init(taskData = null, selectedTasksData = null) {
    const matchUpTheWordsContainer = document.getElementById('matchUpTheWordsContainer');
    const addPairMatchUpTheWordsButton = document.getElementById('addPairMatchUpTheWordsButton');
    const fillInMatchUpTheWordsAI = document.getElementById('fillInMatchUpTheWordsAI');
    const resetMatchUpTheWordsButton = document.getElementById('resetMatchUpTheWordsButton');
    const quickMatchUpTheWordsInput = document.getElementById('quickMatchUpTheWordsInput');
    const quickInputMatchUpTheWordsButton = document.getElementById('quickInputMatchUpTheWordsButton');
    const saveMatchUpTheWordsButton = document.getElementById('saveMatchUpTheWordsButton');
    const title = document.getElementById('matchUpTheWordsTitleInput');

    if (taskData) {
        title.value = taskData.title;
        Object.entries(taskData.pairs).forEach(([word, translation]) => {
            addPairWithValues(word, translation);
        });
    } else {
        addPairWithValues();
        addPairWithValues();
    }

    // Обработчик для кнопки "Добавить пару"
    addPairMatchUpTheWordsButton.addEventListener('click', () => {
        addPairWithValues();
        updateRemoveButtons();
    });

    // Обработчик для кнопки "Обнулить"
    resetMatchUpTheWordsButton.addEventListener('click', () => {
        matchUpTheWordsContainer.innerHTML = '';
        title.value = '';
        addPairWithValues();
        addPairWithValues();
        updateRemoveButtons();
    });

    checkAndShowFillInButton();

    fillInMatchUpTheWordsAI.addEventListener('click', fillInWordsByAI);

    // Обработчик для кнопки "Быстрый ввод"
    quickInputMatchUpTheWordsButton.addEventListener('click', () => {
        const inputText = quickMatchUpTheWordsInput.value.trim();
        if (inputText) {
            processQuickMatchUpTheWordsInput(inputText);
            quickMatchUpTheWordsInput.value = ''; // Очищаем поле ввода
        }
    });
    
    const throttledQuickInputHandler = throttle(() => {
        const inputText = quickMatchUpTheWordsInput.value.trim();
        quickInputMatchUpTheWordsButton.disabled = !inputText;
    }, 300);

    quickMatchUpTheWordsInput.addEventListener('input', throttledQuickInputHandler);

    // Обработчик для кнопки "Сохранить"
    saveMatchUpTheWordsButton.addEventListener('click', async () => {
        const payloads = getPayloads();

        if (Object.keys(payloads).length === 0 || title === '') {
            alert('Нет данных для сохранения.');
            return;
        }

        try {
            const addActivityButton = document.getElementById('addActivityButton');
            const activityCreationBlock = document.getElementById('activityCreationBlock');
            addActivityButton.style.display = 'block';
            activityCreationBlock.style.display = 'none';
            const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    ...(taskData ? { obj_id: taskData.id } : {}),
                    task_type: 'matchUpTheWords',
                    payloads: payloads,
                }),
            });

            const result = await response.json();

            if (result.success) {
                const taskHtml = createTaskHtml(result.task);
                const loadedTasks = document.getElementById('loadedTasks');
                document.getElementById('overlay').style.display = 'none';

                if (!taskData) {
                    loadedTasks.insertAdjacentHTML('beforeend', taskHtml);
                    document.getElementById(`task-${result.task.id}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                    elementToUpdate.innerHTML = taskHtml;
                    elementToUpdate.scrollIntoView({ block: 'start' });
                }
            } else {
                alert('Ошибка при сохранении данных.');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при отправке данных.');
        }
    });

    function createTaskHtml(task) {
        return `
            <div class="task-item" id="task-${task.id}">
                <div class="match-up-the-words-item">
                    <h3>${task.content['title']}</h3>
                    ${Object.entries(task.content['pairs']).map(([word, translation]) => `
                        <div class="row g-3">
                            <div class="col-6 card shadow p-2 text-center bg-warning">${word}</div>
                            <div class="col-6 card shadow p-2 text-center bg-warning">${translation}</div>
                        </div>
                    `).join('')}
                    <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="matchUpTheWords">Редактировать</button>
                    <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
                </div>
            </div>
        `;
    }
    
    function updateSaveButtonState() {
        const saveMatchUpTheWordsButton = document.getElementById('saveMatchUpTheWordsButton');
        const pairs = matchUpTheWordsContainer.querySelectorAll('.row.mb-2');
        const hasValidPair = Array.from(pairs).some(pair => {
            const word = pair.querySelector('.word-input').value.trim();
            const translation = pair.querySelector('.translation-input').value.trim();
            return word && translation;
        });
        saveMatchUpTheWordsButton.disabled = !(hasValidPair && title.value.trim());
    }

    const throttledUpdateSaveButtonState = throttle(updateSaveButtonState, 300);
    title.addEventListener('input', throttledUpdateSaveButtonState);

    // Функция для получения данных из полей ввода
    function getPayloads() {
        const pairsPayloads = {};
        const pairs = matchUpTheWordsContainer.querySelectorAll('.row.mb-2');

        pairs.forEach(pair => {
            const wordInput = pair.querySelector('.word-input');
            const translationInput = pair.querySelector('.translation-input');

            const word = wordInput.value.trim();
            const translation = translationInput.value.trim();

            if (word && translation) {
                pairsPayloads[word] = translation;
            }
        });

        return {'title': title.value.trim(), 'pairs': pairsPayloads};
    }

    // Функция для обработки быстрого ввода
    function processQuickMatchUpTheWordsInput(inputText) {
        const lines = inputText.split('\n');

        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            const [word, translation] = line.split(/[-\t]/).map(part => part.trim());
            addPairWithValues(word, translation);
        });

        removeEmptyPairs();
    }

    // Функция для добавления пары полей с заданными значениями
    function addPairWithValues(word = '', translation = '') {
        const pairDiv = document.createElement('div');
        pairDiv.className = 'row mb-2';

        pairDiv.innerHTML = `
            <div class="col">
                <input type="text" class="form-control word-input" placeholder="Слово" value="${word}">
            </div>
            <div class="col">
                <input type="text" class="form-control translation-input" placeholder="Перевод" value="${translation}">
            </div>
            <div class="col-auto">
                <button type="button" class="btn btn-danger remove-pair-button">×</button>
            </div>
        `;

        matchUpTheWordsContainer.appendChild(pairDiv);

        const removeButton = pairDiv.querySelector('.remove-pair-button');
        removeButton.addEventListener('click', () => {
            pairDiv.remove();
            updateRemoveButtons();
        });

        const wordInput = pairDiv.querySelector('.word-input');
        const translationInput = pairDiv.querySelector('.translation-input');
        const throttledUpdateSaveButtonState = throttle(updateSaveButtonState, 300);
        wordInput.addEventListener('input', throttledUpdateSaveButtonState);
        translationInput.addEventListener('input', throttledUpdateSaveButtonState);

        updateRemoveButtons();
    }

    // Функция для удаления пустых пар полей
    function removeEmptyPairs() {
        const pairs = matchUpTheWordsContainer.querySelectorAll('.row.mb-2');
        pairs.forEach(pair => {
            const wordInput = pair.querySelector('.word-input');
            const translationInput = pair.querySelector('.translation-input');

            if (!wordInput.value.trim() && !translationInput.value.trim()) {
                pair.remove();
            }
        });
    }

    // Функция для обновления видимости кнопок удаления
    function updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.remove-pair-button');
        removeButtons.forEach(button => {
            button.style.display = matchUpTheWordsContainer.children.length > 2 ? 'block' : 'none';
        });
    }

    function checkAndShowFillInButton() {
        const wordListTask = getWordListTask();
        if (wordListTask && wordListTask.words) {
            fillInMatchUpTheWordsAI.style.display = 'block';
        } else {
            fillInMatchUpTheWordsAI.style.display = 'none';
        }
    }

    function getWordListTask() {
        const taskItems = document.querySelectorAll('.task-item');

        for (let i = taskItems.length - 1; i >= 0; i--) {
            const taskItem = taskItems[i];

            // Проверяем, что это задание типа "wordlist"
            if (taskItem.dataset.taskType === 'wordlist') {
                const wordListContent = taskItem.querySelector('.card-body');

                if (wordListContent) {
                    const title = taskItem.querySelector('h3').textContent.trim(); // Заголовок задачи
                    const words = {};

                    // Ищем все карточки с парами слов и переводов
                    const wordCards = wordListContent.querySelectorAll('.col-12.col-md-6');
                    wordCards.forEach(card => {
                        const word = card.querySelector('.text-start').textContent.trim();
                        const translation = card.querySelector('.text-end').textContent.trim();

                        if (word && translation) {
                            words[word] = translation; // Добавляем пару в объект
                        }
                    });

                    return {
                        title: title,
                        words: words
                    };
                }
            }
        }

        return null; // Если не найдено, возвращаем null
    }


    function fillInWordsByAI() {
        const wordListTask = getWordListTask();
        if (wordListTask && wordListTask.words) {
            matchUpTheWordsContainer.innerHTML = '';
            Object.entries(wordListTask.words).forEach(([word, translation]) => {
                addPairWithValues(word, translation);
            });
        }
    }
}