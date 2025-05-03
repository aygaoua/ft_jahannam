
from django.urls import re_path # type: ignore
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/matchmaking/(?P<username>\w+)/$', consumers.MatchmakingConsumer.as_asgi()),
    # Use a more permissive regex for room names to handle underscores and other characters
    re_path(r'ws/tictactoe/(?P<room_name>[\w_-]+)/$', consumers.TicTacToeConsumer.as_asgi()),
]