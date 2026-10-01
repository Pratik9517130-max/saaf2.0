# Saaf 2.0 - Residential Society Waste Management

A modern, responsive residential society waste management web application. Residents can report waste issues with photo uploads & instant AI suggestions, request doorstep pickups for e-waste & bulky items, chat with an AI assistant supporting English and Hinglish voice/text, and track resolutions. Society administrators can manage reports and resolve issues with proof.

---

## Features

- **Civic Notice Board Feed**: Live community feed of waste reports, real-time stats banner (Resolved, Open, Average Fix Time), and "I face this too" upvotes.
- **Report an Issue with AI**: Photo uploads with automatic client-side and edge AI categorization, detecting issue type, priority, and reason across English and Hinglish.
- **Doorstep Pickup**: Request scheduled collection for E-Waste, Bulky Furniture, Hazardous materials, and Dry Recyclables with slot selection.
- **AI Voice & Hinglish Assistant**: Natural language conversation interface supporting voice dictation (Web Speech API) and Hindi/Hinglish phrasing (e.g. *"Tower B parking ka bin overflow ho raha hai"*), generating instant complaint drafts.
- **Admin Dashboard**: Review all society reports, filter by status, and resolve issues with after-photos and resolution notes.
- **Responsive Web App**: Unified design system across desktop, tablet, and mobile views.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

### 3. Open in Browser
Visit [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## Instant Evaluation Access

On the Login screen, click either:
- **🛡️ Admin (402)**: Instant login as Society Admin (*Tower A #402*)
- **👤 Resident (204)**: Instant login as Resident (*Tower B #204*)
