import json
import base64
import re
import random

from django import template

register = template.Library()

@register.filter
def zip_lists(a, b):
    return list(zip(a, b))

@register.filter(name='index')
def index(list, i):
    """
    Фильтр для получения элемента списка по индексу.
    """
    try:
        return list[i]
    except (IndexError, TypeError):
        return None

@register.filter
def get_current_user(request):
    """Возвращает текущего пользователя (учителя) из запроса."""
    return request.user

@register.filter
def to_json(value):
    """
    Преобразует Python-словарь в JSON-строку с двойными кавычками.
    """
    return json.dumps(value)

def encode_base64(value):
    return base64.b64encode(value.encode()).decode()

@register.filter
def dict_to_json(value):
    """
    Преобразует Python-словарь в JSON-строку с зашифрованными словами.
    """
    for item in value:
        item['word'] = encode_base64(item['word'])
    return json.dumps(value)

@register.filter
def test_to_json(value):
    """
    Преобразует Python-словарь в JSON-строку с зашифрованными словами.
    """
    for elem in value:
        for item in elem['answers']:
            item['answer'] = encode_base64(item['answer'])
    return json.dumps(value)

@register.filter
def base64_encode(text):
    byte_data = text.encode('utf-8')
    # Кодируем байты в Base64
    base64_encoded = base64.b64encode(byte_data).decode('utf-8')
    return base64_encoded

@register.filter
def shuffle_letters(value):
    if not value:
        return ""
    letters = list(value)
    random.shuffle(letters)
    return ''.join(letters)

@register.filter
def split(value, separator):
    return value.split(separator)

@register.filter(name='split_blanks')
def split_blanks(value):
    """
    Разделяет текст на части с выделением пропусков в квадратных скобках
    """
    parts = []
    current_part = ""
    in_brackets = False
    for char in value:
        if char == '[':
            # Начало пропуска
            if current_part:
                parts.append(('text', current_part))
            current_part = ""
            in_brackets = True
        elif char == ']':
            # Конец пропуска
            if in_brackets:
                parts.append(('input', base64_encode(current_part)))
            current_part = ""
            in_brackets = False
        else:
            current_part += char
    if current_part:
        parts.append(('text', current_part))
    return parts


@register.filter(name='extract_words_from_brackets')
def extract_words_from_brackets(text):
    """
    Извлекает слова, заключенные в квадратные скобки, и перемешивает их.
    """
    words = re.findall(r'\[(.*?)\]', text)  # Извлекаем слова
    random.shuffle(words)  # Перемешиваем слова
    return words

@register.filter(name='shuffle')
def shuffle(value):
    """
    Фильтр для перемешивания списка.
    """
    if isinstance(value, list):
        shuffled = value.copy()  # Создаем копию списка
        random.shuffle(shuffled)  # Перемешиваем копию
        return shuffled
    return value

@register.filter(name='order_by')
def order_by(queryset, order_field):
    """
    Фильтр для сортировки QuerySet по указанному полю.
    """
    return queryset.order_by(order_field)