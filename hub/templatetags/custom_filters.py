from django import template

register = template.Library()

@register.filter
def zip_lists(a, b):
    return list(zip(a, b))

@register.filter
def get_current_user(request):
    """Возвращает текущего пользователя (учителя) из запроса."""
    return request.user