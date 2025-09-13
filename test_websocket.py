#!/usr/bin/env python3
"""
Test script for WebSocket chat functionality
"""

import asyncio
import websockets
import json
import os

async def test_websocket_connection():
    """Test WebSocket connection to the chat server"""
    
    # WebSocket URL - adjust based on your server configuration
    uri = "ws://localhost:8000/ws/chat/1/"  # Assuming conversation ID 1
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connection established successfully!")
            
            # Send a test message
            test_message = {
                "type": "chat_message",
                "message": "Hello from test script!",
                "image_url": ""
            }
            
            await websocket.send(json.dumps(test_message))
            print("📤 Test message sent")
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            response_data = json.loads(response)
            print(f"📥 Received response: {response_data}")
            
            # Test mark as read
            mark_read_message = {"type": "mark_read"}
            await websocket.send(json.dumps(mark_read_message))
            print("📤 Mark read message sent")
            
            print("✅ All WebSocket tests passed!")
            
    except websockets.ConnectionClosed:
        print("❌ WebSocket connection closed unexpectedly")
    except asyncio.TimeoutError:
        print("❌ WebSocket response timeout")
    except ConnectionRefusedError:
        print("❌ Connection refused. Make sure the Django server is running with ASGI.")
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")

def check_django_setup():
    """Check if Django setup is correct"""
    
    print("🔍 Checking Django setup...")
    
    # Check if requirements.txt has channels
    requirements_path = "fixmate_backend/requirements.txt"
    if os.path.exists(requirements_path):
        with open(requirements_path, 'r') as f:
            requirements = f.read()
            if 'channels' in requirements:
                print("✅ Django Channels found in requirements.txt")
            else:
                print("❌ Django Channels not found in requirements.txt")
    
    # Check ASGI configuration
    asgi_path = "fixmate_backend/fixmate_backend/asgi.py"
    if os.path.exists(asgi_path):
        with open(asgi_path, 'r') as f:
            asgi_content = f.read()
            if 'ProtocolTypeRouter' in asgi_content and 'AuthMiddlewareStack' in asgi_content:
                print("✅ ASGI configuration looks correct")
            else:
                print("❌ ASGI configuration may be incorrect")
    
    # Check consumers
    consumers_path = "fixmate_backend/chat/consumers.py"
    if os.path.exists(coners_path):
        print("✅ WebSocket consumers file exists")
    else:
        print("❌ WebSocket consumers file not found")
    
    # Check routing
    routing_path = "fixmate_backend/chat/routing.py"
    if os.path.exists(routing_path):
        print("✅ WebSocket routing file exists")
    else:
        print("❌ WebSocket routing file not found")

def main():
    """Main test function"""
    
    print("🚀 Starting WebSocket Chat Test Suite")
    print("=" * 50)
    
    # Check Django setup
    check_django_setup()
    print()
    
    # Test WebSocket connection
    print("🔌 Testing WebSocket connection...")
    print("Note: Make sure Django server is running with: python manage.py runserver")
    print()
    
    asyncio.run(test_websocket_connection())
    
    print("\n" + "=" * 50)
    print("🏁 Test suite completed!")

if __name__ == "__main__":
    main()
