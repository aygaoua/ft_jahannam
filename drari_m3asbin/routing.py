from django.urls import re_path
from drari_m3asbin.consumers import MatchmakingConsumer, TicTacToeConsumer

websocket_urlpatterns = [
    re_path(r'ws/matchmaking/(?P<username>[^/]+)/$', MatchmakingConsumer.as_asgi()),
    re_path(r'ws/tictactoe/(?P<room_name>[^/]+)/$', TicTacToeConsumer.as_asgi()),
]