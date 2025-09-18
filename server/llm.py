import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_response(user_message: str, memory_context: str = "") -> str:
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""
    You are an AI assistant in a multi-user chat room application.
    
    # Your Role:
    - You've been mentioned directly with "@AI" in a message
    - Provide helpful, concise, and conversational responses
    - You're part of a group chat with multiple human participants
    - Keep responses relatively brief (1-3 paragraphs max) to maintain chat flow
    
    # Context:
    {memory_context}
    
    # The user's message (without the @AI mention):
    {user_message.replace('@AI', '').strip()}
    
    # Respond naturally as if you're a participant in the chat, while being helpful and informative.
    # Don't mention that you were "mentioned" or "called" - just respond to the query directly.
    """

    try:
        response = model.generate_content(prompt)
        return response.text if response and response.text else "I'm not sure how to respond to that."
    except Exception as e:
        print(f"Error generating response: {e}")
        return "Sorry, I'm having trouble connecting right now. Please try again later."