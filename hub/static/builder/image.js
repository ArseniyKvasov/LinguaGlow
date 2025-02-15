export function init(taskData = null, selectedTasksData = null) {
    const imageBlocksContainer = document.getElementById('imageBlocksContainer');
    const addImageBlockButton = document.getElementById('addImageBlockButton');
    const searchAllButton = document.getElementById('searchAllButton');
    const saveAllButton = document.getElementById('saveAllButton');

    const blocksData = [];

    if (taskData && Array.isArray(taskData)) {
        addImageBlockButton.style.display = 'none';
        searchAllButton.style.display = 'none';
        saveAllButton.innerHTML = 'Сохранить';
        taskData.forEach((imageData, index) => {
            const newBlock = createImageBlock(index);
            const blockData = setupImageBlock(newBlock);
            blockData.setData({
                imageUrl: taskData.image_url,
                caption: taskData.caption,
            });
            blocksData.push(blockData);
            imageBlocksContainer.appendChild(newBlock);
        });
    } else if (taskData) {
        addImageBlockButton.style.display = 'none';
        searchAllButton.style.display = 'none';
        saveAllButton.innerHTML = 'Сохранить';
        const newBlock = createImageBlock(0);
        const blockData = setupImageBlock(newBlock);
        blockData.setData({
            imageUrl: taskData.image_url,
            caption: taskData.caption,
        });
        blocksData.push(blockData);
        imageBlocksContainer.appendChild(newBlock);
    } else {
        const firstBlock = createImageBlock(0);
        const blockData = setupImageBlock(firstBlock);
        blocksData.push(blockData);
        imageBlocksContainer.appendChild(firstBlock);
    }

    function createImageBlock(index) {
        const blockId = `imageBlock_${Date.now()}_${index}`;
        const block = document.createElement('div');
        block.className = 'image-block card mb-3';
        block.id = blockId;
        block.innerHTML = `
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <button type="button" class="btn btn-link btn-sm add-caption-button">+ Подпись</button>
                    <button type="button" class="btn btn-danger btn-sm remove-block-button">×</button>
                </div>
                <input type="text" class="form-control caption-input d-none mb-1" placeholder="Подпись">

                <div class="row g-1 align-items-center mb-2">
                    <div class="col-8">
                        <div class="input-group">
                            <input type="text" class="form-control search-input" placeholder="Поиск...">
                            <button type="button" class="btn btn-secondary search-button">
                                <i class="bi bi-search"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-4">
                        <label class="btn btn-secondary w-100 m-0 upload-label py-1">
                            <i class="bi bi-upload"></i>
                            <input type="file" class="d-none upload-input" accept="image/*">
                        </label>
                    </div>
                </div>

                <div class="image-preview position-relative rounded border">
                    <div class="drop-indicator d-none">
                        <div class="h-100 d-flex align-items-center justify-content-center">
                            <i class="bi bi-image fs-1 opacity-50"></i>
                        </div>
                    </div>
                </div>
                <div class="search-results row g-1 mt-1"></div>
            </div>
        `;
        const addCaptionButton = block.querySelector('.add-caption-button');
        const captionInput = block.querySelector('.caption-input');
        addCaptionButton.addEventListener('click', () => {
            captionInput.classList.remove('d-none');
            addCaptionButton.classList.add('d-none');
            captionInput.focus();
        });
        return block;
    }

    // В функции setupImageBlock:
    function setupImageBlock(block) {
        const uploadInput = block.querySelector('.upload-input');
        const searchInput = block.querySelector('.search-input');
        const searchButton = block.querySelector('.search-button');
        const previewContainer = block.querySelector('.image-preview');
        const searchResults = block.querySelector('.search-results');
        const removeBlockButton = block.querySelector('.remove-block-button');
        const addCaptionButton = block.querySelector('.add-caption-button');
        const captionInput = block.querySelector('.caption-input');
        const dropIndicator = block.querySelector('.drop-indicator');

        let selectedImageUrl = null;
        let currentPage = 0;
        let allImages = [];

        block.addEventListener('dragover', handleDragOver);
        block.addEventListener('dragleave', handleDragLeave);
        block.addEventListener('drop', handleDrop);

        uploadInput.addEventListener('change', handleFileUpload);
        searchButton.addEventListener('click', () => handleImageSearch(searchInput.value.trim()));
        searchResults.addEventListener('click', handleImageSelect);

        removeBlockButton.addEventListener('click', () => {
            const blockIndex = blocksData.findIndex(data => data.block === block);
            if (blockIndex !== -1) {
                blocksData.splice(blockIndex, 1);
            }

            block.remove();
        });

        const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];

        function handleDragOver(e) {
            if (!e.dataTransfer.items[0]?.type?.startsWith('image/')) return;
            e.preventDefault();
            block.style.opacity = '0.7';
            dropIndicator.classList.remove('d-none');
        }

        function handleDragLeave(e) {
            e.preventDefault();
            block.style.opacity = '1';
            dropIndicator.classList.add('d-none');
        }

        function handleDrop(e) {
            e.preventDefault();
            handleDragLeave(e);

            const file = e.dataTransfer.files[0];
            if (file && validTypes.includes(file.type)) {
                handleFile(file);
            } else {
                alert('Допустимые форматы: SVG, PNG, JPG, JPEG, GIF');
            }
        }

        async function handleFileUpload(e) {
            const file = e.target.files[0];
            if (file && validTypes.includes(file.type)) {
                handleFile(file);
            } else {
                alert('Допустимые форматы: SVG, PNG, JPG, JPEG, GIF');
                e.target.value = '';
            }
        }

        function handleFile(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    previewContainer.style.width = img.width + 'px';
                    previewContainer.style.maxWidth = '100%';
                    previewContainer.style.height = 'auto';
                    selectedImageUrl = e.target.result;
                    updatePreview();
                    searchResults.classList.add('d-none');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function handleImageSelect(e) {
            const img = e.target.closest('img');
            if (img) {
                const selectedImg = new Image();
                selectedImg.onload = () => {
                    previewContainer.style.width = selectedImg.width + 'px';
                    previewContainer.style.maxWidth = '100%';
                    previewContainer.style.height = 'auto';
                };
                selectedImg.src = img.dataset.url;

                selectedImageUrl = img.dataset.url;
                updatePreview();
                searchResults.classList.add('d-none');
            }
        }

        async function handleImageSearch(query) {
            if (!query) return;

            try {
                const response = await fetch('/hub/search-images/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': csrftoken,
                    },
                    body: `query=${encodeURIComponent(query)}&page=${currentPage}`,
                });

                const data = await response.json();
                allImages = data.images || [];
                displaySearchResults();
            } catch (error) {
                console.error('Ошибка поиска:', error);
            }
        }

        function displaySearchResults() {
            searchResults.innerHTML = '';
            allImages.forEach((image) => {
                const col = document.createElement('div');
                col.className = 'col-4';
                col.innerHTML = `
                    <div class="image-item ratio ratio-1x1">
                        <img src="${image.url}"
                             class="img-cover rounded cursor-pointer"
                             data-url="${image.url}">
                    </div>
                `;
                searchResults.appendChild(col);
            });
            searchResults.classList.remove('d-none');
        }

        function updatePreview() {
            previewContainer.innerHTML = `
                <img src="${selectedImageUrl}"
                     class="img-fluid rounded"
                     style="display: block; max-width: 100%; height: auto;">
            `;
        }

        return {
            block: block,
            getData: () => {
                const caption = block.querySelector('.caption-input').value.trim();
                const imageUrl = selectedImageUrl || (allImages.length > 0 ? allImages[0].url : null);

                return {
                    caption,
                    imageUrl: imageUrl
                };
            },
            setData: (data) => {
                const captionInput = block.querySelector('.caption-input');
                const addCaptionButton = block.querySelector('.add-caption-button');

                // Устанавливаем подпись, если она есть
                if (data.caption) {
                    captionInput.value = data.caption;
                    captionInput.classList.remove('d-none');
                    addCaptionButton.classList.add('d-none');
                }

                // Устанавливаем изображение, если оно есть
                if (data.imageUrl) {
                    selectedImageUrl = data.imageUrl;
                    updatePreview();
                }
            }
        };
    }

    function findDuplicates(array) {
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

    addImageBlockButton.addEventListener('click', () => {
        const newBlock = createImageBlock(blocksData.length);
        const blockData = setupImageBlock(newBlock);
        blocksData.push(blockData);
        imageBlocksContainer.appendChild(newBlock);
    });

    searchAllButton.addEventListener('click', () => {
        document.querySelectorAll('.search-button').forEach(btn => btn.click());
    });

    saveAllButton.addEventListener('click', async () => {
        console.log(blocksData);
        const dataToSave = blocksData
            .map(block => block.getData())
            .filter(item => item.imageUrl);

        if (dataToSave.length === 0) {
            alert('Добавьте хотя бы одну картинку!');
            return;
        }

        // Проверка на дубликаты
        const imageUrls = dataToSave.map(item => item.imageUrl);
        const duplicateUrls = findDuplicates(imageUrls);

        if (duplicateUrls.length > 0) {
            const confirmSave = confirm(
                `Найдены дубликаты изображений в блоках:\n${duplicateUrls.join(', ')}\nПродолжить сохранение?`
            );
            if (!confirmSave) {
                return;
            }
        }

        try {
            const saveSingleImage = async (payload) => {
                const response = await fetch(`/hub/section/${sectionId}/add_task/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrftoken,
                    },
                    body: JSON.stringify({
                        ...(taskData ? { obj_id: taskData.id } : {}),
                        task_type: 'image',
                        payloads: [payload]
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Ошибка при сохранении изображения: ${response.statusText}`);
                }

                return response.json();
            };

            const results = [];
            for (const payload of dataToSave) {
                try {
                    const result = await saveSingleImage(payload);
                    results.push({ success: true, data: result });

                    // Генерация HTML для нового изображения
                    const newTaskHtml = `
                        <div class="task-item" id="task-${result.task.id}">
                            <div class="image-item">
                                <h3>${result.task.content.caption || ''}</h3>
                                <img src="${result.task.content.image_url}"
                                     alt="${result.task.content.caption}"
                                     class="img-fluid"
                                     style="max-width: 80%; max-height: 50vh; border-radius: 15px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); margin: 0 auto;">
                                <div class="mt-2">
                                    <button class="btn btn-primary edit-task-button"
                                            data-task-id="${result.task.id}"
                                            data-task-type="image">
                                        Редактировать
                                    </button>
                                    <button class="btn btn-danger delete-task-button"
                                            data-task-id="${result.task.id}">
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;

                    // Добавление в DOM
                    if (!taskData) {
                        loadedTasks.insertAdjacentHTML('beforeend', newTaskHtml);
                    } else {
                        const elementToUpdate = document.getElementById(`task-${result.task.id}`);
                        elementToUpdate.innerHTML = newTaskHtml;
                        elementToUpdate.scrollIntoView({ block: 'start' });
                    }

                    // Прокрутка к новому элементу
                    const newTaskElement = document.getElementById(`task-${result.task.id}`);
                    if (newTaskElement) {
                        newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } catch (error) {
                    console.error('Ошибка при сохранении изображения:', error);
                    results.push({ success: false, error: error.message });
                }
            }

            const failedSaves = results.filter(result => !result.success);
            if (failedSaves.length > 0) {
                alert(`Не удалось сохранить ${failedSaves.length} изображений.`);
            } else {
                document.getElementById('overlay').style.display = 'none';
                const addActivityButton = document.getElementById('addActivityButton');
                const activityCreationBlock = document.getElementById('activityCreationBlock');
                addActivityButton.style.display = 'block';
                activityCreationBlock.style.display = 'none';

                // Очистка блоков после успешного сохранения
                imageBlocksContainer.innerHTML = '';
                blocksData.length = 0;
            }

        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Произошла ошибка при сохранении изображений.');
        }
    });
}