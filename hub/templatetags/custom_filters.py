import json
import random

from django import template

register = template.Library()

@register.filter
def zip_lists(a, b):
    return list(zip(a, b))

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