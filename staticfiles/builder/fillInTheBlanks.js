export function init(taskData = null, selectedTasksData = null) {
    const textInput = document.getElementById('fillTaskTextInput');
    const saveTaskButton = document.getElementById('saveFillTaskButton');
    const titleInput = document.getElementById('fillTaskTitleInput') || document.createElement('input');
    const formatRadios = document.querySelectorAll('input[name="displayFormat"]');
    const instructionElement = document.getElementById('fillTaskInstruction');
    const warningElement = document.getElementById('fillTaskWarning');
    const AIFillInTheBlanksButton = document.getElementById('AIFillInTheBlanksButton');
    const AIFillInTheBlanksBlock = document.getElementById('AIFillInTheBlanksBlock');
    const generateAIFillInTheBlanksButton = document.getElementById('generateAIFillInTheBlanksButton');
    const AIInput = AIFillInTheBlanksBlock.querySelector('.ai-input');
    const AIQuantityInput = AIFillInTheBlanksBlock.querySelector('.ai-quantity-input');
    const rangeValue = AIFillInTheBlanksBlock.querySelector('.range-value');
    const aiGenerationOptions = AIFillInTheBlanksBlock.querySelectorAll('.ai-generation-option');
    const additionalFillInTheBlanksRequirements = AIFillInTheBlanksBlock.querySelector('.additional-fill-the-blanks-requirements');
    const additionalFillInTheBlanksRequirementsButton = AIFillInTheBlanksBlock.querySelector('.add-additional-fill-the-blanks-requirements-button');


    if (taskData) {
        titleInput.value = taskData.title || '';
        textInput.value = taskData.text || '';
        const format = taskData.display_format || 'list';
        document.querySelector(`input[value="${format}"]`).checked = true;
    }

    document.querySelectorAll('input[name="displayFormat"]').forEach(radio => {
        radio.addEventListener('change', () => {
            instructionElement.textContent = radio.value === 'list' ? 'Это пример текста с [правильным ответом] в квадратных скобках.' : 'Это пример текста с двумя вариантами ответов: [верный, отмеченный звездочкой* / неверный] в квадратных скобках.';
            checkForDanger();
        });
    });

    textInput.addEventListener('input', throttle(checkForDanger, 300));

    function checkForDanger() {
        const hasSlashInBrackets = /\[\s*[^]*?\/[^]*?\s*\]/.test(textInput.value);
        warningElement.textContent = hasSlashInBrackets && document.getElementById('formatList').checked ? 'Это текст со списком. Вы не можете указывать несколько ответов для одного пропуска. Измените тип задания, иначе слэш будет отображен в ответе.' : '';
    }

    saveTaskButton.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            alert('Введите текст для задания!');
            return;
        }

        const selectedFormat = document.querySelector('input[name="displayFormat"]:checked').value;

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
                    task_type: 'fillInTheBlanks',
                    payloads: {
                        title: titleInput.value || 'Fill In The Blanks',
                        display_format: selectedFormat,
                        text: convertMarkdownToHTML(text)
                    }
                }),
            });

            const result = await response.json();

            if (result.success) {
              const taskHtml = createFillInTheBlanksHtml(result.task);
              const loadedTasks = document.getElementById('loadedTasks');
              document.getElementById('overlay').style.display = 'none';

              if (!taskData) {
                loadedTasks.insertAdjacentHTML('beforeend', taskHtml);
                const newTaskElement = document.getElementById(`task-${result.task.id}`);

                // Инициализируем только что добавленный элемент
                FillInTheBlanks.init(newTaskElement);

                newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else {
                const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                elementToUpdate.innerHTML = taskHtml;

                // Реинициализируем обновленный элемент
                FillInTheBlanks.init(elementToUpdate);

                elementToUpdate.scrollIntoView({ block: 'start' });
              }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при отправке данных.');
        }
    });

    function createFillInTheBlanksHtml(task) {
      return `
        <div class="task-item" id="task-${task.id}">
          <div class="fill-in-the-blanks-item">
            <h3>${task.content.title}</h3>

            ${task.content.display_format === "list" ? `
              <div class="missing-words-list">
                <h4>Пропущенные слова:</h4>
                <ul id="answer-list-${task.id}"></ul>
              </div>
            ` : ''}

            <p id="task-text-${task.id}">
              ${task.content.text}
            </p>

            <div class="task-buttons">
              <button class="btn btn-primary edit-task-button"
                data-task-id="${task.id}"
                data-task-type="fillintheblanks">
                Редактировать
              </button>
              <button class="btn btn-danger delete-task-button"
                data-task-id="${task.id}">
                Удалить
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Вспомогательная функция для экранирования HTML
    function escapeHtml(unsafe) {
      return unsafe?.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;") || '';
    }

    function throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func(...args);
            }
        };
    }
    AIFillInTheBlanksButton.addEventListener('click', () => {
        AIFillInTheBlanksBlock.style.display = 'block';
        AIFillInTheBlanksBlock.scrollIntoView({ behavior: 'smooth' });
        AIInput.focus();
    });

    additionalFillInTheBlanksRequirementsButton.addEventListener('click', () => {
        additionalFillInTheBlanksRequirements.style.display = 'block';
        additionalFillInTheBlanksRequirementsButton.style.display = 'none';
        additionalFillInTheBlanksRequirements.focus();
        const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked).value;
        if (selectedOption === 'selected') {
            additionalFillInTheBlanksRequirements.placeholder = 'Добавьте дополнительные требования к уже существующему заданию.';
        }
    });

    generateAIFillInTheBlanksButton.addEventListener('click', async () => {
        if (AIInput.value.trim() === '') {
            alert('Нет данных для генерации.');
            return;
        }
        generateAIFillInTheBlanksButton.disabled = true;
        AIInput.disabled = true;
        saveTaskButton.disabled = true;
        AIQuantityInput.disabled = true;
        aiGenerationOptions.forEach(option => {
            option.disabled = true;
        });
        additionalFillInTheBlanksRequirements.disabled = true;
        additionalFillInTheBlanksRequirementsButton.disabled = true;

        try {
            const selectedOption = Array.from(aiGenerationOptions).find(option => option.checked)?.value;
            const topic = AIInput.value.trim();
            const quantity = AIQuantityInput.value.trim();
            const requirements = additionalFillInTheBlanksRequirements.value.trim();
            const basics = (selectedOption === 'selected' ? selectedTasksData : '');

            const payload = {
                'topic': topic,
                'quantity': quantity,
                'requirements': requirements,
                'basics': basics,
            };

            const response = await fetch("/hub/generate-task/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    function_name: 'fillInTheBlanks',
                    payloads: payload,
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
                const fillInTheBlanks = JSON.parse(result.result);

                textInput.value = fillInTheBlanks.join('\n');

                AIFillInTheBlanksBlock.scrollIntoView({ behavior: 'smooth' });
                AIInput.value = '';
                AIQuantityInput.value = '';
                additionalFillInTheBlanksRequirements.value = '';
                AIFillInTheBlanksBlock.style.display = 'none';
                saveTaskButton.disabled = false;
            } else {
                alert("Ошибка: пустой ответ от сервера.");
            }
        } catch (error) {
            console.error('Ошибка запроса:', error);
            alert('Ошибка при генерации. Попробуйте снова.');
        } finally {
            generateAIFillInTheBlanksButton.disabled = false;
            AIInput.disabled = false;
            AIQuantityInput.disabled = false;
            aiGenerationOptions.forEach(option => {
                option.disabled = false;
            });
            additionalFillInTheBlanksRequirements.disabled = false;
            additionalFillInTheBlanksRequirementsButton.disabled = false;
        }
    });

    // Обновление значения количества предложений при изменении ползунка
    AIQuantityInput.addEventListener('input', (event) => {
        rangeValue.textContent = event.target.value;
    });

}
