# 🏥 MediQ – Smart Healthcare & Emergency Assistance Platform

<p align="center">
  <img src="public/logo.png" width="150" alt="MediQ Logo"/>
</p>

<p align="center">
A modern healthcare platform that connects patients, doctors, hospitals, pharmacies, and emergency services in one application.
</p>

---

# 📌 Overview

MediQ is a full-stack healthcare management platform designed to simplify medical services through digital technology.

The platform allows users to:

- 👨‍⚕️ Book doctor appointments
- 🏥 Find nearby hospitals
- 💊 Locate nearby pharmacies
- 🚨 Send emergency alerts
- 💳 Make secure online payments
- 📧 Receive appointment notifications
- 📍 Navigate using OpenStreetMap
- 🔐 Secure authentication with Supabase

The project focuses on improving accessibility, reducing emergency response time, and providing an easy-to-use healthcare ecosystem.

---

# 🚀 Features

## 👤 Authentication

- User Registration
- Login
- Email Verification
- Forgot Password
- Password Reset
- Protected Routes
- Session Persistence

---

## 👨‍⚕️ Doctor Module

- Browse Doctors
- View Doctor Profiles
- Search by Name
- Search by Specialization
- Search by Hospital
- Book Appointment

---

## 🏥 Hospital Module

- Browse Hospitals
- Hospital Details
- Nearby Hospitals
- Hospital Contact Information

---

## 📅 Appointment Management

- Book Appointment
- Select Available Time Slot
- Appointment Confirmation
- Appointment History
- Cancel Appointment

---

## 💳 Payment Gateway

Integrated with Razorpay Test Mode

Features

- Secure Payment
- Payment Success
- Payment Failure
- Payment History
- Appointment Payment Mapping

---

## 🚨 Emergency Assist

One of the major innovations of MediQ.

Workflow

User presses Emergency

↓

Application gets Live GPS Location

↓

Nearby Hospitals are displayed using OpenStreetMap

↓

User selects Hospital

↓

Emergency Alert sent

↓

Hospital prepares before patient arrival

---

## 📍 Location Services

Powered by OpenStreetMap

Features

- Live GPS
- Nearby Hospitals
- Nearby Medical Shops
- Route Navigation
- Distance Calculation

---

## 🔔 Notifications

- Appointment Booked
- Appointment Cancelled
- Payment Success
- Emergency Alert
- System Notifications

---

## 👤 User Profile

- Update Profile
- Upload Profile Picture
- Edit Personal Information
- View Booking History

---

# 🛠 Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

---

## Backend

- Supabase

Features

- PostgreSQL Database
- Authentication
- Storage
- Edge Functions
- Realtime Database

---

## Maps

- OpenStreetMap
- Leaflet

---

## Payment

- Razorpay

---

## Notifications

- Supabase Realtime
- Resend Email

---

## Authentication

- Supabase Auth

---

# 📂 Project Structure

```
src/

├── components/

├── pages/

├── hooks/

├── context/

├── services/

├── lib/

├── integrations/

├── utils/

├── assets/

└── App.tsx
```

---

# 🗄 Database

Main Tables

```
profiles

doctors

hospitals

appointments

time_slots

notifications

payments

emergency_alerts
```

---

# 🔐 Security

- Row Level Security (RLS)
- Protected Routes
- Secure Authentication
- Email Verification
- Password Encryption
- Session Management

---

# 🚀 Future Enhancements

- AI Symptom Checker
- Blood Bank Availability
- Ambulance Tracking
- Medicine Delivery
- Health Records
- Insurance Integration
- Video Consultation
- Multi-language Support

---

# 📱 Application Workflow

```
User

↓

Login / Signup

↓

Search Doctor

↓

Book Appointment

↓

Online Payment

↓

Appointment Confirmation

↓

Visit Doctor
```

Emergency Workflow

```
Emergency Button

↓

Live Location

↓

Nearby Hospitals

↓

Hospital Selection

↓

Emergency Alert

↓

Hospital Prepared
```

---

# 💡 Innovation

Unlike traditional appointment booking systems, MediQ integrates:

- Emergency Assistance
- Live GPS Navigation
- Nearby Hospital Discovery
- Online Payments
- Smart Notifications

into a single healthcare platform.

---

# 📸 Screenshots

Add screenshots here

- Home Page
- Login
- Doctor List
- Hospital Search
- Appointment
- Payment
- Emergency Screen

---

# ⚙ Installation

Clone Repository

```bash
git clone https://github.com/yourusername/MediQ.git
```

Install Dependencies

```bash
npm install
```

Run Development Server

```bash
npm run dev
```

Build Project

```bash
npm run build
```

---

# 🌍 Environment Variables

Create

```
.env
```

```
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=

VITE_RAZORPAY_KEY=

VITE_OPENSTREETMAP_API=
```

---

# 👨‍💻 Author

**Santhosh Murugan**

Computer Science Engineering

India

---

# 📄 License

This project is developed for educational purposes as a Final Year Engineering Project.

---

# ⭐ Support

If you like this project,

⭐ Star this repository

Fork the project

Create Pull Requests

Share Feedback

---

# ❤️ MediQ

Making Healthcare Smarter, Faster and More Accessible.
