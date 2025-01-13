import uuid

from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_http_methods
from .forms import WordPairFormSet
from .models import course, lesson, section, wordList, task
from django.http import HttpResponseRedirect, JsonResponse, HttpResponse
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Max
from django.urls import reverse
import json


def home_view(request):
    username = request.user.username
    return render(request, 'home/home.html', {'username': username})


def lesson_list_view(request, course_id):
    selected_course = get_object_or_404(course, id=course_id)
    lessons = lesson.objects.filter(course=selected_course)

    # Передаём уроки и пользователя в контекст для рендера
    return render(request, 'home/lesson_list.html', {
        'lessons': lessons,
        'user': request.user,
        'course': selected_course,
    })

def lesson_page_view(request, lesson_id):
    lesson_obj = get_object_or_404(lesson, id=lesson_id)
    sections = lesson_obj.sections.all().order_by('order')
    return render(request, 'builder/lesson_page.html', {'lesson': lesson_obj, 'section_list': sections})

def section_view(request, section_id):
    selected_section = get_object_or_404(section, id=section_id)
    lesson_obj = get_object_or_404(lesson, id=selected_section.lesson.id)
    section_list = section.objects.filter(lesson=lesson_obj)
    wordListFormSet = WordPairFormSet()

    # Получаем все задания для текущей секции
    tasks = task.objects.filter(section=selected_section).order_by('order')

    return render(request, 'builder/section_page.html', {
        'selected_section': selected_section,
        'section_list': section_list,
        'lesson': lesson_obj,
        'wordListFormSet': wordListFormSet,
        'tasks': tasks,  # Передаем все задания в шаблон
    })






# Функции JS
def create_course(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description')
        student_level = request.POST.get('student_level')
        user = request.user

        course.objects.create(
            name=name,
            description=description,
            student_level=student_level,
            user=user
        )
        return redirect('home')

    return redirect('home')

def delete_course_view(request, course_id):
    course_to_delete = get_object_or_404(course, id=course_id)

    if request.method == "POST":
        course_to_delete.delete()

    return redirect('home')

def add_lesson_view(request, course_id):
    selected_course = get_object_or_404(course, id=course_id)

    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description')
        lexical_topics = request.POST.get('lexical_topics')
        grammar_topics = request.POST.get('grammar_topics')
        extra_topics = request.POST.get('extra_topics')

        lesson.objects.create(
            course=selected_course,
            name=name,
            description=description,
            lexical_topics=lexical_topics,
            grammar_topics=grammar_topics,
            extra_topics=extra_topics
        )
        return redirect('lesson_list', course_id=course_id)

    return redirect('lesson_list', course_id=course_id)

def delete_lesson_view(request, lesson_id):
    lesson_to_delete = get_object_or_404(lesson, id=lesson_id)

    course_id = lesson_to_delete.course.id

    if request.method == "POST":
        lesson_to_delete.delete()

    return HttpResponseRedirect(reverse('lesson_list', args=[course_id]))

def add_section_view(request, lesson_id):
    lesson_obj = get_object_or_404(lesson, id=lesson_id)

    if request.method == "POST":
        name = request.POST.get('name')
        topic = request.POST.get('topic')

        max_order = lesson_obj.sections.aggregate(Max('order'))['order__max']
        next_order = (max_order or 0) + 1  # Если max_order None (разделов нет), то начать с 1

        section.objects.create(
            lesson=lesson_obj,
            name=name,
            topic=topic,
            order=next_order
        )
        return redirect('lesson_page', lesson_id=lesson_id)

def delete_section_view(request, section_id):
    section_obj = get_object_or_404(section, id=section_id)
    lesson_id = section_obj.lesson.id  # Для редиректа обратно на страницу урока
    if request.method == "POST":
        section_obj.delete()

        sections = section.objects.filter(lesson_id=lesson_id).order_by('order')

        with transaction.atomic():  # Групповое обновление для производительности
            for index, section_obj in enumerate(sections, start=1):
                section.objects.filter(id=section_obj.id).update(order=index)

    return redirect('lesson_page', lesson_id=lesson_id)




# Функции разработки заданий
def selectKeywords():
    pass

def add_word_list(request, section_id):
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        section_instance = get_object_or_404(section, id=section_id)
        title = request.POST.get('title')
        task_id = request.POST.get('task_id')
        formset = WordPairFormSet(request.POST)
        print(task_id)

        if formset.is_valid():
            words = []
            for form in formset:
                english = form.cleaned_data.get('english')
                russian = form.cleaned_data.get('russian')
                if english and russian:
                    words.append({"english": english, "russian": russian})

            # Если word_list_id передан, обновляем существующий список слов
            if task_id:
                print('i edit')
                task_instance = task.objects.get(id=task_id, content_type__model='wordlist')
                word_list_id = task_instance.object_id
                word_list = get_object_or_404(wordList, id=word_list_id)
                word_list.title = title
                word_list.words = words
                word_list.save()
            else:
                # Иначе создаем новый список слов
                word_list = wordList.objects.create(
                    title=title,
                    words=words
                )
                # Создаем задание (task) для нового списка слов
                task_instance = task.objects.create(
                    section=section_instance,
                    content_object=word_list,
                    order=section_instance.tasks.count() + 1
                )

            # Возвращаем JSON-ответ
            return JsonResponse({
                'success': True,
                'task_id': str(task_instance.id),
                'title': word_list.title,
                'words': words,
            })

        return JsonResponse({'success': False, 'error': 'Некорректные данные'}, status=400)

    return JsonResponse({'success': False, 'error': 'Некорректный запрос'}, status=400)

def edit_task(request, task_id):
    task_instance = get_object_or_404(task, id=task_id)
    if task_instance.content_type.model == 'wordlist':
        word_list = task_instance.content_object
        return JsonResponse({
            'success': True,
            'title': word_list.title,
            'words': word_list.words,
        })
    return JsonResponse({'success': False, 'error': 'Некорректный тип задания'}, status=400)

def delete_task(request, task_id):
    if request.method == 'DELETE':
        task_instance = get_object_or_404(task, id=task_id)
        content_object = task_instance.content_object
        content_object.delete()  # Удаляем связанный объект (wordList, essay и т.д.)
        task_instance.delete()  # Удаляем задание
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Некорректный запрос'}, status=400)

def update_task_order(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            task_ids = data.get('task_ids', [])
            section_id = data.get('section_id')

            # Обновляем порядок заданий в базе данных
            for index, task_id in enumerate(task_ids):
                task_instance = task.objects.get(id=task_id, section_id=section_id)
                task_instance.order = index
                task_instance.save()

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
