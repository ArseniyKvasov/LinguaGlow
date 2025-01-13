from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('create-course/', views.create_course, name='create_course'),
    path('course/<uuid:course_id>/delete/', views.delete_course_view, name='delete_course'),
    path('course/<uuid:course_id>/lessons/', views.lesson_list_view, name='lesson_list'),
    path('course/<uuid:course_id>/lessons/add/', views.add_lesson_view, name='add_lesson'),
    path('lesson/<uuid:lesson_id>/', views.lesson_page_view, name='lesson_page'),
    path('section/<uuid:section_id>/', views.section_view, name='section'),
    path('lesson/<uuid:lesson_id>/delete/', views.delete_lesson_view, name='delete_lesson'),
    path('lesson/<uuid:lesson_id>/add_section/', views.add_section_view, name='add_section'),
    path('section/<uuid:section_id>/delete/', views.delete_section_view, name='delete_section'),
    path('edit_task/<uuid:task_id>/', views.edit_task, name='edit_task'),
    path('delete_task/<uuid:task_id>/', views.delete_task, name='delete_task'),
    path('update_task_order/', views.update_task_order, name='update_task_order'),

    path('section/<uuid:section_id>/add_word_list/', views.add_word_list, name='add_word_list'),

]