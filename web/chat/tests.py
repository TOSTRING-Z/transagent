from django.test import TestCase, Client
from django.urls import reverse
import json

class CollectionAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse('collection')
        
    def test_collection_post(self):
        data = {
            'chat_id': 1,
            'id': 1,
            'user': 'test message',
            'agent': [{'memory_id': 1, 'role': 'user', 'content': 'test content'}]
        }
        response = self.client.post(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'success')
        
    def test_invalid_data(self):
        response = self.client.post(
            self.url,
            data='invalid data',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['status'], 'error')