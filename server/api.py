from fastapi import FastAPI, Request
from pydantic import BaseModel
from llm import generate_response

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    memory: str = ""

@app.post("/chat")
async def chat_endpoint(chat: ChatRequest):
    response = generate_response(chat.message, chat.memory)
    return {"response": response}