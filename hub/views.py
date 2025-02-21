from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_http_methods
from .ai_calls import text_generation
from .models import course, section, lesson, BaseTask, WordList, Image, MatchUpTheWords, Essay, Note, SortIntoColumns, MakeASentence, Unscramble, FillInTheBlanks, Dialogue, Article, Audio, Test, TrueOrFalse, LabelImages, ImageUsage, LabelImageOrder, EmbeddedTask, Classroom, ClassroomInvitation, UserAnswer
from django.http import HttpResponseRedirect, JsonResponse
from django.db import transaction
from django.db.models import Max
from .forms import ClassroomForm
from django.db import models
from django.urls import reverse
import json
from django.conf import settings
from datetime import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponseForbidden
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth.decorators import login_required
import re
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
    if not (request.user == selected_course.user):
        return HttpResponseForbidden("You do not have access to this lesson.")

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
    course_obj = get_object_or_404(course, id=lesson_obj.course.id)

    if not (request.user == course_obj.user):
        return HttpResponseForbidden("You do not have access to this lesson.")

    sections = lesson_obj.sections.all().order_by('order')
    classrooms = Classroom.objects.filter(Q(teachers=request.user) | Q(students=request.user)).distinct()

    return render(request, 'builder/lesson_page.html', {
        'lesson': lesson_obj,
        'section_list': sections,
        'classrooms': classrooms
    })

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
    course_obj = get_object_or_404(course, id=lesson_obj.course.id)

    if not (request.user == course_obj.user):
        return HttpResponseForbidden("You do not have access to this section.")

    section_list = section.objects.filter(lesson=lesson_obj).order_by('order')
    classrooms = Classroom.objects.filter(Q(teachers=request.user) | Q(students=request.user)).distinct()
    tasks = BaseTask.objects.filter(section=selected_section).order_by('order')

    return render(request, 'builder/section_page.html', {
        'tasks': tasks,
        'lesson': lesson_obj,
        'section_list': section_list,
        'selected_section': selected_section,
        'classrooms': classrooms,
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



""" 
Функции работы с шаблонами
** Передача данных для редактирования
** Сохранение заданий
** Получение объектов базы данных
"""
def get_task_data(request, task_id):
    try:
        task_instance = get_object_or_404(BaseTask, id=task_id)
        content_type = task_instance.content_type
        content_object = task_instance.content_object

        if content_type.model_class() == WordList:
            data = {
                "id": task_id,
                "title": content_object.title,
                "words": content_object.words,
            }
        elif content_type.model_class() == MatchUpTheWords:
            data = {
                "id": task_id,
                "title": content_object.title,
                "pairs": content_object.pairs,
            }
        elif content_type.model_class() == Essay:
            data = {
                "id": task_id,
                "title": content_object.title,
                "conditions": content_object.conditions,
            }
        elif content_type.model_class() == Note:
            data = {
                "id": task_id,
                "title": content_object.title,
                "content": content_object.content,
            }
        elif content_type.model_class() == Image:
            data = {
                "id": task_id,
                "image_url": content_object.image_url,
                "caption": content_object.caption,
            }
        elif content_type.model_class() == SortIntoColumns:
            data = {
                "id": task_id,
                "title": content_object.title,
                "columns": content_object.columns,
            }
        elif content_type.model_class() == MakeASentence:
            data = {
                "id": task_id,
                "title": content_object.title,
                "sentences": content_object.sentences,
            }
        elif content_type.model_class() == Unscramble:
            data = {
                "id": task_id,
                "title": content_object.title,
                "words": content_object.words,
            }
        elif content_type.model_class() == FillInTheBlanks:
            data = {
                "id": task_id,
                "title": content_object.title,
                "text": content_object.text,
                "display_format": content_object.display_format,
            }
        elif content_type.model_class() == Dialogue:
            data = {
                "id": task_id,
                "lines": content_object.lines,
            }
        elif content_type.model_class() == Article:
            data = {
                "id": task_id,
                "title": content_object.title,
                "content": content_object.content,
            }
        elif content_type.model_class() == Audio:
            data = {
                "id": task_id,
                "audio_url": content_object.audio_url,
                "transcript": content_object.transcript,
            }
        elif content_type.model_class() == Test:
            data = {
                "id": task_id,
                "questions": content_object.questions,
            }
        elif content_type.model_class() == TrueOrFalse:
            data = {
                "id": task_id,
                "statements": content_object.statements,
            }
        elif content_type.model_class() == LabelImages:
            data = {
                "id": task_id,
                "image_urls": [image.image_url for image in content_object.image_urls.all()],
                "labels": content_object.labels,
            }
        elif content_type.model_class() == EmbeddedTask:
            data = {
                "id": task_id,
                "title": content_object.title,
                "embed_code": content_object.embed_code,
            }
        else:
            return JsonResponse({"error": "Unknown task type"}, status=400)

        return JsonResponse(data)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@require_http_methods(["DELETE"])
def delete_task(request, task_id):
    try:
        task_instance = BaseTask.objects.get(id=task_id)
        task_order = task_instance.order
        if task_instance.content_object:
            task_instance.content_object.delete()
        task_instance.delete()

        # Обновляем порядок оставшихся заданий
        remaining_tasks = BaseTask.objects.filter(section=task_instance.section, order__gt=task_order)
        for task_elem in remaining_tasks:
            task_elem.order -= 1
            task_elem.save()

        return JsonResponse({"success": True})
    except BaseTask.DoesNotExist:
        return JsonResponse({"error": "Задание не найдено"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def taskFactory(request, section_id):
    section_instance = get_object_or_404(section, id=section_id)

    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid method'}, status=405)

    try:
        data = json.loads(request.body)
        obj_id = data.get('obj_id')
        task_type = data.get('task_type')
        payloads = data.get('payloads', {})
        print(payloads)

        if not task_type or not payloads:
            return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)

        # Словарь для связи типа задачи с моделью
        task_handlers = {
            'wordList': WordList,
            'matchUpTheWords': MatchUpTheWords,
            'essay': Essay,
            'note': Note,
            'image': Image,
            'sortIntoColumns': SortIntoColumns,
            'makeASentence': MakeASentence,
            'unscramble': Unscramble,
            'fillInTheBlanks': FillInTheBlanks,
            'dialogue': Dialogue,
            'article': Article,
            'audio': Audio,
            'test': Test,
            'true_false': TrueOrFalse,
            'label_images': LabelImages,
            'embedded_task': EmbeddedTask
        }

        # Получаем класс модели для задачи
        model_class = task_handlers.get(task_type)
        if not model_class:
            return JsonResponse({'success': False, 'error': 'Invalid task type'}, status=400)

        from django.db import transaction

        if task_type == 'label_images':
            # Обработка задания "Подписать картинки"
            print(payloads)
            labels = [img['label'] for img in payloads]
            print(labels)

            try:
                with transaction.atomic():  # Начинаем транзакцию
                    if obj_id:
                        # Обновление существующего задания
                        task_instance = get_object_or_404(BaseTask, id=obj_id)
                        content_object = task_instance.content_object

                        if not isinstance(content_object, LabelImages):
                            return JsonResponse({'success': False, 'error': 'Task type mismatch'}, status=400)

                        # Обновляем метки
                        content_object.labels = labels
                        content_object.save()

                        # Удаляем старые связи с изображениями
                        content_object.image_urls.clear()

                        # Создаем новые связи с изображениями
                        for index, img_data in enumerate(payloads):
                            image_url = img_data['imageUrl']
                            image_usage, _ = ImageUsage.objects.get_or_create(image_url=image_url)
                            LabelImageOrder.objects.create(
                                label_image=content_object,
                                image_usage=image_usage,
                                image_order=index + 1
                            )

                        content = {
                            'id': task_instance.id,
                            'content': {'labels': labels, 'images': payloads}
                        }
                    else:
                        # Создание нового задания
                        content_object = LabelImages.objects.create(labels=labels)

                        # Создаем связи с изображениями
                        for index, img_data in enumerate(payloads):
                            image_url = img_data['imageUrl']
                            image_usage, _ = ImageUsage.objects.get_or_create(image_url=image_url)
                            LabelImageOrder.objects.create(
                                label_image=content_object,
                                image_usage=image_usage,
                                image_order=index + 1
                            )

                        # Определяем порядок нового задания
                        current_order = \
                        BaseTask.objects.filter(section=section_instance).aggregate(models.Max('order'))['order__max']
                        new_order = 1 if current_order is None else current_order + 1

                        # Создаем BaseTask
                        task_instance = BaseTask.objects.create(
                            section=section_instance,
                            content_object=content_object,
                            content_type=ContentType.objects.get_for_model(LabelImages),
                            order=new_order
                        )

                        content = {
                            'id': task_instance.id,
                            'content': {'labels': labels, 'images': payloads}
                        }

                    return JsonResponse({
                        'success': True,
                        'task': content
                    })

            except Exception as e:
                # В случае ошибки транзакция откатывается автоматически
                return JsonResponse({'success': False, 'error': str(e)}, status=500)

        # Обработка других типов заданий
        if obj_id:
            # Обновление существующего задания
            task_instance = get_object_or_404(BaseTask, id=obj_id)
            content_object = task_instance.content_object

            if not isinstance(content_object, model_class):
                return JsonResponse({'success': False, 'error': 'Task type mismatch'}, status=400)

            for key, value in payloads.items():
                setattr(content_object, key, value)
            content_object.save()

            content = {
                'id': task_instance.id,
                'content': {**payloads}
            }
        else:
            # Создание нового задания
            content_object = model_class.objects.create(**payloads)
            current_order = BaseTask.objects.filter(section=section_instance).aggregate(models.Max('order'))['order__max']
            new_order = 1 if current_order is None else current_order + 1
            task_instance = BaseTask.objects.create(
                section=section_instance,
                content_object=content_object,
                content_type=ContentType.objects.get_for_model(model_class),
                order=new_order
            )

            content = {
                'id': task_instance.id,
                'content': {**payloads}
            }

        return JsonResponse({
            'success': True,
            'task': content
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def create_or_update_task(request, section_id):
    section_instance = get_object_or_404(section, id=section_id)
    if request.method == 'POST':
        data = json.loads(request.body)
        obj_id = data.get('obj_id')
        task_type = data.get('task_type')
        payloads = data.get('payloads', {})

        if not (task_type and payloads):
            return JsonResponse({'success': False, 'error': 'Invalid data'}, status=400)

        task_handlers = {
            'wordList': WordList,
            'matchUpTheWords': MatchUpTheWords,
            'essay': Essay,
            'note': Note,
            'image': Image,
            'sortIntoColumns': SortIntoColumns,
            'makeASentence': MakeASentence,
            'unscramble': Unscramble,
            'fillInTheBlanks': FillInTheBlanks,
            'dialogue': Dialogue,
            'article': Article,
            'audio': Audio,
            'test': Test,
            'true_false': TrueOrFalse,
            'label_images': LabelImages,
            'embedded_task': EmbeddedTask
        }

        model_class = task_handlers.get(task_type)
        if not model_class:
            return JsonResponse({'success': False, 'error': 'Invalid task type'}, status=400)

        if obj_id:
            # Обновление существующего задания
            task_instance = get_object_or_404(BaseTask, id=obj_id)
            content_object = task_instance.content_object

            # Обновляем content_object
            if isinstance(content_object, model_class):
                for key, value in payloads.items():
                    setattr(content_object, key, value)
                content_object.save()
            else:
                return JsonResponse({'success': False, 'error': 'Task type mismatch'}, status=400)

            content = {
                'id': task_instance.id,
                'content': {**payloads}  # Возвращаем обновленные данные
            }
        else:
            # Создание нового задания
            content_object = model_class.objects.create(**payloads)

            # Определяем порядок нового задания
            current_order = BaseTask.objects.filter(section=section_instance).aggregate(models.Max('order'))['order__max']
            new_order = 1 if current_order is None else current_order + 1

            # Создаем BaseTask
            task_instance = BaseTask.objects.create(
                section=section_instance,
                content_object=content_object,
                content_type=ContentType.objects.get_for_model(model_class),
                order=new_order
            )

            content = {
                'id': task_instance.id,
                'content': {**payloads}  # Возвращаем данные content_object
            }

        return JsonResponse({
            'success': True,
            'task': content
        })

    return JsonResponse({'success': False, 'error': 'Invalid method'}, status=405)



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


def choose_classroom(request, lesson_id):
    """Страница выбора класса с AJAX-поддержкой."""
    lesson_instance = get_object_or_404(lesson, id=lesson_id)

    if request.method == "POST":
        selected_class_id = request.POST.get("classroom_id")
        if selected_class_id:
            classroom = get_object_or_404(Classroom, id=selected_class_id)
            classroom.lesson = lesson_instance
            classroom.save()
            return JsonResponse({"success": True, "redirect_url": reverse("classroom_view", args=[classroom.id])})
        return JsonResponse({"success": False})

def create_classroom(request, lesson_id):
    """Создание нового класса с AJAX-поддержкой."""
    lesson_instance = get_object_or_404(lesson, id=lesson_id)

    if request.method == "POST":
        form = ClassroomForm(request.POST)
        if form.is_valid():
            new_classroom = form.save(commit=False)
            new_classroom.lesson = lesson_instance
            new_classroom.save()
            new_classroom.teachers.add(request.user)

        return JsonResponse({"success": True, "redirect_url": reverse("classroom_view", args=[new_classroom.id])})

def classroom_view(request, classroom_id):
    classroom_obj = Classroom.objects.for_user(request.user).filter(id=classroom_id).first()

    if not classroom_obj:
        return HttpResponseForbidden("У вас нет доступа к этому классу.")

    lesson_obj = classroom_obj.lesson
    sections = lesson_obj.sections.all().order_by('order')
    students = classroom_obj.students.all()  # Получаем всех учеников класса
    teachers = classroom_obj.teachers.all()

    # Получаем все задачи и группируем их по секциям
    tasks = BaseTask.objects.filter(section__in=sections).select_related('content_type').order_by('section', 'order')

    section_tasks = []
    for section in sections:
        section_tasks.append({
            'id': section.id,
            'section_title': section.name,
            'tasks': [task for task in tasks if task.section_id == section.id]
        })

    return render(request, 'classroom/classroom.html', {
        'classroom': classroom_obj,
        'lesson': lesson_obj,
        'section_list': sections,
        'section_tasks': section_tasks,
        'students': students,
        'teachers': teachers,
    })



@login_required
def accept_invitation(request, code):
    """Обработка перехода по ссылке приглашения."""
    invitation = get_object_or_404(ClassroomInvitation, code=code)

    # Проверяем, не истекло ли приглашение
    if timezone.now() > invitation.expires_at:
        return redirect("invitation_expired")  # Редирект на страницу с сообщением об истечении срока

    classroom = invitation.classroom

    # Если пользователь авторизован, добавляем его как постоянного ученика
    if request.user.is_authenticated:
        classroom.students.add(request.user)
        return redirect("classroom_view", classroom_id=classroom.id)

    # Если пользователь не авторизован, добавляем его как временного ученика
    else:
        # Создаем временного пользователя (если требуется)
        # Например, можно создать анонимного пользователя или перенаправить на страницу регистрации
        return redirect("register")  # Редирект на страницу регистрации

def create_invitation(request, classroom_id):
    """Создает приглашение и возвращает короткую ссылку."""
    classroom = get_object_or_404(Classroom, id=classroom_id)
    invitation = classroom.create_invitation()

    # Формируем короткую ссылку
    invitation_url = request.build_absolute_uri(
        reverse("accept_invitation", args=[invitation.code])
    )

    return JsonResponse({"invitation_url": invitation_url})

@csrf_exempt
def save_user_answer_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            task_id = data.get('task_id')
            classroom_id = data.get('classroom_id')
            payloads = data.get('payloads')
            request_type = data.get('request_type', None)

            if request_type:
                with transaction.atomic():
                    process_multiple_users_answers(task_id, classroom_id, request_type)
                return JsonResponse({'status': 'success'})
            elif task_id:
                with transaction.atomic():
                    process_user_answer(task_id, classroom_id, request.user, payloads)
                return JsonResponse({'status': 'success'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Missing required fields'}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

def process_user_answer(task_id, classroom_id, user, payloads):
    task_instance = BaseTask.objects.get(id=task_id)
    classroom_instance = Classroom.objects.get(id=classroom_id)

    content_type = ContentType.objects.get_for_model(task_instance.content_object)
    user_answer, created = UserAnswer.objects.get_or_create(
        task=task_instance,
        classroom=classroom_instance,
        user=user,
        defaults={'answer_data': [], 'updated_at': timezone.now(), 'score': 0}
    )

    if content_type.model_class() == MatchUpTheWords:
        update_match_up_the_words_answer(user_answer, payloads)

def process_multiple_users_answers(task_id, classroom_id, request_type):
    task_instance = BaseTask.objects.get(id=task_id)
    classroom_instance = Classroom.objects.get(id=classroom_id)
    classroom_users = list(classroom_instance.teachers.all()) + list(classroom_instance.students.all())
    if request_type == "reset":
        for user in classroom_users:
            user_answer = UserAnswer.objects.filter(task=task_instance, classroom=classroom_instance, user=user).first()
            if user_answer:
                user_answer.answer_data = []
                user_answer.score = 0
                user_answer.save()


def update_match_up_the_words_answer(user_answer, payloads):
    word = payloads['word']
    translation = payloads['translation']
    score = payloads['score']
    print(word, translation, score)
    answer_data = user_answer.answer_data

    word_entry = next((item for item in answer_data if item['word'] == word), None)
    score_entry = user_answer.score if user_answer.score else None

    if word_entry:
        word_entry['translations'].append(translation)
    else:
        answer_data.append({'word': word, 'translations': [translation]})

    if score_entry:
        user_answer.score += score
    else:
        user_answer.score = score

    user_answer.answer_data = answer_data
    print('saving result', user_answer.answer_data, user_answer.score)
    user_answer.updated_at = timezone.now()
    user_answer.save()


@login_required
def get_solved_tasks(request):
    task_id = request.GET.get('task_id')
    classroom_id = request.GET.get('classroom_id')
    type = request.GET.get('type')

    try:
        classroom_instance = Classroom.objects.get(id=classroom_id)
        teachers = classroom_instance.teachers.all()
        user = request.user

        if type == 'match-words':
            # Списки для хранения ответов
            student_pairs = []  # Ответы ученика (с дубликатами)
            teacher_pairs = []  # Ответы учителей (с дубликатами)

            # Получаем ответы ученика
            user_answers = UserAnswer.objects.filter(
                task_id=task_id,
                classroom_id=classroom_id,
                user=user
            ).first()

            if user_answers:
                for pair in user_answers.answer_data:
                    if 'word' in pair and 'translations' in pair:
                        for translation in pair['translations']:
                            student_pairs.append((pair['word'], translation))

            # Получаем ответы учителей
            for teacher in teachers:
                teacher_answers = UserAnswer.objects.filter(
                    task_id=task_id,
                    classroom_id=classroom_id,
                    user=teacher
                ).first()

                if teacher_answers:
                    for pair in teacher_answers.answer_data:
                        if 'word' in pair and 'translations' in pair:
                            for translation in pair['translations']:
                                teacher_pairs.append((pair['word'], translation))

            # Преобразуем списки в множества для работы с пересечением/разностью
            student_set = set(student_pairs)
            teacher_set = set(teacher_pairs)

            # Pairs = (student_pairs ∪ teacher_pairs) без дубликатов
            pairs = list(student_set | teacher_set)

            # Возвращаем данные в JSON
            return JsonResponse({
                'status': 'success',
                'type': 'match-words',
                'student_pairs': student_pairs,  # Все ответы ученика
                'teacher_pairs': teacher_pairs,  # Все ответы учителей
                'pairs': pairs,  # Разность объединенного и пересечения
                'score': user_answers.score if user_answers else 0,
            })

    except Classroom.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Classroom not found'}, status=404)

    except UserAnswer.DoesNotExist:
        return JsonResponse({
            'status': 'not_found',
            'student_pairs': [],
            'teacher_pairs': [],
            'pairs': []
        })
