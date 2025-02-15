export function init(taskData = null, selectedTasksData = null) {
    const wordInput = document.getElementById('wordInput');
    const wordPreview = document.getElementById('unscrambleWordPreview');
    const addWordButton = document.getElementById('addWordButton');
    const wordList = document.getElementById('unscrambleWordList');
    const saveTaskButton = document.getElementById('saveUnscrambleTaskButton');
    const titleInput = document.getElementById('unscrambleTaskTitleInput') || document.createElement('input');

    // Массив для хранения добавленных слов (каждый объект: { word, hint })
    let wordsArray = [];
    let editingItem = null;

    // Инициализация при редактировании задачи
    if (taskData) {
        titleInput.value = taskData.title || '';

        if (taskData.words) {
            taskData.words.forEach(({ word, shuffled_word, hint }) => {
                addWordToList(word, hint);
            });
        }
    }

    function getWordColor(length) {
        if (length >= 12) {
            return 'red';
        } else if (length >= 7) {
            return 'yellow';
        }
        return 'green';
    }

    // Обновление превью: введённый текст разбивается по строкам, пробелы заменяются на символ "␣"
    function updateWordPreview() {
        const lines = wordInput.value.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
        wordPreview.innerHTML = lines.map(line => {
            // Для отображения заменяем обычные пробелы на символ "␣"
            const displayLine = line.replace(/ /g, '␣');
            const len = line.length;
            const color = getWordColor(len);
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <div>${displayLine}</div>
                    <div>
                        <span class="status-indicator" style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${color};"></span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Обработчик ввода с throttling
    wordInput.addEventListener('input', throttle(() => {
        updateWordPreview();

        const lines = wordInput.value.split('\n').map(l => l.trim()).filter(l => l !== '');
        addWordButton.textContent = lines.length > 1 ? 'Добавить слова' : 'Добавить слово';
    }, 300));

    // Обработчик кнопки "Добавить слово(а)"
    addWordButton.addEventListener('click', () => {
        let lines = wordInput.value.trim().split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');

        if (lines.length === 0) {
            alert('Введите хотя бы одно слово или фразу!');
            return;
        }

        // Проверяем, есть ли слова длиннее 30 символов
        let hasLongWords = lines.some(line => line.length > 30);
        if (hasLongWords) {
            alert('Некоторые слова или фразы превышают 30 символов. Исправьте ошибки!');
            return; // Прерываем выполнение, не очищаем поле
        }

        // Обрабатываем слова, заменяя пробелы на символ "␣"
        lines.forEach(line => {
            addWordToList(line, '');
        });

        // Очищаем поле только если все слова допустимой длины
        wordInput.value = '';
        updateWordPreview();
    });

    // Добавление слова в список (и в массив)
    function addWordToList(word, hint) {
        // Удаляем маркеры и нумерацию
        word = word.trim().replace(/^(?:[-•*]\s+|\d+\.\s+|[a-zA-Z]\)\s+)/, '').replace(/\s+/g, ' ').replace(/ /g, '␣');

        if (isDuplicateWord(word)) {
            alert('Такое слово уже существует!');
            return;
        }

        const listItem = createWordElement(word, hint || ""); // Создаем элемент для слова
        wordList.appendChild(listItem);

        // Добавляем новое слово в массив слов
        const wordObj = { word, hint: hint || '' };
        wordsArray.push(wordObj);

        // Найдем поле для ввода подсказки и привяжем обработчик с улучшенным `throttle`
        const hintInput = listItem.querySelector('.hint-input');

        const throttledUpdateHint = throttle(() => {
            const index = wordsArray.findIndex(w => w.word === word);
            if (index !== -1) {
                wordsArray[index].hint = hintInput.value.trim();
            }
        }, 300, true); // Третий параметр true гарантирует выполнение при последнем вызове

        hintInput.addEventListener('input', throttledUpdateHint);
    }


    // Создание элемента списка для слова, с индикатором, полем подсказки и кнопкой действий
    function createWordElement(word, hint) {
        // Для определения цвета: заменяем символ "␣" обратно на обычный пробел
        const len = word.replace(/␣/g, ' ').length;
        const color = getWordColor(len);
        const listItem = document.createElement('div');
        listItem.classList.add('word-item', 'd-flex', 'align-items-center', 'mb-2', 'p-2', 'border');
        listItem.innerHTML = `
            <div class="word-info flex-grow-1">
                <div>
                    <strong class="editable-word">${word}</strong>
                    <input type="text" class="hint-input form-control form-control-sm mt-1" placeholder="Подсказка (опционально)" value="${hint}">
                </div>
            </div>
            <div class="status-and-actions" style="display: flex; align-items: center;">
                <span class="status-indicator me-2" style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${color};"></span>
                <button class="btn btn-sm btn-secondary action-dropdown" type="button">⋮</button>
            </div>
        `;
        return listItem;
    }

    // Обработчик кликов по dropdown – редактирование, удаление, перемещение
    wordList.addEventListener('click', (event) => {
        const dropdownBtn = event.target.closest('.action-dropdown');
        if (!dropdownBtn) return;

        const wordItem = dropdownBtn.closest('.word-item');
        const index = Array.from(wordList.children).indexOf(wordItem);

        // Создаём меню действий, позиционируемое поверх страницы
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'custom-dropdown-menu';
        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.zIndex = '1000';
        dropdownMenu.style.background = '#fff';
        dropdownMenu.style.border = '1px solid #ccc';
        dropdownMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        dropdownMenu.style.padding = '4px 0';
        dropdownMenu.style.borderRadius = '4px';

        dropdownMenu.style.top = event.clientY + 'px';
        dropdownMenu.style.left = event.clientX + 'px';

        dropdownMenu.innerHTML = `
            <button class="dropdown-item" style="width:100%; text-align:left; padding:4px 12px; background:none; border:none;">Редактировать слово</button>
            <button class="dropdown-item" style="width:100%; text-align:left; padding:4px 12px; background:none; border:none;">Удалить слово</button>
            <button class="dropdown-item" style="width:100%; text-align:left; padding:4px 12px; background:none; border:none;">Переместить вверх</button>
            <button class="dropdown-item" style="width:100%; text-align:left; padding:4px 12px; background:none; border:none;">Переместить вниз</button>
        `;
        document.body.appendChild(dropdownMenu);

        dropdownMenu.querySelectorAll('.dropdown-item').forEach((item, i) => {
            item.addEventListener('click', () => {
                if (i === 0) {
                    startEditingWord(wordItem);
                } else if (i === 1) {
                    if (confirm('Удалить это слово?')) {
                        wordItem.remove();
                        wordsArray.splice(index, 1);
                    }
                } else if (i === 2) {
                    moveWord(index, -1);
                } else if (i === 3) {
                    moveWord(index, 1);
                }
                dropdownMenu.remove();
            });
        });

        const removeDropdown = (e) => {
            if (!dropdownMenu.contains(e.target)) {
                dropdownMenu.remove();
                document.removeEventListener('click', removeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', removeDropdown), 0);
    });

    // Редактирование слова – превращаем текст в textarea
    function startEditingWord(wordItem) {
        editingItem = wordItem;
        const strongElem = wordItem.querySelector('.editable-word');
        const currentText = strongElem.textContent;
        const editField = document.createElement('textarea');
        editField.className = 'form-control edit-textarea';
        editField.value = currentText;
        strongElem.replaceWith(editField);
        editField.focus();

        let isEditingFinished = false;
        editField.addEventListener('blur', () => {
            if (!isEditingFinished) {
                finishEditingWord();
            }
            isEditingFinished = false;
        });
        editField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                isEditingFinished = true;
                finishEditingWord();
            }
        });
    }

    // Завершение редактирования слова – обновление текста и цвета индикатора
    function finishEditingWord() {
        const editField = editingItem.querySelector('.edit-textarea');
        let newText = editField.value.trim();

        if (newText) {
            // Удаляем маркеры и нумерацию в начале строки
            newText = newText.replace(/^(?:[-•*]\s+|\d+\.\s+|[a-zA-Z]\)\s+)/, '');

            // Удаляем повторяющиеся пробелы
            newText = newText.replace(/\s+/g, ' ');

            // Заменяем пробелы на символ "␣"
            newText = newText.replace(/ /g, '␣');

            const len = newText.replace(/␣/g, ' ').length;
            if (len > 30) {
                alert('Слово или фраза не должно превышать 30 символов!');
                return;
            }

            if (isDuplicateWord(newText)) {
                alert('Такое слово уже существует!');
                return;
            }

            const strongElem = document.createElement('strong');
            strongElem.className = 'editable-word';
            strongElem.textContent = newText;
            editField.replaceWith(strongElem);

            const index = Array.from(wordList.children).indexOf(editingItem);
            const hintInput = editingItem.querySelector('.hint-input');

            wordsArray[index] = {
                word: newText,
                shuffled_word: shuffleWord(newText),
                hint: hintInput.value || ''
            };

            const color = getWordColor(len);
            const indicator = editingItem.querySelector('.status-indicator');
            if (indicator) {
                indicator.style.backgroundColor = color;
            }
        }
        editingItem = null;
    }


    // Перемещение слова в списке
    function moveWord(index, direction) {
        if ((direction === -1 && index > 0) || (direction === 1 && index < wordsArray.length - 1)) {
            const newIndex = index + direction;
            const word = wordsArray.splice(index, 1)[0];
            wordsArray.splice(newIndex, 0, word);

            const items = Array.from(wordList.children);
            wordList.insertBefore(items[index], items[newIndex + (direction > 0 ? 1 : 0)]);
        }
    }

    // Проверка на дубликат слова
    function isDuplicateWord(newWord) {
        return wordsArray.some(item => item.word === newWord);
    }

    function shuffleWord(word) {
        if (new Set(word).size < 2) {
            return word;
        }

        let shuffled = word;
        while (shuffled === word) {
            shuffled = word.split('').sort(() => Math.random() - 0.5).join('');
        }

        return shuffled;
    }


    // Сохранение задачи
    saveTaskButton.addEventListener('click', async () => {
        if (wordsArray.length === 0) {
            alert('Добавьте хотя бы одно слово или фразу!');
            return;
        }
        const wordsObject = wordsArray.map(({ word, shuffled_word, hint }) => {
            return {
                word: word,
                shuffled_word: shuffleWord(word),
                hint: hint || null
            };
        });
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
                    task_type: 'unscramble',
                    payloads: {
                        title: titleInput.value || 'Unscramble',
                        words: wordsObject
                    }
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
            alert('Ошибка соединения с сервером');
        }
    });

    // Функция генерации HTML для сохранённой задачи
    function createTaskHtml(task) {
        return `
            <div class="task-item" id="task-${task.id}">
                <div class="unscramble-task-item">
                    <h3>${task.content.title}</h3>
                    ${task.content.words.map(({ word, shuffled_word, hint }) => `
                        <div class="word-block">
                            <div class="puzzle-container">
                                ${shuffled_word.split('').map(letter => `
                                    <div class="puzzle-piece">${letter}</div>
                                `).join('')}
                            </div>
                            <p class="correct-word">(Правильное слово: <strong>${word}</strong>)</p>
                            ${hint ? `<p class="hint"><em>(Подсказка: ${hint})</em></p>` : ''}
                        </div>
                    `).join('')}
                    <div class="task-buttons">
                        <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="unscramble">Редактировать</button>
                        <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Утилита throttling
    function throttle(fn, delay) {
        let lastCall = 0;
        let lastArgs = null;
        let timeout = null;

        const invoke = () => {
            fn(...lastArgs);
            lastArgs = null;
        };

        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                fn(...args);
            } else {
                lastArgs = args;
                clearTimeout(timeout);
                timeout = setTimeout(invoke, delay); // Если не прошло достаточно времени, отложим выполнение
            }
        };
    }

}
