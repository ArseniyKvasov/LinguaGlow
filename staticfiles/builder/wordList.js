export function init(taskData = null, selectedTasksData = null) {
    const wordListContainer = document.getElementById('wordListContainer');
    const addPairWordListButton = document.getElementById('addPairWordListButton');
    const resetWordListButton = document.getElementById('resetWordListButton');
    const quickWordListInput = document.getElementById('quickWordListInput');
    const quickInputWordListButton = document.getElementById('quickInputWordListButton');
    const saveWordListButton = document.getElementById('saveWordListButton');
    const title = document.getElementById('wordListTitleInput');
    const AIWordListButton = document.getElementById('AIWordListButton');
    const AIWordListBlock = document.getElementById('AIWordListBlock');
    const generateAIWordListButton = document.getElementById('generateAIWordListButton');
    const AIInput = AIWordListBlock.querySelector('.ai-input');
    const AIQuantityInput = AIWordListBlock.querySelector('.ai-quantity-input');
    const aiGenerationOptions = AIWordListBlock.querySelectorAll('.ai-generation-option');
    const additionalWordListRequirements = AIWordListBlock.querySelector('.additional-wordlist-requirements');
    const additionalWordListRequirementsButton = AIWordListBlock.querySelector('.add-additional-wordlist-requirements-button');

    if (taskData) {
        title.value = taskData.title;
        Object.entries(taskData.words).forEach(([word, translation]) => {
            addPairWithValues(word, translation);
        });
    } else {
        addPairWithValues();
        addPairWithValues();
    }

    if (!selectedTasksData) {
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });
    } else {
        aiGenerationOptions.forEach(option => {
            option.disabled = false;
        });
    }

    // Обработчик для кнопки "Добавить пару"
    addPairWordListButton.addEventListener('click', () => {
        addPairWithValues();
        updateRemoveButtons();
    });

    // Обработчик для кнопки "Обнулить"
    resetWordListButton.addEventListener('click', () => {
        wordListContainer.innerHTML = '';
        title.value = '';
        addPairWithValues();
        addPairWithValues();
        updateRemoveButtons();
    });

    // Обработчик для кнопки "Быстрый ввод"
    quickInputWordListButton.addEventListener('click', () => {
        const inputText = quickWordListInput.value.trim();
        if (inputText) {
            processQuickWordListInput(inputText);
            quickWordListInput.value = ''; // Очищаем поле ввода
        }
    });

    const throttledQuickInputHandler = throttle(() => {
        const inputText = quickWordListInput.value.trim();
        quickInputWordListButton.disabled = !inputText;
    }, 300);

    quickWordListInput.addEventListener('input', throttledQuickInputHandler);

    AIWordListButton.addEventListener('click', () => {
        AIWordListBlock.style.display = 'block';
        AIWordListBlock.scrollIntoView({ behavior: 'smooth' });
        AIInput.focus();
    });

    additionalWordListRequirementsButton.addEventListener('click', () => {
        additionalWordListRequirements.style.display = 'block';
        additionalWordListRequirementsButton.display = 'none';
        additionalWordListRequirements.focus();
        const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked).value;
        if (selectedOption === 'selected') {
            additionalWordListRequirements.placeholder = 'Составь список слов в дополнение к уже существующему.';
        }
    });

    generateAIWordListButton.addEventListener('click', async () => {
        if (AIInput.value.trim() === '') {
            alert('Нет данных для генерации.');
            return;
        }

        generateAIWordListButton.disabled = true;
        AIInput.disabled = true;
        AIQuantityInput.disabled = true;
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });
        additionalWordListRequirements.disabled = true;
        additionalWordListRequirementsButton.disabled = true;

        const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked)?.value;

        try {
            const response = await fetch("/hub/generate-task/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    function_name: 'wordList',
                    payloads: {
                        'topic': AIInput.value.trim(),
                        'quantity': AIQuantityInput.value.trim(),
                        'requirements': additionalWordListRequirements.value.trim(),
                        'basics': (selectedOption === 'selected' ? selectedTasksData : ''),
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result && result.result) {
                if (result.result === "Измените свой запрос и попробуйте снова. Вероятно, Вам стоит избегать спорных и (или) политических тем.") {
                    alert(result.result);
                    return;
                }

                const wordList = JSON.parse(result.result);

                // Добавляем слова в список через addPairWithValues
                wordList.forEach((pair) => {
                    addPairWithValues(pair.word, pair.translation);
                });

                removeEmptyPairs();
                title.value = AIInput.value.trim();
                AIWordListBlock.scrollIntoView({ behavior: 'smooth' });
                AIInput.value = '';
                AIQuantityInput.value = '';
                additionalWordListRequirements.value = '';
                AIWordListBlock.style.display = 'none';
                saveWordListButton.disabled = false;
            } else {
                alert("Ошибка: пустой ответ от сервера.");
            }

        } catch (error) {
            console.error('Ошибка запроса:', error);
            alert('Ошибка при генерации. Попробуйте снова.');
        } finally {
            generateAIWordListButton.disabled = false;
            AIInput.disabled = false;
            AIQuantityInput.disabled = false;
            aiGenerationOptions.forEach(option => {
                option.disabled = false;
            });
            additionalWordListRequirements.disabled = false;
            additionalWordListRequirementsButton.disabled = false;
        }
    });

    function newTaskHtml(task) {
        return `
            <div class="task-item" id="task-${task.id}" data-task-type="wordlist">
                <div class="word-list-item">
                    <input type="checkbox" class="task-checkbox" data-task-id="${ task.id }" checked>
                    <label for="task-${ task.id }"></label>
                    <h3>${task.content['title']}</h3>
                    ${Object.entries(task.content['words']).map(([word, translation]) => `
                        <div class="row g-3">
                            <div class="col-6 card shadow p-2 text-center">${word}</div>
                            <div class="col-6 card shadow p-2 text-center">${translation}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary edit-task-button" data-task-id="${ task.id }" data-task-type="wordlist">Редактировать</button>
                <button class="btn btn-danger delete-task-button" data-task-id="${ task.id }">Удалить</button>
            </div>
        `;
    }

    // Обработчик для кнопки "Сохранить"
    saveWordListButton.addEventListener('click', async () => {
        const payloads = getPayloads();

        if (Object.keys(payloads).length === 0 || title.value.trim() === '') {
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
                    task_type: 'wordList',
                    payloads: payloads,
                }),
            });

            const result = await response.json();

            if (result.success) {
                if (!taskData) {
                    const loadedTasks = document.getElementById('loadedTasks');
                    loadedTasks.insertAdjacentHTML('beforeend', newTaskHtml(result.task));
                    const newTaskElement = document.getElementById(`task-${result.task.id}`);
                    if (newTaskElement) {
                        newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    document.getElementById('overlay').style.display = 'none';
                } else {
                    const updatedTaskHtml = newTaskHtml(result.task);

                    const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                    elementToUpdate.innerHTML = updatedTaskHtml;
                    document.getElementById('overlay').style.display = 'none';
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

    // Функция для получения данных из полей ввода
    function getPayloads() {
        const pairsPayloads = {};
        const pairs = wordListContainer.querySelectorAll('.row.mb-2');

        pairs.forEach(pair => {
            const wordInput = pair.querySelector('.word-input');
            const translationInput = pair.querySelector('.translation-input');

            const word = wordInput.value.trim();
            const translation = translationInput.value.trim();

            if (word && translation) {
                pairsPayloads[word] = translation;
            }
        });

        return {title: title.value.trim(), words: pairsPayloads};
    }

    // Функция для обработки быстрого ввода
    function processQuickWordListInput(inputText) {
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

        wordListContainer.appendChild(pairDiv);

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

    function updateSaveButtonState() {
        const saveWordListButton = document.getElementById('saveWordListButton');
        const pairs = wordListContainer.querySelectorAll('.row.mb-2');
        const hasValidPair = Array.from(pairs).some(pair => {
            const word = pair.querySelector('.word-input').value.trim();
            const translation = pair.querySelector('.translation-input').value.trim();
            return word && translation;
        });
        saveWordListButton.disabled = !(hasValidPair && title.value.trim());
    }

    const throttledUpdateSaveButtonState = throttle(updateSaveButtonState, 300);
    title.addEventListener('input', throttledUpdateSaveButtonState);

    // Функция для удаления пустых пар полей
    function removeEmptyPairs() {
        const pairs = wordListContainer.querySelectorAll('.row.mb-2');
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
            button.style.display = wordListContainer.children.length > 2 ? 'block' : 'none';
        });
    }
}