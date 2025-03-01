import json
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

@register.filter
def shuffle_letters(value):
    if not value:
        return ""
    letters = list(value)
    random.shuffle(letters)
    return ''.join(letters)

@register.filter(name='split_blanks')
def split_blanks(value):
    """
    Разделяет текст на части с выделением пропусков в квадратных скобках
    Возвращает список кортежей: ('input', 'correct_answer') или ('text', 'content')
    """
    parts = []
    last_end = 0
    for match in re.finditer(r'\[(.*?)\]', value):
        start, end = match.start(), match.end()
        if last_end < start:
            parts.append(('text', value[last_end:start]))
        parts.append(('input', match.group(1)))
        last_end = end
    if last_end < len(value):
        parts.append(('text', value[last_end:]))
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