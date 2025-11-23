# Community Compass (NGO Tracker)

Community Compass (NGO Tracker) is a full-stack application built with Next.js and Firebase to help NGO field workers and administrators register, track, and manage community data.

## Core Features
- **Firebase Authentication:** Secure login for all admin/field staff.
- **Household & Child Registration:** A multi-step form to register new families and their children.
- **Data Management:** Edit, view, and delete household information.
- **Follow-up Tracking:** A complete system for scheduling and conducting quarterly/annual follow-up visits.
- **Map Overview:** A live map (using Google Maps API) to visualize all registered households.
- **Analytics:** Charts and graphs for analyzing community data (age, gender, location, etc.).

## Tech Stack
- Framework: Next.js (with Turbopack)  
- Backend: Firebase (Authentication, Firestore, Storage)  
- UI: React, TypeScript, Tailwind CSS  
- Components: shadcn/ui  
- Mapping: @vis.gl/react-google-maps  

---

## Getting Started

Follow these instructions to set up and run the project locally for development and testing.

### Prerequisites
You will need the following software installed on your computer:
- Node.js (v18 or later)
- npm (comes with Node.js)
- Firebase CLI: Run `npm install -g firebase-tools` if you don't have it

### 1. Install Dependencies
Clone the repository (if you haven't) and install the required npm packages.

```bash
# Navigate to the project folder
cd NGO-Tracker-main

# Install dependencies
npm install
```

### 2. Set Up Your Environment
This project requires credentials for Firebase and Google Maps.

#### A. Firebase Setup
1. Go to the Firebase Console and create a new project.  
2. In your new project, enable the following services:
   - Authentication: Enable the "Email/Password" sign-in method.
   - Firestore Database: Create a database (start in test mode for now).
   - Storage: Create a storage bucket.
3. Go to your Project Settings (click the gear icon) → General tab.  
4. Find your Firebase config object under "Your apps" → "SDK setup and configuration". It will look like this:

```ts
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

5. Open `src/firebase/config.ts` in your code editor and replace the existing config object with the one from your new Firebase project.

#### B. Google Maps & Environment File
This step is mandatory for all developers running the project locally.

1. In the Google Cloud Console, select the same project you created for Firebase.  
2. Go to **APIs & Services → Library** and enable the **Maps JavaScript API**.  
3. Go to **APIs & Services → Credentials** and create a new API key.  
4. Create a new file named `.env.local` in the root of your project (`NGO-Tracker-main/`).  
5. Copy the contents of `src/env` into your new `.env.local` file and paste your API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_API_KEY_GOES_HERE"
```

Note: The map may work for the original developer without this step if the key is provided by a development environment (like Firebase Studio). For any collaborator setting up the project from scratch, the map will fail until this `.env.local` file is created.

---

### 3. Running the Application
This project is designed to be run in two parts simultaneously using two separate terminals.

Terminal 1: Start Firebase Emulators  
The project is pre-configured to work with local emulators for Authentication and Firestore.

```bash
firebase emulators:start
```

This will start the emulators and a UI at http://localhost:4005.

Terminal 2: Start the Next.js Web App  
This runs the frontend and server.

```bash
npm run dev
```

Your application will be available at: http://localhost:9002

---

### 4. Logging In
1. Go to the Firebase Console for your project (the real one, not the emulator).  
2. Navigate to **Authentication → Users** and click **Add user**.  
3. Create a new user (for example, `admin@test.com` with a password).  
4. Open http://localhost:9002 in your browser and log in with the user you just created.  
   - The app will authenticate against the real auth service but will connect to your local emulator database.

---

## Available Scripts
- `npm run dev` — Starts the Next.js development server on port 9002.  
- `npm run build` — Builds the application for production.  
- `npm run start` — Starts a production server.  
- `firebase emulators:start` — Runs the local Firebase emulators for Auth and Firestore.

---

## Notes & Tips
- If you prefer running against production Firebase services, update `src/firebase/config.ts` accordingly and adjust emulator usage.  
- Protect your API keys and do not commit `.env.local` to version control.  
- If the map doesn't show, confirm your Google Maps API key is correct and that the Maps JS API is enabled.
