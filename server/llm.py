import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini client
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_response(user_message: str, memory_context: str = "") -> str:
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""
                You are a helpful AI chat assistant.
                Here is some past memory: {memory_context}
                User says: {user_message}
                Respond helpfully and naturally.
              """

    response = model.generate_content(prompt)

    return response.text if response and response.text else "Sorry, I couldn't generate a response."
