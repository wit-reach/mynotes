#!/bin/bash

echo "Setting up Notes App..."
echo ""

# Install root dependencies (concurrently)
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Seed database
echo ""
echo "Seeding database..."
cd backend
node seed.js
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To start the app:"
echo "  npm run dev          # Start both frontend and backend"
echo "  OR"
echo "  npm run dev:backend  # Start backend only (port 3001)"
echo "  npm run dev:frontend # Start frontend only (port 5173)"
echo ""
echo "Demo user credentials:"
echo "  Email: demo@local.test"
echo "  Password: demo123"
echo ""

