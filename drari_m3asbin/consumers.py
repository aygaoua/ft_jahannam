from channels.generic.websocket import AsyncWebsocketConsumer
import json

waiting_players = []

class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope['url_route']['kwargs']['username']
        await self.accept()

        if waiting_players:
            opponent = waiting_players.pop(0)
            room = f"room_{self.username}_{opponent}"

            await self.channel_layer.group_send(
                f"match_{opponent}",
                {"type": "match.found", "room": room}
            )
            await self.send(text_data=json.dumps({
                "type": "match_found",
                "room": room
            }))
        else:
            waiting_players.append(self.username)
            await self.channel_layer.group_add(f"match_{self.username}", self.channel_name)

    async def disconnect(self, _):
        if self.username in waiting_players:
            waiting_players.remove(self.username)
        await self.channel_layer.group_discard(f"match_{self.username}", self.channel_name)

    async def match_found(self, event):
        await self.send(text_data=json.dumps({
            "type": "match_found",
            "room": event["room"]
        }))

class TicTacToeConsumer(AsyncWebsocketConsumer):
    rooms = {}
    game_states = {}
    player_symbols = {}

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"tictactoe_{self.room_name}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        players = self.rooms.setdefault(self.room_name, [])
        if len(players) < 2:
            players.append(self.channel_name)

        if len(players) == 2:
            self.game_states[self.room_name] = {
                'board': [''] * 9,
                'currentTurn': 'X',
                'winner': None
            }

            for i, channel in enumerate(players):
                symbol = 'X' if i == 0 else 'O'
                self.player_symbols[channel] = symbol
                await self.channel_layer.send(channel, {
                    'type': 'send_start',
                    'symbol': symbol,
                    'opponent': 'Player 2' if i == 0 else 'Player 1'
                })

    async def disconnect(self, _):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if self.channel_name in self.rooms.get(self.room_name, []):
            self.rooms[self.room_name].remove(self.channel_name)
        self.player_symbols.pop(self.channel_name, None)

    async def receive(self, text_data):
        data = json.loads(text_data)
        state = self.game_states.get(self.room_name)

        if data['type'] == 'move':
            index = data['index']
            player_symbol = self.player_symbols.get(self.channel_name)

            if (
                state
                and state['board'][index] == ''
                and state['winner'] is None
                and player_symbol == state['currentTurn']
            ):
                state['board'][index] = player_symbol
                state['winner'] = self.check_winner(state['board'])
                state['currentTurn'] = 'O' if player_symbol == 'X' else 'X'

                await self.channel_layer.group_send(self.room_group_name, {
                    'type': 'send_move',
                    'board': state['board'],
                    'winner': state['winner'],
                    'currentTurn': state['currentTurn']
                })

        elif data['type'] == 'reset':
            self.game_states[self.room_name] = {
                'board': [''] * 9,
                'currentTurn': 'X',
                'winner': None
            }
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'send_reset'
            })

    async def send_start(self, event):
        await self.send(text_data=json.dumps({
            'type': 'start',
            'symbol': event['symbol'],
            'opponent': event['opponent']
        }))

    async def send_move(self, event):
        await self.send(text_data=json.dumps({
            'type': 'move',
            'board': event['board'],
            'winner': event['winner'],
            'currentTurn': event['currentTurn']
        }))

    async def send_reset(self, _):
        await self.send(text_data=json.dumps({
            'type': 'reset'
        }))

    def check_winner(self, board):
        combos = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ]
        for a, b, c in combos:
            if board[a] and board[a] == board[b] == board[c]:
                return board[a]
        return 'D' if '' not in board else None
