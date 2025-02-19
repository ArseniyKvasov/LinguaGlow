import json
from channels.generic.websocket import AsyncWebsocketConsumer


class ClassroomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.classroom_id = self.scope['url_route']['kwargs']['classroom_id']
        self.room_group_name = f'classroom_{self.classroom_id}'

        # Присоединяемся к группе
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"Client connected to classroom {self.classroom_id}")

    async def disconnect(self, close_code):
        # Покидаем группу
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

            print(f"Received message from {sender} in classroom {self.classroom_id}:")
            print(f"Type: {message_type}, Payloads: {payloads}")

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',  # Соответствует имени метода
                    'message_type': message_type,
                    'sender': sender,
                    'payloads': payloads,
                }
            )

        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

    async def handle_pair_match(self, data):
        # Здесь логика сохранения пары в БД
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_type': 'pair_matched',
                'sender': data.get('sender'),
                'payloads': data['payloads']
            }
        )

    async def chat_message(self, event):
        # Извлекаем данные из события
        message_type = event['message_type']
        sender = event['sender']
        payloads = event['payloads']

        print(f"Sending to group {self.room_group_name}: {message_type} from {sender}")

        # Отправляем сообщение всем клиентам в группе
        await self.send(text_data=json.dumps({
            'message_type': message_type,
            'sender': sender,
            'payloads': payloads,
        }))
