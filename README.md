# Omni3-demo

Real-time Audio & Video Conversation Demo based on Qwen-Omni-Realtime API

## Features

- Real-time voice conversation with server-side VAD (Voice Activity Detection)
- Video input support (camera feed)
- Low-latency real-time response
- Audio waveform visualization
- Continuous audio playback without overlap

## Tech Stack

- **Frontend**: React + Vite + Web Audio API + MediaStream API
- **Backend**: Python + FastAPI + WebSocket + DashScope SDK
- **AI**: Qwen-Omni-Realtime API (Singapore Region)

## Prerequisites

Before starting, ensure you have:
- **Node.js** >= 18
- **Python** >= 3.9
- **DashScope API Key** from Alibaba Cloud Bailian Platform

## Getting Started from Scratch

### Step 1: Get Your API Key

1. Visit [Alibaba Cloud Bailian Console](https://bailian.console.aliyun.com/)
2. Create or retrieve your API Key
3. The key should start with `sk-`

### Step 2: Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip3 install -r requirements.txt

# Create .env file with your API key
echo "DASHSCOPE_API_KEY=sk-your-actual-api-key-here" > .env
echo "MODEL_NAME=qwen3-omni-flash-realtime" >> .env

# Start the backend server
python3 server.py
```

The backend server will start on `http://0.0.0.0:8000`

### Step 3: Set Up Frontend

Open a **new terminal window** and run:

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### Step 4: Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Click **"Start Conversation"** button
3. Allow browser to access your camera and microphone
4. Wait for the "Connected" status
5. Start speaking - the AI will automatically detect your voice and respond!

## Project Structure

```
Omni3-demo/
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── VideoDisplay.jsx       # Camera preview
│   │   │   ├── AudioVisualizer.jsx    # Audio waveform
│   │   │   └── ControlPanel.jsx       # Control buttons & status
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useMediaStream.js      # Camera/mic management
│   │   │   ├── useWebSocket.js        # WebSocket connection
│   │   │   └── useAudioPlayer.js      # Real-time audio playback
│   │   ├── utils/              # Utility functions
│   │   │   ├── audioProcessor.js      # Audio downsampling (48kHz→16kHz)
│   │   │   └── videoProcessor.js      # Video frame capture (JPEG)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                    # Python backend
│   ├── server.py               # FastAPI WebSocket server
│   ├── qwen_client.py          # Qwen API client wrapper
│   ├── requirements.txt
│   └── .env                    # API key configuration (not in git)
│
├── .gitignore
└── README.md
```

## Key Technical Points

### Audio Processing Pipeline

**Input (Browser → Server):**
- Browser captures audio at 48kHz
- Downsample to 16kHz PCM16 (mono, 16-bit)
- Encode to base64 and send via WebSocket
- Server forwards to Qwen API

**Output (Server → Browser):**
- Qwen API returns 24kHz PCM24 audio
- Server forwards to frontend
- Browser decodes and plays using Web Audio API
- Uses timeline scheduling to prevent audio overlap

### Server-side VAD

- Automatic voice activity detection on the server
- No manual triggering required
- Parameters:
  - `threshold: 0.5`
  - `silence_duration_ms: 800`

### Video Frame Processing

- Captures video frames from camera at 1-2 FPS
- Converts to JPEG format
- Encodes to base64 and sends to API
- Server uses `append_video()` method

### WebSocket Architecture

```
Browser (React) <--WebSocket--> Python Server <--WebSocket--> Qwen API
```

- Bidirectional real-time communication
- Separate channels for audio and text data
- Automatic reconnection on disconnect

## Troubleshooting

### Backend Issues

**"未設置 DASHSCOPE_API_KEY"**
- Check if `.env` file exists in `backend/` directory
- Verify API key is correctly set

**"401 Unauthorized - Invalid API-key"**
- Ensure API key is valid and active
- Check if you have access to qwen3-omni-flash-realtime model
- Verify using Singapore region URL

**Connection timeout**
- Check network connection
- Verify firewall settings
- Ensure API key has proper permissions

### Frontend Issues

**"WebSocket connection failed"**
- Ensure backend server is running on port 8000
- Check if localhost:8000 is accessible

**No audio playback**
- Check browser console for errors
- Verify Web Audio API is supported
- Check browser audio permissions

**Camera not working**
- Grant camera/microphone permissions in browser
- Check if another application is using the camera
- Try refreshing the page

## Development Notes

### Important Files

- `backend/qwen_client.py` - Handles Qwen API connection with official SDK pattern
- `frontend/src/hooks/useAudioPlayer.js` - Audio timeline scheduling prevents overlap
- `frontend/src/utils/audioProcessor.js` - Audio downsampling and PCM16 encoding

### API Configuration

- **Region**: Singapore (`wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime`)
- **Model**: `qwen3-omni-flash-realtime`
- **Voice**: Cherry (can be changed to Bella, Ethan, etc.)
- **Input Format**: PCM 16kHz mono 16-bit
- **Output Format**: PCM 24kHz mono 16-bit

### Known Limitations

- Browser must support Web Audio API and MediaStream API
- Requires HTTPS for camera access (localhost is exempted)
- Audio quality depends on microphone and network conditions

## License

MIT

## Credits

Built with [Qwen-Omni-Realtime API](https://help.aliyun.com/zh/model-studio/realtime) by Alibaba Cloud
