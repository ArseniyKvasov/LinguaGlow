document.addEventListener('DOMContentLoaded', function () {
    const addTaskButton = document.getElementById('addTaskButton');
    const taskSelectionContainer = document.querySelector('.taskSelection');
    const wordListForm = document.getElementById('wordListForm');
    const loadedTasks = document.getElementById('loadedTasks');
    const showWordListFormButton = document.getElementById('showWordListFormButton');
    const wordListFormContainer = document.getElementById('wordListFormContainer');
    const addWordPairButton = document.getElementById('addWordPairButton');
    const wordPairsContainer = document.getElementById('wordPairsContainer');
    const totalForms = document.getElementById('id_form-TOTAL_FORMS');
    const quickInputButton = document.getElementById('quickInputButton');
    const quickInput = document.getElementById('quickInput');
    const sectionId = taskSelectionContainer.getAttribute('data-section-id');

    let isEditing = false;  // Флаг для определения, редактируем ли мы задание
    let editingTaskId = null;  // ID задания, которое редактируем

    // Показываем блок с кнопками при нажатии на "Добавить задание"
    if (addTaskButton && taskSelectionContainer) {
        addTaskButton.addEventListener('click', function () {
            taskSelectionContainer.style.display = 'block';
            addTaskButton.style.display = 'none';
        });

        taskSelectionContainer.addEventListener('click', function () {
            taskSelectionContainer.style.display = 'none';
            addTaskButton.style.display = 'block';
    }

    // Обработка отправки формы списка слов
    if (wordListForm) {
        wordListForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const formData = new FormData(wordListForm);

            if (isEditing) {
                formData.append('task_id', editingTaskId);
            }

            fetch(wordListForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateTaskUI(data);
                    resetForm();
                } else {
                    alert('Ошибка при сохранении задания: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
            });
        });
    }

    // Показ/скрытие формы списка слов
    if (showWordListFormButton && wordListFormContainer) {
        showWordListFormButton.addEventListener('click', function () {
            wordListFormContainer.style.display = wordListFormContainer.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Добавление новой пары слов
    if (addWordPairButton && wordPairsContainer && totalForms) {
        addWordPairButton.addEventListener('click', function () {
            const formCount = parseInt(totalForms.value);
            const newForm = createWordPairForm(formCount);
            wordPairsContainer.appendChild(newForm);
            totalForms.value = formCount + 1;
        });

        wordPairsContainer.addEventListener('click', function (event) {
            if (event.target.classList.contains('delete-word-pair')) {
                event.target.closest('.word-pair').remove();
            }
        });
    }

    // Быстрый ввод пар слов
    if (quickInputButton && quickInput && wordPairsContainer && totalForms) {
        quickInputButton.addEventListener('click', function () {
            const inputText = quickInput.value.trim();
            if (!inputText) return;

            inputText.split('\n').forEach(line => {
                const [english, russian] = line.split('-').map(s => s.trim());
                if (english && russian) {
                    const formCount = parseInt(totalForms.value);
                    const newForm = createWordPairForm(formCount, english, russian);
                    wordPairsContainer.appendChild(newForm);
                    totalForms.value = formCount + 1;
                }
            });

            quickInput.value = '';
        });
    }

    // Редактирование задания
    if (loadedTasks) {
        loadedTasks.addEventListener('click', function (event) {
            if (event.target.classList.contains('edit-task')) {
                const taskId = event.target.getAttribute('data-task-id');
                fetch(`/hub/edit_task/${taskId}/`, {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        populateFormForEditing(data);
                        isEditing = true;
                        editingTaskId = taskId;
                        wordListFormContainer.style.display = 'block';
                    } else {
                        alert('Ошибка при загрузке данных: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Ошибка:', error);
                });
            } else if (event.target.classList.contains('delete-task')) {
                const taskId = event.target.getAttribute('data-task-id');
                if (confirm('Вы уверены, что хотите удалить это задание?')) {
                    deleteTask(taskId);
                }
            }
        });
    }

    // Drag and drop для изменения порядка заданий
    if (loadedTasks) {
        new Sortable(loadedTasks, {
            animation: 150,
            handle: '.task-item',
            onEnd: function () {
                updateTaskOrder();
            }
        });
    }

    // Вспомогательные функции
    function updateTaskUI(data) {
        const loadedTasks = document.getElementById('loadedTasks');
        if (isEditing) {
            const existingTask = document.getElementById(`task-${editingTaskId}`);
            existingTask.innerHTML = `
                <h3>${data.title}</h3>
                <ul>
                    ${data.words.map(word => `<li>${word.english} - ${word.russian}</li>`).join('')}
                </ul>
                <button type="button" class="edit-task btn btn-warning btn-sm" data-task-id="${editingTaskId}">Редактировать</button>
                <button type="button" class="delete-task btn btn-danger btn-sm" data-task-id="${editingTaskId}">Удалить</button>
            `;
        } else {
            const newTask = document.createElement('div');
            newTask.classList.add('task-item');
            newTask.id = `task-${data.task_id}`;
            newTask.innerHTML = `
                <h3>${data.title}</h3>
                <ul>
                    ${data.words.map(word => `<li>${word.english} - ${word.russian}</li>`).join('')}
                </ul>
                <button type="button" class="edit-task btn btn-warning btn-sm" data-task-id="${data.task_id}">Редактировать</button>
                <button type="button" class="delete-task btn btn-danger btn-sm" data-task-id="${data.task_id}">Удалить</button>
            `;
            loadedTasks.appendChild(newTask);
        }
    }

    function resetForm() {
        wordListForm.reset();
        wordListFormContainer.style.display = 'none';
        isEditing = false;
        editingTaskId = null;
    }

    function createWordPairForm(index, english = '', russian = '') {
        const newForm = document.createElement('div');
        newForm.classList.add('word-pair');
        newForm.innerHTML = `
            <div class="form-group">
                <label for="id_form-${index}-english">Английское слово</label>
                <input type="text" class="form-control" name="form-${index}-english" value="${english}" required>
            </div>
            <div class="form-group">
                <label for="id_form-${index}-russian">Перевод</label>
                <input type="text" class="form-control" name="form-${index}-russian" value="${russian}" required>
            </div>
            <button type="button" class="delete-word-pair btn btn-danger btn-sm">Удалить</button>
        `;
        return newForm;
    }

    function populateFormForEditing(data) {
        document.getElementById('wordListTitle').value = data.title;
        const wordPairsContainer = document.getElementById('wordPairsContainer');
        wordPairsContainer.innerHTML = '';

        data.words.forEach((word, index) => {
            const newForm = createWordPairForm(index, word.english, word.russian);
            wordPairsContainer.appendChild(newForm);
        });
    }

    function deleteTask(taskId) {
        fetch(`/hub/delete_task/${taskId}/`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken'),
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById(`task-${taskId}`).remove();
            } else {
                alert('Ошибка при удалении задания: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });
    }

    function updateTaskOrder() {
        const taskIds = Array.from(loadedTasks.querySelectorAll('.task-item')).map(item => item.id.replace('task-', ''));
        fetch('/hub/update_task_order/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({
                task_ids: taskIds,
                section_id: sectionId,
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                alert('Ошибка при обновлении порядка заданий: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
        });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});