import hashlib
import re
import requests
import json
from urllib.parse import quote_plus
from django.core.cache import cache
from django.http import JsonResponse

"""
def search_images(request):
    if request.method == 'POST':
        query = request.POST.get('query', '').strip()
        if not query:
            return JsonResponse({'error': 'Query is required'}, status=400)

        # Убираем лишние пробелы
        query = re.sub(r'\s+', ' ', query)

        page = int(request.POST.get('page', 1)) + 1
        query_hash = hashlib.md5(query.encode()).hexdigest()
        cache_key = f'image_search_{query_hash}_{page}'

        cached_data = cache.get(cache_key)
        if cached_data:
            return JsonResponse(cached_data)

        # Кодируем пробелы как "+"
        encoded_query = quote_plus(query)

        params = {
            'q': encoded_query,  # Используем quote_plus вместо quote
            'page': page,
            'page_size': 12,
            'license_type': 'all',
        }

        try:
            url = 'https://api.openverse.engineering/v1/images/'
            response = requests.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            images = data.get('results', [])

            formatted_images = [
                {'url': image.get('url', ''), 'title': image.get('title', '')}
                for image in images if image.get('url')
            ]

            # Кешируем результаты
            cache.set(cache_key, {'images': formatted_images}, timeout=300)

            return JsonResponse({'images': formatted_images})

        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'error': f'Failed to process response: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)
"""


def search_images(request):
    if request.method == 'POST':
        query = request.POST.get('query', '').strip()
        if not query:
            return JsonResponse({'error': 'Query is required'}, status=400)

        # Убираем лишние пробелы
        query = re.sub(r'\s+', ' ', query)

        page = int(request.POST.get('page', 0))
        query_hash = hashlib.md5(query.encode()).hexdigest()
        cache_key = f'yandex_image_search_{query_hash}_{page}'

        # Проверяем кеш
        cached_data = cache.get(cache_key)
        if cached_data:
            return JsonResponse(cached_data)

        # Кодируем запрос
        encoded_query = quote_plus(query)

        # Параметры запроса
        params = {
            "folderid": "b1g3l54o4p5s9cscjeni",
            "apikey": "AQVNzUQUbAXZMOw1cTK3VjgYEm42ZQL5tz0jI0eH",
            "text": encoded_query,         # Поисковый запрос
            "fyandex": 1,                  # Включить семейный поиск
        }

        # URL для международного поиска
        url = 'https://yandex.ru/images-xml'

        try:
            # Выполняем запрос к Yandex Search API
            response = requests.get(url, params=params)
            response.raise_for_status()

            # Парсим XML-ответ
            from xml.etree import ElementTree as ET
            root = ET.fromstring(response.content)

            # Извлекаем данные о картинках
            images = []
            for group in root.findall('.//group'):
                error = root.find('.//error')
                if error is not None:
                    return JsonResponse({'error': error.text}, status=500)
                url = group.find('.//url').text
                title = group.find('.//title')
                if title is not None:
                    title = title.text
                else:
                    title = ""  # или любое другое значение по умолчанию
                print(url, title)
                if url:
                    images.append({'url': url, 'title': title})

            # Кешируем результаты
            cache.set(cache_key, {'images': images}, timeout=300)
            return JsonResponse({'images': images})

        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': str(e)}, status=500)
        except Exception as e:
            return JsonResponse({'error': f'Failed to process response: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)



def text_generation(request, query, size_limit):
    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
    headers = {
        "Authorization": "Api-Key AQVN1NuvcH5TrdWWJPeEqj0vn3bRiU6LxEr-1Xd1",
        "Content-Type": "application/json",
    }
    data = {
        "folderID": "b1g3l54o4p5s9cscjeni",
        "modelUri": "gpt://b1g3l54o4p5s9cscjeni/yandexgpt/rc",
        "completionOptions": {"maxTokens": 10000, "temperature": 0.5},
        "messages": [
            {"role": "user",
             "text": query}
        ]
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        result = response.json()
        # Проверяем, что в ответе есть текст и он не содержит ссылку на поиск
        if 'alternatives' in result['result'] and len(result['result']['alternatives']) > 0:
            text = result['result']['alternatives'][0]['message']['text']
            print(text)
            # Проверяем, что текст не содержит ссылку на поиск
            if "В интернете есть много сайтов с информацией на эту тему. [Посмотрите, что нашлось в поиске](https://ya.ru)" not in text:
                # Извлекаем JSON-структуру из текста
                match = re.search(r"```(?:.*?)```", text, re.DOTALL)
                if match:
                    # Извлекаем текст внутри тройных кавычек
                    triple_quotes_content = match.group().strip('```')
                    # Проверяем, что внутри тройных кавычек есть JSON
                    try:
                        extracted_json = json.loads(triple_quotes_content)
                        return json.dumps(extracted_json, ensure_ascii=False)
                    except json.JSONDecodeError:
                        return 'Невозможно извлечь корректный JSON из блока между тройными кавычками.'
                else:
                    return 'Невозможно найти блок текста между тройными кавычками.'
            else:
                return "Измените свой запрос и попробуйте снова. Вероятно, Вам стоит избегать спорных и (или) политических тем."
        else:
            return 'Невозможно извлечь текст из ответа.'
    else:
        return 'Что-то пошло не так! Пожалуйста, обратитесь в поддержку - arsenijtam@gmail.com.'

def image_generation(query, size_limit, aspect_ratio="1:1"):
    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync"

    width_ratio, height_ratio = map(int, aspect_ratio.split(":"))

    headers = {
        "Authorization": "Api-Key AQVN1NuvcH5TrdWWJPeEqj0vn3bRiU6LxEr-1Xd1",
        "Content-Type": "application/json",
        "X-Folder-Id": "b1g3l54o4p5s9cscjeni",
    }

    data = {
        "modelUri": "art://b1g3l54o4p5s9cscjeni/yandex-art/latest",
        "generationOptions": {
            "seed": "1863",
            "maxTokens": size_limit * 100,
            "aspectRatio": {"widthRatio": width_ratio, "heightRatio": height_ratio},
        },
        "messages": [{"text": query}],
    }

    response = requests.post(url, json=data, headers=headers)

    # Получаем ID операции
    if response.status_code != 200:
        return "Что-то пошло не так! Пожалуйста, обратись в поддержку - arsenijtam@gmail.com."

    operation_id = response.json().get("id")
    if not operation_id:
        print("Error: Operation ID not found in the response.")
        return None

    # Проверяем статус операции
    pass