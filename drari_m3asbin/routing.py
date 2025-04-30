from django.urls import re_path # type: ignore
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/matchmaking/(?P<username>\w+)/$', consumers.MatchmakingConsumer.as_asgi()),
    re_path(r'ws/tictactoe/(?P<username>\w+)/$', consumers.TicTacToeConsumer.as_asgi()),    
]
