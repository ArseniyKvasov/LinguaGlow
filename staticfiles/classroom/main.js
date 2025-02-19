document.addEventListener("DOMContentLoaded", function () {
    // Перемешивание слов в колонках задания match up the words
    shuffleElements("word-column-{{ task.id }}");
    shuffleElements("translation-column-{{ task.id }}");
});


function shuffleElements(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let elements = Array.from(container.children);
    elements.sort(() => Math.random() - 0.5);
    elements.forEach(el => container.appendChild(el));
}

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