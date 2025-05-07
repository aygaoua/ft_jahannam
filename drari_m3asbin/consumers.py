import asyncio
import logging
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.core.cache import cache
import json

# Set up logging
logger = logging.getLogger(__name__)

# Use asyncio.Queue for thread-safe matchmaking
# waiting_players = asyncio.Queue()

# In-memory queue for waiting players
# In production, you might want to use Redis or another distributed solution
WAITING_PLAYERS = []

class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope['url_route']['kwargs']['username']
        self.user = await self.get_user(self.username)
        
        if not self.user:
            await self.close()
            return
        
        # Accept the connection
        await self.accept()
        
        # Add user to waiting players
        player_info = {
            'username': self.username,
            'channel_name': self.channel_name
        }
        
        # Check if there are any waiting players
        if WAITING_PLAYERS:
            # Match found - get the first waiting player
            opponent = WAITING_PLAYERS.pop(0)
            
            # Create a unique room ID
            room_id = str(uuid.uuid4())[:8]
            
            # Notify both players
            await self.channel_layer.send(
                opponent['channel_name'],
                {
                    'type': 'match_found',
                    'room': room_id,
                    'opponent': self.username
                }
            )
            
            await self.match_found({
                'room': room_id,
                'opponent': opponent['username']
            })
        else:
            # No waiting players, add self to queue
            WAITING_PLAYERS.append(player_info)
            
            # Send waiting confirmation
            await self.send(json.dumps({
                'type': 'waiting',
                'message': 'Waiting for an opponent'
            }))
    
    async def disconnect(self, close_code):
        # Remove from waiting queue if disconnected
        for i, player in enumerate(WAITING_PLAYERS):
            if player['username'] == self.username:
                WAITING_PLAYERS.pop(i)
                break
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'cancel_matchmaking':
            # Remove from waiting queue
            for i, player in enumerate(WAITING_PLAYERS):
                if player['username'] == self.username:
                    WAITING_PLAYERS.pop(i)
                    await self.send(json.dumps({
                        'type': 'matchmaking_cancelled',
                        'message': 'Matchmaking cancelled'
                    }))
                    break
    
    async def match_found(self, event):
        # Send match found message to the client
        await self.send(json.dumps({
            'type': 'match_found',
            'room': event['room'],
            'opponent': event['opponent']
        }))
    
    @database_sync_to_async
    def get_user(self, username):
        User = get_user_model()
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            return None


GAME_ROOMS = {}

class TicTacToeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.username = self.scope['url_route']['kwargs'].get('username')
        self.room_group_name = f'game_{self.room_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Initialize game if it doesn't exist
        if self.room_id not in GAME_ROOMS:
            GAME_ROOMS[self.room_id] = {
                'board': [None] * 9,
                'players': [],
                'current_turn': None,
                'game_over': False,
                'winner': None
            }
        
        # Add player to the game
        game = GAME_ROOMS[self.room_id]
        if self.username and self.username not in [player['username'] for player in game['players']]:
            # Assign X to first player, O to second
            symbol = 'X' if len(game['players']) == 0 else 'O'
            game['players'].append({
                'username': self.username,
                'symbol': symbol,
                'channel_name': self.channel_name
            })
            
            # Set current turn if this is the first player
            if len(game['players']) == 1:
                game['current_turn'] = self.username
        
        # Send current game state
        await self.send(json.dumps({
            'type': 'game_state',
            'board': game['board'],
            'players': [{'username': p['username'], 'symbol': p['symbol']} for p in game['players']],
            'current_turn': game['current_turn'],
            'game_over': game['game_over'],
            'winner': game['winner']
        }))
        
        # Notify all clients if both players are connected
        if len(game['players']) == 2:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_ready',
                    'players': [{'username': p['username'], 'symbol': p['symbol']} for p in game['players']]
                }
            )
    
    async def disconnect(self, close_code):
        # Remove player from game
        if self.room_id in GAME_ROOMS:
            game = GAME_ROOMS[self.room_id]
            game['players'] = [p for p in game['players'] if p['username'] != self.username]
            
            # Notify remaining player that opponent left
            if game['players']:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_left',
                        'username': self.username
                    }
                )
            else:
                # Clean up if no players left
                del GAME_ROOMS[self.room_id]
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'make_move':
            await self.make_move(data)
        elif message_type == 'restart_game':
            await self.restart_game()
    
    async def make_move(self, data):
        game = GAME_ROOMS.get(self.room_id)
        if not game:
            return
        
        # Check if it's the player's turn and game is not over
        if game['current_turn'] != self.username or game['game_over']:
            return
        
        position = data.get('position')
        if position is None or not (0 <= position < 9) or game['board'][position] is not None:
            return
        
        # Find player's symbol
        player = next((p for p in game['players'] if p['username'] == self.username), None)
        if not player:
            return
        
        # Make the move
        game['board'][position] = player['symbol']
        
        # Check for win or draw
        winner, game_over = self.check_game_state(game['board'])
        game['winner'] = winner
        game['game_over'] = game_over
        
        # Switch turns if game is not over
        if not game_over:
            other_player = next((p for p in game['players'] if p['username'] != self.username), None)
            if other_player:
                game['current_turn'] = other_player['username']
        
        # Broadcast updated game state
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'update_game_state',
                'board': game['board'],
                'current_turn': game['current_turn'],
                'game_over': game['game_over'],
                'winner': game['winner']
            }
        )
    
    def check_game_state(self, board):
        # Check rows, columns, and diagonals for win
        win_positions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8],  # columns
            [0, 4, 8], [2, 4, 6]              # diagonals
        ]
        
        for positions in win_positions:
            if board[positions[0]] is not None and board[positions[0]] == board[positions[1]] == board[positions[2]]:
                # Find winner's username
                for player in GAME_ROOMS[self.room_id]['players']:
                    if player['symbol'] == board[positions[0]]:
                        return player['username'], True
        
        # Check for draw (all positions filled)
        if all(cell is not None for cell in board):
            return None, True
        
        return None, False
    
    async def restart_game(self):
        game = GAME_ROOMS.get(self.room_id)
        if not game:
            return
        
        # Reset the game state
        game['board'] = [None] * 9
        game['game_over'] = False
        game['winner'] = None
        
        # Switch starting player
        if len(game['players']) == 2:
            prev_starter = game['players'][0]['username'] if game['players'][0]['symbol'] == 'X' else game['players'][1]['username']
            new_starter = next(p['username'] for p in game['players'] if p['username'] != prev_starter)
            
            # Swap symbols
            for player in game['players']:
                player['symbol'] = 'O' if player['symbol'] == 'X' else 'X'
            
            game['current_turn'] = new_starter
        
        # Broadcast restarted game state
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'update_game_state',
                'board': game['board'],
                'players': [{'username': p['username'], 'symbol': p['symbol']} for p in game['players']],
                'current_turn': game['current_turn'],
                'game_over': game['game_over'],
                'winner': game['winner']
            }
        )
    
    async def game_ready(self, event):
        await self.send(json.dumps({
            'type': 'game_ready',
            'players': event['players']
        }))
    
    async def update_game_state(self, event):
        await self.send(json.dumps({
            'type': 'game_state',
            'board': event['board'],
            'current_turn': event['current_turn'],
            'game_over': event['game_over'],
            'winner': event['winner']
        }))
    
    async def player_left(self, event):
        await self.send(json.dumps({
            'type': 'player_left',
            'username': event['username']
        }))