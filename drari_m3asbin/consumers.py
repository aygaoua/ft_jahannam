from channels.generic.websocket import AsyncWebsocketConsumer
import json
import asyncio
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Global list for matchmaking
waiting_players = []

class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope['url_route']['kwargs']['username']
        logger.info(f"Matchmaking: {self.username} connected")
        
        await self.accept()
        logger.info(f"Matchmaking: {self.username} connection accepted")

        if waiting_players:
            opponent = waiting_players.pop(0)
            room = f"room_{self.username}_{opponent}"
            
            logger.info(f"Matchmaking: Match found! {self.username} vs {opponent} in room {room}")
            
            # Send room info to both players
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
            logger.info(f"Matchmaking: {self.username} added to waiting list")
            await self.channel_layer.group_add(f"match_{self.username}", self.channel_name)

    async def disconnect(self, close_code):
        logger.info(f"Matchmaking: {self.username} disconnected with code {close_code}")
        
        if self.username in waiting_players:
            waiting_players.remove(self.username)
            logger.info(f"Matchmaking: {self.username} removed from waiting list")
            
        await self.channel_layer.group_discard(f"match_{self.username}", self.channel_name)

    async def match_found(self, event):
        logger.info(f"Matchmaking: Sending match found to {self.username}, room: {event['room']}")
        await self.send(text_data=json.dumps({
            "type": "match_found",
            "room": event["room"]
        }))

class TicTacToeConsumer(AsyncWebsocketConsumer):
    # Class variables for shared state
    rooms = {}
    game_states = {}
    player_symbols = {}

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"tictactoe_{self.room_name}"
        
        logger.info(f"TicTacToe: Connecting to room {self.room_name}")
        
        try:
            # Join room group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            logger.info(f"TicTacToe: Connection accepted for room {self.room_name}")
            
            # Get or create the room
            players = self.rooms.setdefault(self.room_name, [])
            if len(players) < 2:
                players.append(self.channel_name)
                logger.info(f"TicTacToe: Player added to room {self.room_name} ({len(players)}/2)")

            # Start the game when 2 players are in the room
            if len(players) == 2:
                logger.info(f"TicTacToe: Game starting in room {self.room_name}")
                self.game_states[self.room_name] = {
                    'board': [''] * 9,
                    'currentTurn': 'X',
                    'winner': None
                }

                # Assign symbols and notify players
                for i, channel in enumerate(players):
                    symbol = 'X' if i == 0 else 'O'
                    self.player_symbols[channel] = symbol
                    
                    logger.info(f"TicTacToe: Sending start to player {i+1} with symbol {symbol}")
                    await self.channel_layer.send(channel, {
                        'type': 'send_start',
                        'symbol': symbol,
                        'opponent': 'Player 2' if i == 0 else 'Player 1'
                    })
        except Exception as e:
            logger.error(f"TicTacToe: Error in connect: {str(e)}")
            if not self.channel_name:
                return
            
            # Clean up in case of error
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
                
            # Close the connection with an error
            if hasattr(self, 'close'):
                await self.close(code=1011)  # 1011 = Server error

    async def disconnect(self, close_code):
        logger.info(f"TicTacToe: Disconnecting from room {self.room_name} with code {close_code}")
        
        try:
            # Remove from room group
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            
            # Clean up player data
            if self.room_name in self.rooms and self.channel_name in self.rooms.get(self.room_name, []):
                self.rooms[self.room_name].remove(self.channel_name)
                logger.info(f"TicTacToe: Player removed from room {self.room_name}")
                
                # Notify other player about disconnection
                if self.rooms[self.room_name]:
                    remaining_player = self.rooms[self.room_name][0]
                    await self.channel_layer.send(remaining_player, {
                        'type': 'send_opponent_left'
                    })
            
            # Remove player symbol
            if self.channel_name in self.player_symbols:
                self.player_symbols.pop(self.channel_name)
        except Exception as e:
            logger.error(f"TicTacToe: Error in disconnect: {str(e)}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            logger.info(f"TicTacToe: Received message in room {self.room_name}: {data['type']}")
            
            state = self.game_states.get(self.room_name)
            if not state:
                logger.warning(f"TicTacToe: No game state found for room {self.room_name}")
                return

            if data['type'] == 'move':
                index = data['index']
                player_symbol = self.player_symbols.get(self.channel_name)
                
                if (
                    state and
                    0 <= index < 9 and
                    state['board'][index] == '' and
                    state['winner'] is None and
                    player_symbol == state['currentTurn']
                ):
                    state['board'][index] = player_symbol
                    state['winner'] = self.check_winner(state['board'])
                    state['currentTurn'] = 'O' if player_symbol == 'X' else 'X'
                    
                    logger.info(f"TicTacToe: Move made in room {self.room_name}, index {index}, winner: {state['winner']}")

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
                logger.info(f"TicTacToe: Game reset in room {self.room_name}")
                
                await self.channel_layer.group_send(self.room_group_name, {
                    'type': 'send_reset'
                })
        except Exception as e:
            logger.error(f"TicTacToe: Error processing message: {str(e)}")

    async def send_start(self, event):
        try:
            logger.info(f"TicTacToe: Sending start event to player")
            await self.send(text_data=json.dumps({
                'type': 'start',
                'symbol': event['symbol'],
                'opponent': event['opponent']
            }))
        except Exception as e:
            logger.error(f"TicTacToe: Error sending start event: {str(e)}")

    async def send_move(self, event):
        try:
            await self.send(text_data=json.dumps({
                'type': 'move',
                'board': event['board'],
                'winner': event['winner'],
                'currentTurn': event['currentTurn']
            }))
        except Exception as e:
            logger.error(f"TicTacToe: Error sending move event: {str(e)}")

    async def send_reset(self, _):
        try:
            await self.send(text_data=json.dumps({ 'type': 'reset' }))
        except Exception as e:
            logger.error(f"TicTacToe: Error sending reset event: {str(e)}")
            
    async def send_opponent_left(self, _):
        try:
            await self.send(text_data=json.dumps({
                'type': 'opponent_left',
                'message': 'Your opponent has left the game'
            }))
        except Exception as e:
            logger.error(f"TicTacToe: Error sending opponent_left event: {str(e)}")

    def check_winner(self, board):
        combos = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ]
        for a, b, c in combos:
            if board[a] and board[a] == board[b] == board[a] == board[c]:
                return board[a]
        return 'D' if '' not in board else None