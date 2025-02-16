from django.urls import path
from . import views, ai_calls

urlpatterns = [
    path('', views.home_view, name='home'),
    path('create-course/', views.create_course, name='create_course'),
    path('course/<uuid:course_id>/delete/', views.delete_course, name='delete_course'),
    path('course/<uuid:course_id>/lessons/', views.lesson_list_view, name='lesson_list'),
    path('course/<uuid:course_id>/lessons/add/', views.add_lesson, name='add_lesson'),
    path('lesson/<uuid:lesson_id>/', views.lesson_page_view, name='lesson_page'),
    path('section/<uuid:section_id>/', views.section_view, name='section'),
    path('lesson/<uuid:lesson_id>/delete/', views.delete_lesson, name='delete_lesson'),
    path('lesson/<uuid:lesson_id>/add_section/', views.add_section, name='add_section'),
    path('section/<uuid:section_id>/delete/', views.delete_section_view, name='delete_section'),
    path('section/<uuid:section_id>/add_task/', views.taskFactory, name='add_task'),
    path('api/tasks/<uuid:task_id>/', views.get_task_data, name='get_task_data'),
    path('api/tasks/<uuid:task_id>/delete/', views.delete_task, name='delete_task'),

    path('classroom/<uuid:classroom_id>/', views.classroom_view, name='classroom_view'),
    path("choose-classroom/<uuid:lesson_id>/", views.choose_classroom, name="choose_classroom"),
    path("create-classroom/<uuid:lesson_id>/", views.create_classroom, name="create_classroom"),

    path('search-images/', ai_calls.search_images, name='search_images'),
    path('generate-task/', views.jsCall, name='task_generation'),
]