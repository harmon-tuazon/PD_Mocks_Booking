# Mock Exam Booking System - Project Overview

## Purpose
A full-stack web application for booking mock exams at PrepDoctors, integrating with HubSpot CRM as the single source of truth. The system allows students to view available mock exam sessions, validate their credits, and book sessions with capacity management.

## Tech Stack
### Backend
- **Platform**: Vercel Serverless Functions
- **Language**: Node.js (JavaScript)
- **API Framework**: Native Vercel API routes
- **CRM Integration**: HubSpot API
- **Validation**: Joi schemas
- **CORS**: Custom CORS middleware

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Build Tool**: Vite

nt

## Key Components
- **API Endpoints**: 4 main endpoints for exam availability, credit validation, and booking management
- **HubSpot Service Layer**: Centralized CRM operations with rate limiting
- **React Components**: Modular UI components with custom hooks
- **Validation Layer**: Comprehensive input validation using Joi

## Current Deployment
- Backend: https://mocksbooking-g9xsi85i4-prepdoctors.vercel.app
- Frontend: https://frontend-ju3hjdp0r-prepdoctors.vercel.app