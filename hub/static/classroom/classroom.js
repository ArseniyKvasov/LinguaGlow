function showToast(message) {
    // Клонируем шаблон
    let toastTemplate = document.getElementById('toast-template');
    let toastClone = toastTemplate.cloneNode(true);
    toastClone.removeAttribute('id');

    // Устанавливаем текст сообщения
    toastClone.querySelector('.toast-message').textContent = message;

    // Добавляем в контейнер
    document.querySelector('.toast-container').appendChild(toastClone);

    // Инициализируем Toast
    let toast = new bootstrap.Toast(toastClone);
    toast.show();

    // Удаляем уведомление после 2 секунд
    setTimeout(() => {
        toastClone.remove();
    }, 2000);
}

function copyInvitationLink() {
    const linkInput = document.getElementById("invitationLink");
    linkInput.select();
    document.execCommand("copy");
}

// Генерация ссылки при открытии модального окна
document.getElementById("inviteStudentModal").addEventListener("show.bs.modal", function (event) {
    fetch(`/hub/invite/${classroomId}`)
        .then(response => response.json())
        .then(data => {
            const linkInput = document.getElementById("invitationLink");
            linkInput.value = data.invitation_url;
        });
});

document.addEventListener("DOMContentLoaded", function () {
    const sectionLinks = document.querySelectorAll('.section-link');
    const sections = document.querySelectorAll('.section-content');

    sectionLinks.forEach(link => {
        link.addEventListener('click', function () {
            const sectionId = link.getAttribute('data-section');

            // Скрываем все секции
            sections.forEach(section => section.classList.add('d-none'));

            // Показываем нужную секцию
            const activeSection = document.getElementById(`section-${sectionId}`);
            if (activeSection) {
                activeSection.classList.remove('d-none');
            }

            // Меняем выделение у списка
            sectionLinks.forEach(item => item.classList.remove('fw-bold'));
            link.classList.add('fw-bold');
        });
    });
});


// Отображение в реальном времени
let socket = new WebSocket(`ws://${window.location.host}/ws/classroom/${classroomId}/`);

socket.onopen = function () {
    console.log("WebSocket подключен");

    // Отправляем свое имя пользователя при подключении
    sendMessage('join', {});
};

socket.onmessage = function (event) {
    let data = JSON.parse(event.data);

    // Если это уведомление о подключении нового пользователя
    if (data.message_type === 'join') {
        if (data.sender !== username) {
            showToast(`${data.sender} вошел в класс!`);
        }
    } else if (data.message_type === 'match_pair') {
        handlePairMatch(data.payloads);
    } else {
        // Обрабатываем другие типы сообщений
        console.log(`Received message: ${JSON.stringify(data)}`);
    }
};

socket.onerror = function (error) {
    console.error("Ошибка WebSocket:", error);
};

socket.onclose = function () {
    console.log("WebSocket закрыт");
};

// Отправка сообщения
function sendMessage(type, payloads) {
    socket.send(JSON.stringify({
        'message_type': type,
        'sender': username,
        'payloads': payloads
    }));
}

const matchedPairsCache = new Map();

document.querySelectorAll('.match-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const taskContainer = this.closest('[data-task-type="match-words"]');
        const taskId = taskContainer.id.replace('task-', '');
        const isWord = this.hasAttribute('data-word');

        // Поиск парной кнопки
        const activeBtn = taskContainer.querySelector('.match-btn.active:not([data-translation="'+this.dataset.translation+'"])');

        if (activeBtn) {
            const payload = {
                task_id: taskId,
                word: isWord ? this.dataset.word : activeBtn.dataset.word,
                translation: isWord ? activeBtn.dataset.translation : this.dataset.translation
            };

            sendMessage('match_pair', payload);
            activeBtn.classList.remove('active');
            this.classList.remove('active');
        }
        else {
            this.classList.add('active');
        }
    });
});


function handlePairMatch(payload) {
    const { task_id, word, translation } = payload;
    const taskContainer = document.getElementById(`task-${task_id}`);
    const pairsContainer = taskContainer.querySelector(`#matched-pairs-${task_id}`);

    // Добавление новой пары
    const pairElement = document.createElement('div');
    pairElement.className = 'btn btn-success disabled m-1';
    pairElement.innerHTML = `
        ${word}
        <i class="bi bi-arrow-right mx-2"></i>
        ${translation}
    `;

    pairsContainer.appendChild(pairElement);

    // Удаление исходных кнопок
    taskContainer.querySelectorAll(`[data-word="${word}"], [data-translation="${translation}"]`)
        .forEach(btn => btn.remove());
}