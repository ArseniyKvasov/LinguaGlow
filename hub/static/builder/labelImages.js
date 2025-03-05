export function init(taskData = null, selectedTasksData = null) {
    const labelImagesBlocksContainer = document.getElementById('labelImagesBlocksContainer');
    const addLabelImagesBlockButton = document.getElementById('addLabelImagesBlockButton');
    const searchAllLabelImagesButton = document.getElementById('searchAllLabelImagesButton');
    const saveAllLabelImagesButton = document.getElementById('saveAllLabelImagesButton');
    const taskFormatSelector = document.getElementById('taskFormatSelector');
    const labelImagesBlocksData = [];

    if (taskData) {
        saveAllLabelImagesButton.innerHTML = 'Сохранить';

        taskData.image_urls.forEach((imageUrl, index) => {
            const newBlock = createLabelImagesBlock(index);
            const blockData = setupLabelImagesBlock(newBlock);
            blockData.setData({
                imageUrl: imageUrl,
                label: taskData.labels[index] || '', // Если нет подписи, подставляем пустую строку
            });
            labelImagesBlocksData.push(blockData);
            labelImagesBlocksContainer.appendChild(newBlock);
        });
    }

    function createLabelImagesBlock(index) {
        const labelImagesBlockId = `labelImagesBlock_${Date.now()}_${index}`;
        const labelImagesBlock = document.createElement('div');
        labelImagesBlock.className = 'label-images-block card mb-3';
        labelImagesBlock.id = labelImagesBlockId;
        labelImagesBlock.innerHTML = `
            <button class="delete-block-btn btn btn-danger btn-sm position-absolute" style="top: 5px; left: 5px;">✖</button>
            <div class="card-body p-2">
                <div class="row align-items-center mb-2">
                    <div class="col-8">
                        <div class="search-results-label-images row g-1 mt-1">
                            <p class="align-self-center fw-bold text-secondary text-center info">Найдите или загрузите изображение</p>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="image-preview-label-images row overflow-auto">
                            <!-- Тег <img> будет добавлен динамически -->
                        </div>
                    </div>
                </div>
                <div class="input-group w-100 mb-2">
                    <input type="text" class="form-control query-input" placeholder="Введите запрос..." required>
                    <button type="button" class="btn btn-secondary search-label-images-button">
                        <i class="bi bi-search"></i>
                    </button>
                </div>
            </div>
        `;
        return labelImagesBlock;
    }

    function setupLabelImagesBlock(labelImagesBlock) {
        const queryInput = labelImagesBlock.querySelector('.query-input');
        const searchLabelImagesButton = labelImagesBlock.querySelector('.search-label-images-button');
        const searchResultsLabelImages = labelImagesBlock.querySelector('.search-results-label-images');
        const infoText = searchResultsLabelImages.querySelector('.info');
        const previewLabelImagesContainer = labelImagesBlock.querySelector('.image-preview-label-images');

        let selectedLabelImagesUrl = null;
        let currentLabelImagesPage = 0;
        let allLabelImages = [];

        searchLabelImagesButton.addEventListener('click', async () => handleImageSearchLabelImages(queryInput.value.trim()));
        searchResultsLabelImages.addEventListener('click', handleImageSelectLabelImages);
        labelImagesBlock.addEventListener('dragover', handleDragOverLabelImages);
        labelImagesBlock.addEventListener('dragleave', handleDragLeaveLabelImages);
        labelImagesBlock.addEventListener('drop', handleDropLabelImages);
        labelImagesBlock.addEventListener('paste', handlePasteLabelImages);
        previewLabelImagesContainer.addEventListener('click', () => handleFileUploadLabelImages());

        searchLabelImagesButton.addEventListener('click', async () => {
            searchLabelImagesButton.disabled = true; // Деактивируем кнопку
            await handleImageSearchLabelImages(queryInput.value.trim());
            searchLabelImagesButton.disabled = false;
        });

        const deleteButton = labelImagesBlock.querySelector('.delete-block-btn');
        deleteButton.addEventListener('click', () => {
            searchResultsLabelImages.innerHTML = '';
            labelImagesBlocksContainer.removeChild(labelImagesBlock);
            const index = labelImagesBlocksData.findIndex(blockData => blockData.block === labelImagesBlock);
            if (index !== -1) {
                labelImagesBlocksData.splice(index, 1);
            }
        });

         // Добавляем обработчик события для текстового поля
        queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Предотвращаем отправку формы
                searchLabelImagesButton.click();
            }
        });

        async function handleImageSearchLabelImages(query) {
            if (!query) return;

            try {
                const response = await fetch('/hub/search-images/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': csrftoken,
                    },
                    body: `query=${encodeURIComponent(query)}&page=${currentLabelImagesPage}`,
                });

                const data = await response.json();
                allLabelImages = data.images || [];
                displaySearchResultsLabelImages();
            } catch (error) {
                console.error('Ошибка поиска:', error);
            }
        }

        function displaySearchResultsLabelImages() {
            searchResultsLabelImages.innerHTML = '';
            searchResultsLabelImages.classList.remove('d-none');
            infoText.style.display = 'none';
            allLabelImages.forEach((image, index) => {
                const col = document.createElement('div');
                col.className = 'col-4';
                col.innerHTML = `
                    <div class="image-item ratio ratio-1x1">
                        <img src="${image.url}" class="img-cover rounded cursor-pointer" data-url="${image.url}" style="object-fit: cover;">
                    </div>
                `;
                searchResultsLabelImages.appendChild(col);
            });
        }

        function handleImageSelectLabelImages(e) {
            const img = e.target.closest('img');
            if (img) {
                const selectedImg = new Image();
                selectedImg.src = img.dataset.url;
                selectedLabelImagesUrl = img.dataset.url;
                updatePreviewLabelImages();
                searchResultsLabelImages.classList.add('d-none');
            }
        }

        function handleDragOverLabelImages(e) {
            if (!e.dataTransfer.items[0]?.type?.startsWith('image/')) return;
            e.preventDefault();
            previewLabelImagesContainer.style.opacity = '0.7';
        }

        function handleDragLeaveLabelImages(e) {
            e.preventDefault();
            previewLabelImagesContainer.style.opacity = '1';
        }

        function handleDropLabelImages(e) {
            e.preventDefault();
            handleDragLeaveLabelImages(e);
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileLabelImages(file);
            }
        }

        async function handleFileUploadLabelImages() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleFileLabelImages(file);
                }
            };
            input.click();
        }

        function handleFileLabelImages(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous'; // Установите crossOrigin
                img.onload = () => {
                    previewLabelImagesContainer.style.width = img.width + 'px';
                    previewLabelImagesContainer.style.maxWidth = '100%';
                    previewLabelImagesContainer.style.height = 'auto';
                    selectedLabelImagesUrl = e.target.result;
                    updatePreviewLabelImages();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function handlePasteLabelImages(e) {
            // Получаем данные из буфера обмена
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;

            // Ищем изображение среди вставленных данных
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile(); // Получаем файл изображения
                    if (file) {
                        handleFileLabelImages(file); // Обрабатываем файл
                        break;
                    }
                }
            }
        }

        function updatePreviewLabelImages() {
            infoText.style.display = 'none';
            if (selectedLabelImagesUrl) {
                const img = document.createElement('img');
                img.src = selectedLabelImagesUrl;
                img.alt = '';
                img.style.objectFit = 'cover';
                previewLabelImagesContainer.innerHTML = ''; // Очистить текущий контент
                previewLabelImagesContainer.appendChild(img);
            } else {
                previewLabelImagesContainer.innerHTML = ''; // Очистить контент, если изображение не выбрано
            }
        }


        return {
            block: labelImagesBlock,
            getData: () => {
                const label = queryInput.value.trim();
                const imageUrl = selectedLabelImagesUrl || (allLabelImages.length > 0 ? allLabelImages[0].url : null);

                return {
                    label,
                    imageUrl: imageUrl
                };
            },
            setData: (data) => {
                const queryInput = labelImagesBlock.querySelector('.query-input');
                const searchLabelImagesButton = labelImagesBlock.querySelector('.search-label-images-button');
                const previewLabelImagesContainer = labelImagesBlock.querySelector('.image-preview-label-images');

                // Устанавливаем запрос, если он есть
                if (data.label) {
                    queryInput.value = data.label;
                }

                // Устанавливаем изображение, если оно есть
                if (data.imageUrl) {
                    selectedLabelImagesUrl = data.imageUrl;
                    updatePreviewLabelImages();
                }

            }
        };
    }

    function findDuplicatesLabelImages(array) {
        const seen = new Set();
        const duplicates = new Set();

        array.forEach(item => {
            if (seen.has(item)) {
                duplicates.add(item);
            } else {
                seen.add(item);
            }
        });

        return Array.from(duplicates);
    }

    addLabelImagesBlockButton.addEventListener('click', () => {
        const newBlock = createLabelImagesBlock(labelImagesBlocksData.length);
        const blockData = setupLabelImagesBlock(newBlock);
        labelImagesBlocksData.push(blockData);
        labelImagesBlocksContainer.appendChild(newBlock);
        newBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const newQueryInput = newBlock.querySelector('.query-input');
        newQueryInput.focus();
    });

    searchAllLabelImagesButton.addEventListener('click', () => {
        document.querySelectorAll('.search-label-images-button').forEach(btn => btn.click());
    });

    saveAllLabelImagesButton.addEventListener('click', async () => {
        const dataToSave = labelImagesBlocksData.map(block => block.getData()).filter(item => item.imageUrl);

        if (dataToSave.length < 2) {
            alert('Должно быть не менее двух картинок');
            return;
        }

        // Проверка на дубликаты
        const imageUrls = dataToSave.map(item => item.imageUrl);
        const duplicateUrls = findDuplicatesLabelImages(imageUrls);

        if (duplicateUrls.length > 0) {
            const confirmSave = confirm(
                `Найдены дубликаты изображений в блоках:\n${duplicateUrls.join(', ')}\nПродолжить сохранение?`
            );
            if (!confirmSave) return;
        }

        try {
            const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    ...(taskData ? { obj_id: taskData.id } : {}),
                    task_type: 'label_images',
                    payloads: dataToSave
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Ошибка сохранения');
            }

            // Обновление DOM
            const newTaskHtml = result.task.content.images.map((img, index) => `
                <div class="col-xxl-1 col-lg-2 col-md-3 col-sm-4 col-6 mb-4">
                    <div class="card h-100">
                        <img src="${img.imageUrl}" class="card-img-top" alt="${img.label}">
                        <div class="card-body">
                            <h5 class="card-title text-center">${img.label}</h5>
                        </div>
                    </div>
                </div>
            `).join('');

            const buttonsHtml = `
                <div class="mt-4">
                    <button class="btn btn-primary edit-task-button"
                        data-task-id="${result.task.id}"
                        data-task-type="label_images">
                        Редактировать
                    </button>
                    <button class="btn btn-danger delete-task-button"
                        data-task-id="${result.task.id}">
                        Удалить
                    </button>
                </div>
            `;

            const container = document.getElementById('loadedTasks');
            if (taskData) {
                const existing = container.querySelector(`#task-${result.task.id}`);
                if (existing) existing.innerHTML = newTaskHtml + buttonsHtml;
            } else {
                container.insertAdjacentHTML('beforeend',
                    `<div id="task-${result.task.id}" class="row">${newTaskHtml}${buttonsHtml}</div>`
                );
            }

            // Очистка только при успешном создании новой задачи
            if (!taskData) {
                labelImagesBlocksContainer.innerHTML = '';
                labelImagesBlocksData.length = 0;
                document.getElementById('overlay').style.display = 'none';
                document.getElementById('addActivityButton').style.display = 'block';
                document.getElementById('activityCreationBlock').style.display = 'none';
            }

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert(error.message || 'Произошла ошибка при сохранении');
        }
    });
}