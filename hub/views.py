from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_http_methods
from .ai_calls import text_generation, search_images
from .models import (course, lesson, section, wordList, task, matchUpTheWords, essay, note, image,
                     sortIntoColumns, makeASentence, unscramble, fillInTheBlanks, article, test, trueOrFalse,
                     labelImages, imageUsage, labelImageOrder, EmbeddedTask)
from django.http import HttpResponseRedirect, JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Max
from django.urls import reverse
import json
import re
from django.db.models import F
from django.contrib.contenttypes.models import ContentType


def home_view(request):
    username = request.user.username
    return render(request, 'home/home.html', {'username': username})

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

def delete_course(request, course_id):
    course_to_delete = get_object_or_404(course, id=course_id)

    if request.method == "POST":
        course_to_delete.delete()

    return redirect('home')

def lesson_list_view(request, course_id):
    selected_course = get_object_or_404(course, id=course_id)
    lessons = lesson.objects.filter(course=selected_course)

    # Передаём уроки и пользователя в контекст для рендера
    return render(request, 'home/lesson_list.html', {
        'lessons': lessons,
        'user': request.user,
        'course': selected_course,
    })

def add_lesson(request, course_id):
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

def lesson_page_view(request, lesson_id):
    lesson_obj = get_object_or_404(lesson, id=lesson_id)
    sections = lesson_obj.sections.all().order_by('order')
    return render(request, 'builder/lesson_page.html', {'lesson': lesson_obj, 'section_list': sections})

def delete_lesson(request, lesson_id):
    lesson_to_delete = get_object_or_404(lesson, id=lesson_id)

    course_id = lesson_to_delete.course.id

    if request.method == "POST":
        lesson_to_delete.delete()

    return HttpResponseRedirect(reverse('lesson_list', args=[course_id]))

def add_section(request, lesson_id):
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

def section_view(request, section_id):
    selected_section = get_object_or_404(section, id=section_id)
    lesson_obj = get_object_or_404(lesson, id=selected_section.lesson.id)
    section_list = section.objects.filter(lesson=lesson_obj)

    # Получаем все задания для текущей секции
    tasks = task.objects.filter(section=selected_section).order_by('order')

    return render(request, 'builder/section_page.html', {
        'selected_section': selected_section,
        'section_list': section_list,
        'lesson': lesson_obj,
        'tasks': tasks,
    })

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


def classroom_view(request, lesson_id):
    lesson_obj = get_object_or_404(lesson, id=lesson_id)
    sections = lesson_obj.sections.all().order_by('order')

    # Получаем все задачи для каждой секции
    tasks = task.objects.filter(section__in=sections).select_related('content_type').order_by('section', 'order')

    return render(request, 'classroom/classroom.html', {
        'lesson': lesson_obj,
        'section_list': sections,
        'tasks': tasks
    })


""" 
Функции работы с шаблонами
** Передача данных для редактирования
** Сохранение заданий
** Получение объектов базы данных
"""
def get_task_data(request, task_id):
    try:
        task_instance = get_object_or_404(task, id=task_id)
        if task_instance.content_type == ContentType.objects.get_for_model(wordList):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "words": task_instance.content_object.words,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(matchUpTheWords):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "pairs": task_instance.content_object.pairs,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(essay):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "conditions": task_instance.content_object.conditions,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(note):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "content": task_instance.content_object.content,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(image):
            data = {
                "id": task_id,
                "image_url": task_instance.content_object.image_url,
                "caption": task_instance.content_object.caption,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(sortIntoColumns):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "columns": task_instance.content_object.columns,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(makeASentence):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "sentences": task_instance.content_object.sentences,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(unscramble):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "words": task_instance.content_object.words,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(fillInTheBlanks):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "text": task_instance.content_object.text,
                "format": task_instance.content_object.display_format,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(article):
            data = {
                "id": task_id,
                "title": task_instance.content_object.title,
                "text": task_instance.content_object.content,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(test):
            data = {
                "id": task_id,
                "questions": task_instance.content_object.questions,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(trueOrFalse):
            data = {
                "id": task_id,
                "questions": task_instance.content_object.statements,
            }
        elif task_instance.content_type == ContentType.objects.get_for_model(labelImages):
            data = {
                "id": task_id,
                "image_urls": [image.image_url for image in task_instance.content_object.image_urls.all()],
                "labels": task_instance.content_object.labels,
            }
        else:
            return JsonResponse({"error": "Unknown task type"}, status=400)

        return JsonResponse(data)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["DELETE"])
def delete_task(request, task_id):
    try:
        task_instance = task.objects.get(id=task_id)
        task_order = task_instance.order
        if task_instance.content_object:
            task_instance.content_object.delete()
        task_instance.delete()
        # Обновляем порядок оставшихся заданий
        remaining_tasks = task.objects.filter(order__gt=task_order)
        for task_elem in remaining_tasks:
            task_elem.order -= 1
            task_elem.save()
        return JsonResponse({"success": True})
    except task.DoesNotExist:
        return JsonResponse({"error": "Задание не найдено"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def taskFactory(request, section_id):
    section_instance = get_object_or_404(section, id=section_id)
    if request.method == 'POST':
        data = json.loads(request.body)
        obj_id = data.get('obj_id')
        task_type = data.get('task_type')
        payloads = data.get('payloads', {})

        if not(task_type and payloads):
            return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)

        task_handlers = {
            'wordList': [wordListStore, ContentType.objects.get_for_model(wordList)],
            'matchUpTheWords': [matchUpTheWordsStore, ContentType.objects.get_for_model(matchUpTheWords)],
            'essay': [essayStore, ContentType.objects.get_for_model(essay)],
            'note': [noteStore, ContentType.objects.get_for_model(note)],
            'image': [imageStore, ContentType.objects.get_for_model(image)],
            'sortIntoColumns': [sortIntoColumnsStore, ContentType.objects.get_for_model(sortIntoColumns)],
            'makeASentence': [makeASentenceStore, ContentType.objects.get_for_model(makeASentence)],
            'unscramble': [unscrambleStore, ContentType.objects.get_for_model(unscramble)],
            'fillInTheBlanks': [fillInTheBlanksStore, ContentType.objects.get_for_model(fillInTheBlanks)],
            'article': [articleStore, ContentType.objects.get_for_model(article)],
            'test': [testStore, ContentType.objects.get_for_model(test)],
            'true_false': [trueFalseStore, ContentType.objects.get_for_model(trueOrFalse)],
            'label_images': [labelImagesStore, ContentType.objects.get_for_model(labelImages)],
            'interactions': [interactionsStore, ContentType.objects.get_for_model(EmbeddedTask)]
        }

        if obj_id:
            task_instance = get_object_or_404(task, id=obj_id)
            task_instance.content_object, content = task_handlers[task_type][0](payloads, task_instance)
        else:
            content_object, content = task_handlers[task_type][0](payloads)
            task_instance = task.objects.create(
                section=section_instance,
                content_object=content_object,
                content_type=task_handlers[task_type][1],
                order=task.objects.filter(section=section_instance).count() + 1
            )

        return JsonResponse({
            'success': True,
            'task': {
                'id': task_instance.id,
                'content': content,
            }
        })

def wordListStore(payloads, task_instance=None):
    if task_instance:
        word_list_instance = task_instance.content_object
        word_list_instance.title = payloads['title']
        word_list_instance.words = payloads['words']
        word_list_instance.save()
    else:
        word_list_instance = wordList.objects.create(
            title=payloads['title'],
            words=payloads['words']
        )

    if word_list_instance:
        return word_list_instance, {'title': word_list_instance.title, 'words': word_list_instance.words}
    else:
        return None

def matchUpTheWordsStore(payloads, task_instance=None):
    if task_instance:
        match_up_the_words_instance = task_instance.content_object
        match_up_the_words_instance.title = payloads['title']
        match_up_the_words_instance.pairs = payloads['pairs']
        match_up_the_words_instance.save()
    else:
        match_up_the_words_instance = matchUpTheWords.objects.create(
            title=payloads['title'],
            pairs=payloads['pairs']
        )

    if match_up_the_words_instance:
        return match_up_the_words_instance, {'title': match_up_the_words_instance.title, 'pairs': match_up_the_words_instance.pairs}
    else:
        return None

def essayStore(payloads, task_instance=None):
    if task_instance:
        essay_instance = task_instance.content_object
        essay_instance.title = payloads["title"]
        essay_instance.conditions = payloads["conditions"]
        essay_instance.save()
    else:
        essay_instance = essay.objects.create(
            title=payloads["title"],
            conditions=payloads["conditions"]
        )

    if essay_instance:
        return essay_instance, {'title': essay_instance.title, 'conditions': essay_instance.conditions}
    else:
        return None

def noteStore(payloads, task_instance=None):
    if task_instance:
        note_instance = task_instance.content_object
        note_instance.title = payloads["title"]
        note_instance.content = payloads["content"]
        note_instance.save()
    else:
        note_instance = note.objects.create(
            title=payloads["title"],
            content=payloads["content"]
        )

    if note_instance:
        return note_instance, {'title': note_instance.title, 'content': note_instance.content}
    else:
        return None

def imageStore(payloads, task_instance=None):
    if task_instance:
        image_instance = task_instance.content_object

        if len(payloads) > 0:
            image_instance.image_url = payloads[0]['imageUrl']
            image_instance.caption = payloads[0].get('caption', '')
            image_instance.save()
    else:
        if len(payloads) > 0:
            image_instance = image.objects.create(
                image_url=payloads[0]['imageUrl'],
                caption=payloads[0].get('caption', '')
            )
        else:
            raise ValueError("No image data provided")

    if image_instance:
        return image_instance, {
            'image_url': image_instance.image_url,
            'caption': image_instance.caption
        }
    else:
        return None

def sortIntoColumnsStore(payloads, task_instance=None):
    if task_instance:
        sort_into_columns_instance = task_instance.content_object
        sort_into_columns_instance.columns = payloads
        sort_into_columns_instance.save()
    else:
        sort_into_columns_instance = sortIntoColumns.objects.create(
            title="Распределите слова по колонкам",
            columns=payloads
        )

    if sort_into_columns_instance:
        return sort_into_columns_instance, {'title': sort_into_columns_instance.title, 'columns': sort_into_columns_instance.columns}
    else:
        return None

def makeASentenceStore(payloads, task_instance=None):
    if task_instance:
        make_a_sentence_instance = task_instance.content_object
        make_a_sentence_instance.sentences = payloads['sentences']
        make_a_sentence_instance.title = payloads['title']
        make_a_sentence_instance.save()
    else:
        make_a_sentence_instance = makeASentence.objects.create(
            title=payloads['title'],
            sentences=payloads['sentences']
        )

    if make_a_sentence_instance:
        return make_a_sentence_instance, {'title': make_a_sentence_instance.title, 'sentences': make_a_sentence_instance.sentences}
    else:
        return None

def unscrambleStore(payloads, task_instance=None):
    if task_instance:
        unscramble_instance = task_instance.content_object
        unscramble_instance.words = payloads['words']
        unscramble_instance.title = payloads['title']
        unscramble_instance.save()
    else:
        unscramble_instance = unscramble.objects.create(
            title=payloads['title'],
            words=payloads['words'],
        )

    if unscramble_instance:
        return unscramble_instance, {'title': unscramble_instance.title, 'words': unscramble_instance.words}
    else:
        return None

def fillInTheBlanksStore(payloads, task_instance=None):
    if task_instance:
        fill_in_the_blanks_instance = task_instance.content_object
        fill_in_the_blanks_instance.display_format = payloads['format']
        fill_in_the_blanks_instance.text = payloads['text']
        fill_in_the_blanks_instance.title = payloads['title']
        fill_in_the_blanks_instance.save()
    else:
        fill_in_the_blanks_instance = fillInTheBlanks.objects.create(
            title=payloads['title'],
            display_format=payloads['format'],
            text=payloads['text']
        )

    if fill_in_the_blanks_instance:
        return fill_in_the_blanks_instance, {'title': fill_in_the_blanks_instance.title, 'text': fill_in_the_blanks_instance.text, 'format': fill_in_the_blanks_instance.display_format}
    else:
        return None

def articleStore(payloads, task_instance=None):
    if task_instance:
        article_instance = task_instance.content_object
        article_instance.content = payloads['text']
        article_instance.title = payloads['title']
        article_instance.save()
    else:
        article_instance = article.objects.create(
            title=payloads['title'],
            content=payloads['text']
        )

    if article_instance:
        return article_instance, {'title': article_instance.title, 'text': article_instance.content}
    else:
        return None

def testStore(payloads, task_instance=None):
    if task_instance:
        test_instance = task_instance.content_object
        test_instance.questions = payloads['questions']
        test_instance.save()
    else:
        test_instance = test.objects.create(
            questions=payloads['questions']
        )

    if test_instance:
        return test_instance, {'questions': test_instance.questions}
    else:
        return None

def trueFalseStore(payloads, task_instance=None):
    if task_instance:
        true_false_instance = task_instance.content_object
        true_false_instance.statements = payloads['questions']
        true_false_instance.save()
    else:
        true_false_instance = trueOrFalse.objects.create(
            statements=payloads['questions']
        )

    if true_false_instance:
        return true_false_instance, {'questions': true_false_instance.statements}
    else:
        return None

def labelImagesStore(payloads, task_instance=None):
    if not payloads:
        return None, {'error': 'Нет изображений или меток'}

    # Если task_instance передан, используем существующее задание
    if task_instance:
        label_images_instance = task_instance.content_object
    else:
        label_images_instance = None

    labels_payloads = []
    image_usage_objects = []

    # Сначала создаем все объекты изображений
    for image_payload in payloads:
        labels_payloads.append(image_payload['label'])

        # Пытаемся найти изображение по URL или создать новое
        try:
            image_usage = imageUsage.objects.select_for_update().get(image_url=image_payload['imageUrl'])
            image_usage.usage_count = F('usage_count') + 1
            image_usage.save()
        except ObjectDoesNotExist:
            image_usage = imageUsage.objects.create(
                image_url=image_payload['imageUrl'],
                usage_count=1
            )
        image_usage_objects.append(image_usage)

    # Создаем или обновляем задание Label Images
    if label_images_instance:
        # Обнуляем существующие данные (labels и image_urls)
        label_images_instance.labels = []
        label_images_instance.image_urls.clear()
        label_images_instance.save()

    else:
        # Если задания нет, создаем новое
        label_images_instance = labelImages.objects.create(labels=labels_payloads)

    # Сохраняем новые данные с правильным порядком
    with transaction.atomic():
        # Обновляем метки
        label_images_instance.labels = labels_payloads
        label_images_instance.save()

        # Добавляем изображения в Many-to-Many с явным указанием порядка
        for order, image_usage in enumerate(image_usage_objects):
            labelImageOrder.objects.create(
                label_image=label_images_instance,
                image_usage=image_usage,
                order=order  # Указываем порядок
            )

    # Возвращаем результат
    return label_images_instance, {
        'image_urls': [img.image_url for img in label_images_instance.image_urls.all()],
        'labels': label_images_instance.labels
    }

def interactionsStore(payloads, task_instance=None):
    if task_instance:
        interaction_instance = task_instance.content_object
        interaction_instance.title = payloads["title"]
        interaction_instance.embed_code = payloads["embed"]
        interaction_instance.save()
    else:
        interaction_instance = EmbeddedTask.objects.create(
            title=payloads["title"],
            embed_code=payloads["embed"]
        )

    if interaction_instance:
        return interaction_instance, {'title': interaction_instance.title, 'embed': interaction_instance.embed_code}
    else:
        return None


""" 
Функции генерации AI
** Распределение функций
** Оптимизация запросов
** Передача пользователю
"""
def jsCall(request):
    # Проверяем, что запрос POST и содержит данные в JSON-формате
    if request.method != "POST":
        return JsonResponse({"error": "Только POST-запросы разрешены."}, status=405)

    try:
        data = json.loads(request.body)  # Загружаем JSON
        function_name = data.get('function_name')
        payloads = data.get('payloads')

        if not function_name or not payloads:
            return JsonResponse({"error": "Отсутствуют необходимые параметры."}, status=400)

        result = aiFactory(request, function_name, payloads)
        return JsonResponse({"result": result})

    except json.JSONDecodeError:
        return JsonResponse({"error": "Некорректный JSON."}, status=400)

def aiFactory(request, function_name, payloads):
    if function_name == 'wordList':
        res = wordListAI(request, payloads)
    elif function_name == "essay":
        res = essayAI(request, payloads)
    elif function_name == "note":
        res = noteAI(request, payloads)
    elif function_name == "sortIntoColumns":
        res = sortIntoColumnsAI(request, payloads)
    elif function_name == "makeASentence":
        res = makeASentenceAI(request, payloads)
    elif function_name == "unscramble":
        res = unscrambleAI(request, payloads)
    elif function_name == "fillInTheBlanks":
        res = fillInTheBlanksAI(request, payloads)
    elif function_name == "article":
        res = articleAI(request, payloads)
    elif function_name == "test":
        res = testAI(request, payloads)
    elif function_name == "trueFalse":
        res = trueFalseAI(request, payloads)
    elif function_name == "labelImages":
        res = labelImagesAI(request, payloads)
    else:
        return "Неизвестный тип задания."

    print(res)
    return res

def wordListAI(request, payloads):
    topic = payloads['topic']
    requirements = payloads['requirements']
    basics = payloads['basics']

    query = f"Generate a word list for topic {topic}."
    if payloads['quantity']:
        words_quantity = payloads['quantity']
        query += f"It should have {words_quantity} words or phrases."
        size_limit = int(words_quantity) * 10 + 100
    else:
        size_limit = 300
    if requirements:
        query += f"It should have the following user's requirements: {requirements}."
    if basics:
        query += f"Generate it based on my previously created content: {basics}."

    query += "Write in JSON: [{'word': 'read', 'translation': 'читать'}, ...]"

    return text_generation(request, query, size_limit)

def essayAI(request, payloads):
    size = payloads['size']
    requirements = payloads['requirements']
    basics = payloads['basics']

    query = "Generate a creative topic for the essay."
    if size:
        query += f"The essay will consist of about {size} words."
    if requirements:
        query += f"It should have the following user's requirements: {requirements}."
    if basics:
        query += f"Generate it based on my previously created content: {basics}."

    query += "Write in JSON {'instructions': '...', 'conditions': {'...': score(int), ...} }"
    return text_generation(request, query, 0)

def noteAI(request, payloads):
    topic = payloads.get('topic', '')
    requirements = payloads.get('requirements', '')
    basics = payloads.get('basics', '')
    is_short_note = payloads.get('is_short_note', False)

    query = f"Generate a note based on the following topic: {topic}."
    if requirements:
        query += f" It should include the following user's requirements: {requirements}."
    if basics:
        query += f"Generate it based on my previously created content: {basics}."
    if is_short_note:
        query += " The note should be concise and brief."
    query += "Write in JSON {'title': '...', 'content': '...'}"
    return text_generation(request, query, 0)

def articleAI(request, payloads):
    title = payloads.get('title', '')
    requirements = payloads.get('requirements', '')
    length = payloads.get('length', 200)
    basics = payloads.get('basics', '')

    query = f"Generate an article in English: {title}."
    if requirements:
        query += f"It should include the following user's requirements: {requirements}."
    if length:
        query += f"The article should be approximately {length} words long."
    if basics:
        query += f"Generate it based on my previously created content: {basics}."
    query += "Write in JSON {'title': '...', 'content': '...'}. You can separate paragraphs and use bold, italic or underline."
    return text_generation(request, query, 0)

def testAI(request, payloads):
    topic = payloads.get('topic', '')
    requirements = payloads.get('requirements', '')
    question_count = payloads.get('question_count', 5)
    basics = payloads.get('selectedTasksData', '')

    query = f"Generate english test comprehension questions with multiple choice answers on the topic of {topic}."
    if requirements:
        query += f" It should include the following user's requirements: {requirements}."
    if question_count:
        query += f" The test should contain {question_count} questions."
    if basics:
        query += f" Generate it based on my previously created content: {basics}."
    query += "Write in JSON: \
    { \
        'question 1': { \
            'question_title': '...', \
            'options': {'A': '...', 'B': '...', 'C': '...'} \
            'correct_option': 'A' or 'B' or 'C' ... \
        }, ... \
    }"

    # Преобразуем результат в нужный формат
    result = text_generation(request, query, 0)
    parsed_result = json.loads(result)
    formatted_questions = []

    for i in parsed_result.keys():
        question_block = parsed_result[i]
        formatted_questions.append({
            'question_title': question_block['question_title'],
            'options': question_block['options'],
            'correct_option': question_block['correct_option']
        })

    return json.dumps(formatted_questions, ensure_ascii=False)

def fillInTheBlanksAI(request, payloads):
    topic = payloads.get('topic', '')
    basics = payloads.get('basics', [])
    sentence_count = payloads.get('sentence_count', 5)

    query = f"Generate {sentence_count} sentences with blanks to be filled. In English. Only one blank for each sentence."
    if topic:
        query += f"The topic of the sentences is {topic}. "
    if basics:
        query += f"Generate it based on my previously created content: {basics}."
    query += "Write in JSON: [{'sentence': '...' (should include _ as a missed word), 'gap': '...' } , ...]"
    result = text_generation(request, query, 0)

    # Преобразуем результат в нужный формат
    parsed_result = json.loads(result)
    raw_sentences = []

    for sentence_data in parsed_result:
        raw_sentence = {
            'sentence': sentence_data.get('sentence'),
            'gap': sentence_data.get('gap')
        }
        raw_sentences.append(raw_sentence)
    print(raw_sentences)
    def replace_gaps(sentence, gap):
        # Используем регулярное выражение для замены троеточий и подчеркиваний на слова из списка gaps
        while '__' in sentence:
            sentence = sentence.replace('__', '_')
        sentence = re.sub(r'(\.\.\.|_)', f'[{gap}]', sentence, count=1)

        return sentence

    # Создание списка formatted_sentences
    formatted_sentences = []
    for raw_sentence in raw_sentences:
        formatted_sentence = replace_gaps(raw_sentence['sentence'], raw_sentence['gap'])
        formatted_sentences.append(formatted_sentence)
    print(formatted_sentences)

    return json.dumps(formatted_sentences, ensure_ascii=False)