export function init(taskData = null, selectedTasksData = null) {
    const columnsContainer = document.getElementById('columnsContainer');
    const addColumnButton = document.getElementById('addColumnButton');
    const fillColumnsAI = document.getElementById('fillColumnsAI');
    const saveSortIntoColumnsButton = document.getElementById('saveSortIntoColumnsButton');

    let columnsCount = 0;

    // Инициализация при редактировании
    if (taskData && taskData.columns) {
        Object.entries(taskData.columns).forEach(([title, words]) => {
            createColumn(title, words);
        });
    } else {
        createColumn();
    }


    // Добавление колонки
    addColumnButton.addEventListener('click', () => {
        createColumn();
        updateColumnsState();
    });

    // Заполнение AI
    fillColumnsAI.addEventListener('click', () => {
        const wordLists = getWordLists();
        columnsContainer.innerHTML = '';

        wordLists.forEach(list => {
            createColumn(list.title || '', Object.values(list.words));
        });

        updateColumnsState();
    });

    saveSortIntoColumnsButton.addEventListener('click', async () => {
        const titleInput = document.getElementById('columnTitle');
        const columns = document.querySelectorAll('.column-item');
        const payloads = {};

        // Проверка уникальности названий столбцов
        const columnTitles = new Set();
        for (const column of columns) {
            const title = column.querySelector('.column-title').value.trim();
            if (!title) {
                alert('Название каждого столбца должно быть заполнено.');
                return;
            }
            if (columnTitles.has(title)) {
                alert(`Название столбца "${title}" повторяется. Сделайте его уникальным.`);
                return;
            }
            columnTitles.add(title);
            payloads[title] = [];

            // Проверка уникальности слов в каждом столбце
            const words = column.querySelectorAll('.word-input');
            const wordSet = new Set();
            for (const word of words) {
                const wordText = word.value.trim();
                if (!wordText) {
                    alert('Все слова должны быть заполнены.');
                    return;
                }
                if (wordSet.has(wordText)) {
                    alert(`Слово "${wordText}" повторяется в столбце "${title}". Сделайте его уникальным.`);
                    return;
                }
                wordSet.add(wordText);
                payloads[title].push(wordText);
            }
        }

        if (Object.keys(payloads).length < 2) {
            alert('Должно быть не менее 2 столбцов.');
            return;
        }

        const addActivityButton = document.getElementById('addActivityButton');
        const activityCreationBlock = document.getElementById('activityCreationBlock');
        addActivityButton.style.display = 'block';
        activityCreationBlock.style.display = 'none';

        try {
            const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    ...(taskData ? { obj_id: taskData.id } : {}),
                    task_type: 'sortIntoColumns',
                    payloads: payloads,
                }),
            });

            const result = await response.json();

            if (result.success) {
                if (!taskData) {
                    const loadedTasks = document.getElementById('loadedTasks');
                    document.getElementById('overlay').style.display = 'none';
                    loadedTasks.insertAdjacentHTML('beforeend', createTaskHtml(result.task));

                    const newTaskElement = document.getElementById(`task-${result.task.id}`);
                    if (newTaskElement) {
                        newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                    document.getElementById('overlay').style.display = 'none';
                    elementToUpdate.innerHTML = createTaskHtml(result.task);
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
                <div class="sort-into-columns-item">
                    <h3>${task.content.title}</h3>
                    ${Object.entries(task.content.columns).map(([columnTitle, words]) => `
                        <div class="column">
                            <h4>${columnTitle}</h4>
                            <ul>
                                ${words.map(word => `<li>${word}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                    <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="sortIntoColumns">Редактировать</button>
                    <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
                </div>
            </div>
        `;
    }


    function createColumn(title = '', words = []) {
        const column = document.createElement('div');
        column.className = 'column-item col-12 col-lg-6';
        column.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <input type="text" class="form-control mb-2 column-title"
                           placeholder="Название колонки" value="${title}">
                    <div class="words-container"></div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <button type="button" class="btn btn-link btn-sm add-word-button">+ Добавить слово</button>
                        <button type="button" class="btn btn-sm quick-input-button">
                            <i class="bi bi-lightning-charge"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm remove-column-button">Удалить</button>
                    </div>
                    <textarea class="form-control column-quick-input mt-2 d-none"
                              placeholder="Быстрый ввод (разделители: Enter, /, ;, ,)"></textarea>
                </div>
            </div>
        `;

        const quickInput = column.querySelector('.column-quick-input');
        const quickInputButton = column.querySelector('.quick-input-button');
        const removeColumnButton = column.querySelector('.remove-column-button');

        // Обработчики для быстрого ввода
        quickInputButton.addEventListener('click', () => {
            quickInput.classList.toggle('d-none');
            quickInput.focus();
        });

        quickInput.addEventListener('input', debounce(() => {
            const text = quickInput.value.trim();
            const words = text.split(/[\n/,;]+/).filter(w => w.trim());

            const inputs = column.querySelectorAll('.word-input');
            inputs.forEach((input, index) => {
                if (words[index]) input.value = words[index].trim();
            });

            // Добавляем недостающие поля
            for (let i = inputs.length; i < words.length; i++) {
                addWordField(column, words[i].trim());
            }
        }, 300));

        removeColumnButton.addEventListener('click', () => {
            column.remove();
            updateColumnsState();
        });

        const wordsContainer = column.querySelector('.words-container');
        const addWordButton = column.querySelector('.add-word-button');

        // Добавление полей
        if (words.length > 0) {
            words.forEach(word => addWordField(column, word));
        } else {
            addWordField(column);
        }

        // Обработчики
        addWordButton.addEventListener('click', () => {
            addWordField(column);
            updateRemoveButtons(column);
        });

        column.addEventListener('click', () => {
            document.querySelectorAll('.column-item').forEach(c => c.classList.remove('active'));
            column.classList.add('active');
        });

        columnsContainer.appendChild(column);
        columnsCount++;
        updateColumnsState();
    }

    function addWordField(columnElement, word = '') {
        const wordsContainer = columnElement.querySelector('.words-container');
        const wordDiv = document.createElement('div');
        wordDiv.className = 'input-group mb-2';
        wordDiv.innerHTML = `
            <input type="text" class="form-control word-input" placeholder="Слово" value="${word}">
            <button type="button" class="btn btn-danger remove-word-button">×</button>
        `;

        wordsContainer.appendChild(wordDiv);

        wordDiv.querySelector('.remove-word-button').addEventListener('click', () => {
            wordDiv.remove();
            updateRemoveButtons(columnElement);
        });

        updateRemoveButtons(columnElement);
    }

    function updateRemoveButtons(columnElement) {
        const words = columnElement.querySelectorAll('.word-input');
        words.forEach((word, index) => {
            const removeBtn = word.closest('.input-group').querySelector('.remove-word-button');
            removeBtn.style.display = words.length > 1 ? 'block' : 'none';

            removeBtn.addEventListener('click', () => {
                word.closest('.input-group').remove();
                if (words.length === 1) updateRemoveButtons(columnElement);
            });
        });
    }

    function updateColumnsState() {
        // Количество колонок
        columnsCount = document.querySelectorAll('.column-item').length;

        // Проверка для AI
        const wordListsCount = getWordLists().length;
        fillColumnsAI.style.display = wordListsCount >= 2 ? 'block' : 'none';
    }

    // Вспомогательные функции
    function debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function getWordLists() {
        const taskItems = document.querySelectorAll('#loadedTasks .task-item');
        const wordLists = [];

        // Проходим по всем задачам в обратном порядке
        for (let i = taskItems.length - 1; i >= 0; i--) {
            const taskItem = taskItems[i];
            const wordListContent = taskItem.querySelector('.word-list-item');

            if (wordListContent) {
                // Получаем заголовок списка
                const title = wordListContent.querySelector('h3')?.textContent.trim() || 'Без названия';

                // Собираем слова из первого столбца
                const words = [];
                const wordRows = wordListContent.querySelectorAll('.row.g-3');
                wordRows.forEach(row => {
                    const word = row.querySelector('.col-6:nth-child(1)')?.textContent.trim();
                    if (word) {
                        words.push(word);
                    }
                });

                // Добавляем список в массив, если есть хотя бы одно слово
                if (words.length > 0) {
                    wordLists.push({
                        title: title,
                        words: words
                    });
                }
            }
        }
        return wordLists;
    }
}