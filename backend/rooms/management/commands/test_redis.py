"""
Management command to test Redis cache connectivity.
Run: python manage.py test_redis
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache


class Command(BaseCommand):
    help = 'Test Redis cache connectivity'

    def handle(self, *args, **options):
        self.stdout.write("Testing Redis Cache...")
        
        # Test 1: Basic set/get
        try:
            cache.set('test_key', {'hello': 'world'}, timeout=60)
            result = cache.get('test_key')
            if result == {'hello': 'world'}:
                self.stdout.write(self.style.SUCCESS('✓ Basic set/get works'))
            else:
                self.stdout.write(self.style.ERROR(f'✗ Get returned: {result}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error: {e}'))
        
        # Test 2: Dict operations (like our presence system)
        try:
            key = 'room:test:online_users'
            cache.delete(key)
            
            # Add user
            users = cache.get(key, {})
            if users is None:
                users = {}
            users['user1'] = {'id': 'user1', 'username': 'TestUser1'}
            cache.set(key, users, timeout=3600)
            
            # Read back
            read_users = cache.get(key, {})
            if read_users and 'user1' in read_users:
                self.stdout.write(self.style.SUCCESS(f'✓ Dict operations work: {read_users}'))
            else:
                self.stdout.write(self.style.ERROR(f'✗ Dict read failed: {read_users}'))
            
            # Cleanup
            cache.delete(key)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Dict Error: {e}'))
        
        # Test 3: Check existing room keys
        try:
            # Try to find any existing room keys
            self.stdout.write("\nChecking for existing room presence data...")
            # Can't easily list keys with Django cache, but we can try a known pattern
            self.stdout.write("(Note: Django cache doesn't support key listing)")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error: {e}'))
        
        self.stdout.write("\nRedis test complete.")
