import os
from llm import generate_response

if __name__ == "__main__":
    user_message = input("Enter your message: ")
    memory_context = input("Enter memory context (optional): ")
    response = generate_response(user_message, memory_context)
    print("AI Response:", response)