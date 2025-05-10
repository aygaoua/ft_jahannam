from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, NoteSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Note
# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Profile
from .serializers import GameResultSerializer


class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)

class NoteDelete(generics.DestroyAPIView):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)

class CreatUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
def game_result(request):
    try:
        username = request.data.get('username')
        result = request.data.get('result')
        room_id = request.data.get('room_id')
        user = User.objects.get(username=username)
        profile, _ = Profile.objects.get_or_create(user=user)

        if result == "win":
            profile.wins += 1
        elif result == "lose":
            profile.losses += 1
        elif result == "draw":
            profile.draws += 1
        
        profile.save()
        return Response({"status": "success"}, status=status.HTTP_200_OK)
        # Add your logic here to save the game result
        # For example, update user statistics, save game history, etc.
        # return Response({'status': 'success'})
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
