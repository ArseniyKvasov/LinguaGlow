import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ClassroomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.classroom_id = self.scope['url_route']['kwargs']['classroom_id']
        self.room_group_name = f'classroom_{self.classroom_id}'

        # Join the group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"Client connected to classroom {self.classroom_id}")

    async def disconnect(self, close_code):
        # Leave the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"Client disconnected from classroom {self.classroom_id}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('message_type')
            sender = data.get('sender')
            payloads = data.get('payloads', {})
            receivers = data.get('receivers', 'all')  # Default to 'all' if not specified

            print(f"Received message from {sender} in classroom {self.classroom_id}:")
            print(f"Type: {message_type}, Payloads: {payloads}, Receivers: {receivers}")

            # Determine the recipients based on the receivers field
            if receivers == 'all':
                # Send to all users except the sender
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message_type': message_type,
                        'sender': sender,
                        'payloads': payloads,
                        'receivers': receivers,
                    }
                )
            else:
                # Send to specified users
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message_type': message_type,
                        'sender': sender,
                        'payloads': payloads,
                        'receivers': receivers,
                    }
                )

        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

    async def chat_message(self, event):
        # Extract data from the event
        message_type = event['message_type']
        sender = event['sender']
        payloads = event['payloads']
        receivers = event.get('receivers')

        print(f"Sending to group {self.room_group_name}: {message_type} from {sender}")

        # Check if the message should be sent to this client
        if receivers == 'all' or self.scope['user'].username == receivers:
            # Send the message to the client
            await self.send(text_data=json.dumps({
                'message_type': message_type,
                'sender': sender,
                'payloads': payloads,
            }))
