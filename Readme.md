# WhatsApp Gemini Chatbot 🤖💬

An AI-powered WhatsApp chatbot that connects with **Google Gemini AI** to reply like a human.  
---

## ✨ Features
- ✅ Connects WhatsApp with **Gemini AI**  
- ✅ Replies in a **human-like tone**  
- ✅ Context-aware replies (no more robotic one-liners)  
- ✅ Built with **Node.js + Express**  

---

## 🚀 How It Works
1. User sends multiple messages on WhatsApp.  
2. Server queues them under the user’s `userId`.  
3. Gemini AI generates a **single meaningful reply**.  
4. Bot replies on WhatsApp in human-like language.  

---

## 📦 Tech Stack
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)  
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) (for WhatsApp integration)  
- [Google Gemini API](https://ai.google.dev/) (for AI replies)  
- [Axios](https://axios-http.com/) (for API requests)  

---

## ⚡ Setup

### 1. Clone the Repo
```bash
git clone https://github.com/your-username/whatsapp-gemini-chatbot.git
cd whatsapp-gemini-chatbot


. Install Dependencies
npm i
. Set Environment Variables
Create a .env file in the root: NEXT_PUBLIC_GOOGLE_API_KEY=your_gemini_api_key_here


. Run the Server: nodemon index.js

// After Scan QR code to turn on whatsapp Web.



---MIT License © 2025

👉 Do you want me to also prepare a **live example with WhatsApp-Web.js integration** so repo users can test it directly, or just keep the Express API version?


