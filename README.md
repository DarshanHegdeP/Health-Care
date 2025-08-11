# Healthcare Appointment PWA

A **Progressive Web App (PWA)** for managing healthcare appointments with **Node.js + Express + MongoDB** backend and a multi-page HTML/JS frontend.  
Supports **session-based authentication**, **role-based access** (Admin, Doctor, Patient), and **offline support** via a service worker.

 **https://health-care-i1we.onrender.com**
---

## Features
- **Multi-role login system** (Admin, Doctor, Patient)
- **Session-based authentication** stored in MongoDB (via `connect-mongo`)
- **Secure cookies** for session tracking
- **Responsive UI** with Bootstrap
- **PWA capabilities**:
  - Service worker with static asset caching
  - Offline fallback page generation
  - App installable on desktop & mobile
- **Separate HTML views** for:
  - Login (`login.html`)
  - Admin dashboard (`admin.html`)
  - Patient dashboard (`patient.html`)
  - Doctor dashboard (`doctor.html`)

---

## Tech Stack
### **Backend**
- Node.js
- Express.js
- MongoDB (with Mongoose)
- `express-session` + `connect-mongo` for sessions
- `dotenv` for environment variables

### **Frontend**
- HTML, CSS, JavaScript
- Bootstrap for styling
- Service Worker for offline support
- Manifest.json for PWA installability

---

## Installation
```bash
1. Clone the repository

git clone https://github.com/yourusername/healthcare-pwa.git
cd healthcare-pwa

2. Install dependencies
npm install

3. Set environment variables
- Create a .env file in the project root:

PORT=5000
MONGO_URI=mongodb://localhost:27017/healthcare
SESSION_SECRET=your_secure_random_secret

4. Start MongoDB
Make sure MongoDB is running locally or use a remote URI.

 5. Run the project
node server.js

