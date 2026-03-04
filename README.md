# SmartSPS

SmartSPS is a real-time video conferencing web application designed to facilitate seamless live communication. Built for IMEDIA5.com, the platform features video conferencing, screen sharing, and integrated AI-driven meeting transcription and summarization.

## Architecture & Technology Stack

The project utilizes a decoupled Full-Stack JavaScript architecture.

*   **Frontend:** React (Vite)
*   **Backend:** Node.js (Express)
*   **Database:** MongoDB (Mongoose)
*   **WebRTC Provider:** Agora SDK (RTC & RTM)
*   **Authentication:** Clerk
*   **AI Transcription:** Gladia V2 (Speech-to-Text with Diarization)
*   **AI Summarization:** Groq (Llama 3.1 8b instant)
*   **Cloud Storage:** Cloudinary (For meeting recordings)

## Key Features

*   **Live Video Conferencing:** Low-latency WebRTC streams utilizing Agora.
*   **Screen Sharing:** Native browser screen capture functionality.
*   **Meeting Controls:** Granular participant controls, including host-level administrative muting functionality.
*   **Meeting Recording:** Audio tracking logic captured via the native browser Web Audio API, seamlessly buffered and sent to the backend for Cloudinary storage.
*   **AI Meeting Notes:** Automated pipeline that transcribes meeting recordings via Gladia and generates actionable intelligence (Key Points, Action Items, Decisions) using Groq.
*   **Live Chat & Reactions:** Synchronized real-time messaging and interface animations powered by Agora RTM.

## Prerequisites

Ensure the following dependencies are installed prior to setup:

*   Node.js (v18+)
*   npm or yarn
*   A MongoDB Atlas clustered database URI (or local equivalent)

You must also provision API keys for the following integrated services:
*   **Clerk** (Authentication)
*   **Agora** (App ID for WebRTC)
*   **Cloudinary** (Cloud Name, API Key, API Secret)
*   **Gladia** (Transcription API)
*   **Groq** (LLM API)

## Local Installation Guide

### 1. Clone & Install Dependencies

Clone the repository to your local machine and install the required dependencies for both the frontend and backend environments.

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Environment Variables Configuration

Create `.env.local` files in both the frontend and backend directories. Use the templates below to configure your development environment.

**Frontend (`frontend/.env.local`)**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_... # Your Clerk Publishable Key
VITE_SOCKET_URL=http://localhost:5001
VITE_API_URL=http://localhost:5001/api
VITE_APP_URL=http://localhost:5173
VITE_AGORA_APP_ID=... # Your Agora App ID
```

**Backend (`backend/.env`)**
```env
PORT=5001
MONGODB_URI=mongodb+srv://... # Your MongoDB connection string
CLERK_SECRET_KEY=sk_test_... # Your Clerk Secret Key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Cloudinary Integration (For storing meeting recordings)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AI Integrations
GLADIA_API_KEY=... # Gladia API key for transcription
GROQ_API_KEY=... # Groq API key for summarization
```

### 3. Initialize the Application

Execute the following commands in separate terminal instances to start the development servers.

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## Deployment (Vercel)

Both the frontend and backend are optimized for deployment on serverless platforms such as Vercel. Ensure that all production Environment Variables are explicitly set within your hosting provider's dashboard.

**Note on Recording Uploads:** To accommodate Serverless environments with read-only filesystems (e.g., Vercel), the backend utilizes `multer` configured to `memoryStorage()`. This approach streams incoming audio buffers directly to Cloudinary without requiring localized disk writes.
