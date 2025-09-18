# AI Chatroom

An interactive multi-user chatroom application with semantic memory-enhanced AI assistant capabilities.

## Overview

AI Chatroom combines real-time video/audio communication with an intelligent AI assistant that remembers conversation context. Users can create or join rooms, communicate with each other, and interact with an AI assistant that provides contextually relevant responses based on the conversation history.

## Features

- **Real-time Communication**: Video, audio, and text chat using LiveKit
- **Multiple Chatrooms**: Create and join different chat rooms
- **AI Assistant Integration**: Mention "@AI" to get intelligent responses
- **Semantic Memory**: The AI assistant understands and remembers context from previous conversations
- **User-friendly Interface**: Clean, modern UI built with React and TailwindCSS

## Tech Stack

### Backend
- **FastAPI**: Modern, high-performance web framework for building APIs
- **LiveKit Server**: For real-time audio/video communication
- **Google Generative AI (Gemini)**: AI language model for generating responses
- **ChromaDB**: Vector database for semantic memory storage
- **Sentence-Transformers**: For converting text to semantic embeddings

### Frontend
- **React**: UI library for building the interface
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Utility-first CSS framework
- **LiveKit Client**: For real-time communication integration
- **Vite**: Modern frontend build tool

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 16+
- LiveKit server (can be self-hosted or cloud)

### Backend Setup

1. Clone the repository and navigate to the server directory:
    ```bash
    cd ai_chatroom/server
    ```

2. Create a virtual environment:
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
    ```

3. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4. Create a `.env` file with the following variables:
    ```
    GEMINI_API_KEY=your_gemini_api_key
    LIVEKIT_API_KEY=your_livekit_api_key
    LIVEKIT_API_SECRET=your_livekit_api_secret
    LIVEKIT_URL=your_livekit_server_url
    ```

5. Start the backend server:
    ```bash
    uvicorn api:app --reload
    ```

### Frontend Setup

1. Navigate to the client directory:
    ```bash
    cd ai_chatroom/client
    ```

2. Create a `.env` file with:
    ```
    VITE_LIVEKIT_URL=your_livekit_server_url
    ```

3. Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    ```

4. Start the development server:
    ```bash
    npm run dev
    # or
    pnpm dev
    ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Join or Create a Room**:
   - Enter your name and either select an existing room or create a new one

2. **Communicate with Other Users**:
   - Use text chat to send messages to everyone in the room
   - LiveKit integration provides audio/video capabilities

3. **Interact with the AI Assistant**:
   - Type "@AI" followed by your question or request
   - Example: "@AI what was the score of the cricket match we discussed earlier?"

4. **Semantic Memory**:
   - The AI remembers previous conversations and can refer back to them
   - Ask follow-up questions about topics discussed earlier without providing full context

## How Semantic Memory Works

The application uses ChromaDB and Sentence-Transformers to create a semantic memory system:

1. Each message is converted to a vector embedding that captures its meaning
2. Messages are stored in ChromaDB with metadata (room ID, sender, timestamp)
3. When users ask the AI a question, the system finds semantically relevant messages
4. Retrieved context is provided to the AI to generate more informed responses

This creates a more natural and contextual conversation experience, where the AI can recall information from previous discussions even if the exact keywords aren't used.

## Project Structure

```
ai_chatroom/
├── server/               # Backend FastAPI application
│   ├── api.py            # API endpoints
│   ├── llm.py            # AI language model integration
│   ├── semantic_memory.py# Semantic memory system
│   ├── chatroom/         # LiveKit integration
│   └── chroma_db/        # Vector database storage
│
└── client/               # Frontend React application
    ├── src/              # Source code
    │   ├── lobby/        # Room selection screen
    │   ├── room/         # Chat room implementation
    │   ├── components/   # Reusable UI components
    │   └── hooks/        # Custom React hooks
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [LiveKit](https://livekit.io/) for real-time communication
- [Google Generative AI](https://ai.google.dev/) for AI capabilities
- [ChromaDB](https://www.trychroma.com/) for vector storage
- [Sentence-Transformers](https://www.sbert.net/) for text embeddings
- [FastAPI](https://fastapi.tiangolo.com/) and [React](https://reactjs.org/) for application framework