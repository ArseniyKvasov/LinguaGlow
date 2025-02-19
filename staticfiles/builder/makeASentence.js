export function init(taskData = null, selectedTasksData = null) {
    const sentenceInput = document.getElementById('sentenceInput');
    const wordPreview = document.getElementById('wordPreview');
    const addSentenceButton = document.getElementById('addSentenceButton');
    const sentenceList = document.getElementById('sentenceList');
    const saveSentenceTaskButton = document.getElementById('saveSentenceTaskButton');
    const titleInput = document.getElementById('taskTitleInput') || document.createElement('input'); // Добавьте поле для заголовка в HTML

    let separator = ' ';
    let sentences = [];
    let editingItem = null;

    // Инициализация при редактировании
    if (taskData) {
        titleInput.value = taskData.title || '';
        if (taskData.sentences) {
            taskData.sentences.forEach(item => {
                addSentenceToList(item.correct, item.shuffled);
            });
        }
    }

    function updateWordPreview() {
        // Разбиваем введённый текст по строкам (предложениям)
        const sentencesArray = sentenceInput.value.split('\n')
            .map(sentence => sentence.trim())
            .filter(sentence => sentence !== '');

        wordPreview.innerHTML = sentencesArray.map(sentence => {
            // Всегда используем пробел как разделитель
            const words = sentence.split(' ')
                .map(word => word.trim())
                .filter(word => word !== '');
            const color = getSentenceColor(sentence);
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <div>
                        ${words.map(word => `<span class="word-block badge bg-primary me-1">${word}</span>`).join('')}
                    </div>
                    <div>
                        <span class="status-indicator" style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${color};"></span>
                    </div>
                </div>
            `;
        }).join('');
    }



    // Обработчик ввода с throttling
    sentenceInput.addEventListener('input', throttle(() => {
        updateWordPreview();

        // Если в поле несколько строк, меняем текст кнопки
        const lines = sentenceInput.value.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length > 1) {
            addSentenceButton.textContent = 'Добавить предложения';
        } else {
            addSentenceButton.textContent = 'Добавить предложение';
        }
    }, 300));


    addSentenceButton.addEventListener('click', () => {
        let sentencesText = sentenceInput.value.trim().split('\n')
            .filter(s => s.trim() !== '');

        if (sentencesText.length === 0) {
            alert('Введите хотя бы одно предложение!');
            return;
        }

        // Используем всегда пробел как разделитель (удаляем автоопределение слэша)
        separator = ' ';

        // Удаляем из каждой строки возможную нумерацию или маркеры (например, "1. ", "- ", "* ")
        sentencesText = sentencesText.map(sentence => sentence.replace(/^\s*(\d+\.|[-*])\s+/, ''));

        sentencesText.forEach(processSentence);
        sentenceInput.value = '';
        updateWordPreview();
    });

    function getSentenceColor(sentence) {
        const words = sentence.split(' ').filter(w => w.trim() !== '');
        // Если слово "and" или "or" встречается (без учёта регистра) – красный
        if (words.some(w => w.toLowerCase() === 'and' || w.toLowerCase() === 'or')) {
            return 'red';
        }
        if (words.length >= 10) {
            return 'red';
        }
        if (words.length >= 7 && words.length <= 9) {
            return 'yellow';
        }
        return 'green';
    }


    function processSentence(sentence) {
        const words = sentence.split(separator)
            .map(word => word.trim())
            .filter(word => word !== '');

        if (words.length < 2) {
            alert('Предложение должно содержать минимум 2 слова!');
            return;
        }

        if (isDuplicateSentence(words.join(' '))) {
            alert('Такое предложение уже существует!');
            return;
        }

        const shuffledWords = shuffleWords(words);
        addSentenceToList(words.join(' '), shuffledWords.join(' '));
    }


    function addSentenceToList(correct, shuffled) {
        const listItem = createSentenceElement(correct, shuffled);
        sentenceList.appendChild(listItem);
        sentences.push({ correct, shuffled });
    }

    function createSentenceElement(correct, shuffled) {
        const color = getSentenceColor(correct);
        const listItem = document.createElement('div');
        listItem.classList.add('sentence-item', 'd-flex', 'align-items-center', 'mb-2', 'p-2', 'border');
        listItem.innerHTML = `
            <span class="sentence-text flex-grow-1">
                <strong class="editable-field">${correct}</strong> →
                <span class="shuffled-field">${shuffled}</span>
            </span>
            <div class="status-and-actions" style="display: flex; align-items: center;">
                <span class="status-indicator me-2" style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color: ${color};"></span>
                <button class="btn btn-sm btn-secondary action-dropdown" type="button">⋮</button>
            </div>
        `;
        return listItem;
    }


    function shuffleWords(words, attempts = 0) {
        if (attempts > 10) return [...words]; // Защита от бесконечного цикла

        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.join(' ') !== words.join(' ') ? shuffled : shuffleWords(words, attempts + 1);
    }


    // Обработчик клика по кнопке dropdown для показа меню действий поверх страницы
    sentenceList.addEventListener('click', (event) => {
        const dropdownBtn = event.target.closest('.action-dropdown');
        if (!dropdownBtn) return;

        // Определяем родительский элемент предложения и его индекс
        const sentenceItem = dropdownBtn.closest('.sentence-item');
        const index = Array.from(sentenceList.children).indexOf(sentenceItem);

        // Создаём меню действий
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'custom-dropdown-menu';
        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.zIndex = '1000';
        dropdownMenu.style.background = '#fff';
        dropdownMenu.style.border = '1px solid #ccc';
        dropdownMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        dropdownMenu.style.padding = '4px 0';
        dropdownMenu.style.borderRadius = '4px';

        // Расположим меню в точке клика
        dropdownMenu.style.top = event.clientY + 'px';
        dropdownMenu.style.left = event.clientX + 'px';

        // Меню с вариантами действий
        dropdownMenu.innerHTML = `
            <button class="dropdown-item" style="width: 100%; text-align: left; padding: 4px 12px; background: none; border: none;">Редактировать</button>
            <button class="dropdown-item" style="width: 100%; text-align: left; padding: 4px 12px; background: none; border: none;">Удалить</button>
            <button class="dropdown-item" style="width: 100%; text-align: left; padding: 4px 12px; background: none; border: none;">Переместить вверх</button>
            <button class="dropdown-item" style="width: 100%; text-align: left; padding: 4px 12px; background: none; border: none;">Переместить вниз</button>
        `;

        // Добавляем меню в body
        document.body.appendChild(dropdownMenu);

        // Обработчики для элементов меню
        dropdownMenu.querySelectorAll('.dropdown-item').forEach((item, i) => {
            item.addEventListener('click', () => {
                // Выполняем действие в зависимости от позиции пункта меню
                if (i === 0) {
                    startEditing(sentenceItem);
                } else if (i === 1) {
                    if (confirm('Удалить это предложение?')) {
                        sentenceItem.remove();
                        sentences.splice(index, 1);
                    }
                } else if (i === 2) {
                    moveSentence(index, -1);
                } else if (i === 3) {
                    moveSentence(index, 1);
                }
                // После выбора действия удаляем меню
                dropdownMenu.remove();
            });
        });

        // Закрываем меню при клике вне его
        const removeDropdown = (e) => {
            if (!dropdownMenu.contains(e.target)) {
                dropdownMenu.remove();
                document.removeEventListener('click', removeDropdown);
            }
        };
        // Запланировать закрытие меню (используем setTimeout, чтобы не закрыть сразу после открытия)
        setTimeout(() => document.addEventListener('click', removeDropdown), 0);
    });


    function startEditing(sentenceItem) {
        editingItem = sentenceItem;
        const currentText = sentenceItem.querySelector('strong').textContent;

        const editField = document.createElement('textarea');
        editField.className = 'form-control edit-textarea';
        editField.value = currentText;

        sentenceItem.querySelector('strong').replaceWith(editField);
        editField.focus();

        let isEditingFinished = false;

        editField.addEventListener('blur', () => {
            if (!isEditingFinished) {
                finishEditing();
            }
            isEditingFinished = false; // Сбрасываем флаг
        });

        editField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                isEditingFinished = true; // Устанавливаем флаг
                finishEditing();
            }
        });
    }

    function finishEditing() {
        const editField = editingItem.querySelector('.edit-textarea');
        const newText = editField.value.trim();

        if (newText) {
            const words = newText.split(separator).filter(w => w.trim());
            if (words.length >= 2) {
                const shuffled = shuffleWords(words).join(' ');
                const strongElement = document.createElement('strong');
                strongElement.textContent = newText;

                if (editField.isConnected) {
                    editField.replaceWith(strongElement);
                } else {
                    editingItem.querySelector('.sentence-text').appendChild(strongElement);
                }
                const shuffledElement = editingItem.querySelector('.shuffled-field');
                if (shuffledElement) {
                    shuffledElement.textContent = shuffled;
                }
                // Обновляем данные
                const index = Array.from(sentenceList.children).indexOf(editingItem);
                sentences[index] = {
                    correct: newText,
                    shuffled: shuffled
                };
                // Обновляем цвет индикатора в правой части
                const newColor = getSentenceColor(newText);
                const indicator = editingItem.querySelector('.status-indicator');
                if (indicator) {
                    indicator.style.backgroundColor = newColor;
                }
            }
        }

        editingItem = null;
    }

    function moveSentence(index, direction) {
        if (direction === -1 && index > 0 || direction === 1 && index < sentences.length - 1) {
            const newIndex = index + direction;
            const sentence = sentences.splice(index, 1)[0];
            sentences.splice(newIndex, 0, sentence);

            const items = Array.from(sentenceList.children);
            sentenceList.insertBefore(items[index], items[newIndex + (direction > 0 ? 1 : 0)]);
        }
    }

    // Вспомогательные функции
    function refreshAllShuffledVersions() {
        sentenceList.querySelectorAll('.sentence-item').forEach(item => {
            const correct = item.querySelector('strong').textContent;
            const words = correct.split(separator);
            item.querySelector('.shuffled-field').textContent = shuffleWords(words).join(' ');
        });
    }

    function isDuplicateSentence(newSentence) {
        return sentences.some(item => item.correct === newSentence);
    }

    // Сохранение задания
    saveSentenceTaskButton.addEventListener('click', async () => {
        if (sentences.length === 0) {
            alert('Добавьте хотя бы одно предложение!');
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
                    task_type: 'makeASentence',
                    payloads: {
                        title: titleInput.value || "Составить предложения",
                        sentences: sentences
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

    function createTaskHtml(task) {
        return `
            <div class="task-item" id="task-${task.id}">
                <div class="sentence-order-item">
                    <h3>${task.content.title}</h3>
                    ${task.content.sentences.map(sentence => `
                        <div class="sentence-block">
                            <p>${sentence.shuffled} <strong>(${sentence.correct})</strong></p>
                        </div>
                    `).join('')}
                    <button class="btn btn-primary edit-task-button" data-task-id="${task.id}" data-task-type="makeASentence">Редактировать</button>
                    <button class="btn btn-danger delete-task-button" data-task-id="${task.id}">Удалить</button>
                </div>
            </div>
        `;
    }

    // Utils
    function throttle(fn, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                fn(...args);
            }
        };
    }
}