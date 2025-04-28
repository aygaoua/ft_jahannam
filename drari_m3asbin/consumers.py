import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer

waiting_players = []

class TicTacToeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope['url_route']['kwargs']['username']

        if not waiting_players:
            # No players waiting -> wait
            waiting_players.append(self)
            self.room_name = None
        else:
            # Match found
            opponent = waiting_players.pop(0)
            room_id = str(uuid.uuid4())
            self.room_name = opponent.room_name = room_id

            await opponent.accept()
            await self.accept()

            await opponent.channel_layer.group_add(room_id, opponent.channel_name)
            await self.channel_layer.group_add(room_id, self.channel_name)

            # Notify both players
            await opponent.send(text_data=json.dumps({"type": "start", "symbol": "X", "opponent": self.username}))
            await self.send(text_data=json.dumps({"type": "start", "symbol": "O", "opponent": opponent.username}))

    async def disconnect(self, close_code):
        if self in waiting_players:
            waiting_players.remove(self)
        if self.room_name:
            await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive(self, text_data):
        if self.room_name:
            await self.channel_layer.group_send(
                self.room_name,
                {
                    "type": "forward",
                    "message": text_data
                }
            )

    async def forward(self, event):
        await self.send(text_data=event['message'])
