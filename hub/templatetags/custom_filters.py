from django import template

register = template.Library()

@register.filter
def zip_lists(a, b):
    return list(zip(a, b))