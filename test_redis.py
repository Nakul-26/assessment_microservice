import socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.connect(('localhost', 6379))
    print("Successfully connected to Redis on port 6379")
except ConnectionRefusedError:
    print("Connection to Redis was refused.")
finally:
    s.close()