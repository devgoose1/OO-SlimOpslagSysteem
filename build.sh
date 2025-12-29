#!/bin/bash

# Install all dependencies in all subdirectories
echo "Installing root dependencies..."
npm install

echo "Installing backend dependencies..."
cd project/backend && npm install && cd ../..

echo "Installing chatbot dependencies..."
cd project/chatbot && npm install && cd ../..

echo "Installing frontend dependencies..."
cd project/frontend && npm install && cd ../..

echo "All dependencies installed!"
