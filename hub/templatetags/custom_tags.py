from django import template
from django.db.models import Q
from hub.models import course, lesson, section, Classroom

register = template.Library()

@register.inclusion_tag('home/course_list.html')
def course_list(user):
    """
    Шаблонный тег, который отображает кнопку "Создать курс" и список курсов.
    :param courses: QuerySet с курсами.
    """
    courses = course.objects.filter(user=user)
    classrooms = Classroom.objects.filter(
        Q(teachers=user) | Q(students=user)
    ).distinct()
    return {'courses': courses, 'user': user, 'classrooms': classrooms}

