export function init(taskData = null, selectedTasksData = null) {
    const audioFileInput = document.getElementById('audioFileInput');
    const saveButton = document.getElementById('saveAudioButton');
    const audioFormContainer = document.getElementById('audioFormContainer');
    let audioPlayer;
    const sectionId = document.getElementById('sectionId').value; // Добавьте скрытое поле в HTML с section_id
    const csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]').value; // Получаем CSRF-токен

    // Функция для создания аудиоплеера
    const createAudioPlayer = (file) => {
        const audio = document.createElement('audio');
        audio.className = 'w-100 mt-3';
        audio.controls = true;
        audio.src = URL.createObjectURL(file);
        return audio;
    };

    // Обработчик выбора файла
    audioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];

        if (file && file.type.startsWith('audio/')) {
            // Удаляем старый плеер
            if (audioPlayer) audioPlayer.remove();

            // Создаем новый плеер
            audioPlayer = createAudioPlayer(file);

            // Вставляем перед textarea
            audioFormContainer.insertBefore(
                audioPlayer,
                document.getElementById('audioScriptInput').parentNode
            );
        }
    });

    // Обработчик кнопки "Сохранить"
    saveButton.addEventListener('click', async () => {
        const file = audioFileInput.files[0];
        const transcript = document.getElementById('audioScriptInput').value;

        if (!file) {
            alert('Сначала выберите аудиофайл');
            return;
        }

        try {
            /// 1. Загрузка файла на сервер
            const uploadResponse = await fetch('/api/upload/audio/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken, // Добавляем CSRF-токен
                },
                body: new FormData().append('file', file)
            });

            if (!uploadResponse.ok) {
                throw new Error('Ошибка загрузки файла');
            }

            const uploadData = await uploadResponse.json();
            const audioUrl = uploadData.url;

            // 2. Формирование payload для taskFactory
            const payloads = {
                audio_url: audioUrl,
                transcript: transcript
            };

            // 3. Отправка через taskFactory
            const taskData = {
                task_type: 'audio',
                payloads: payloads
            };

            const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken, // Добавляем CSRF-токен
                },
                body: JSON.stringify(taskData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Ошибка сохранения: ${errorData.error}`);
            }

            alert('Аудио успешно сохранено!');

            // Очистка формы
            audioFileInput.value = '';
            document.getElementById('audioScriptInput').value = '';
            audioPlayer.remove();

        } catch (error) {
            console.error(error);
            alert('Произошла ошибка: ' + error.message);
        }
    });
};