from django.urls import path
from . import views

urlpatterns = [
    path('games/result/', views.game_result, name='game_result'),
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>", views.NoteDelete.as_view(), name="delete-note"),
]