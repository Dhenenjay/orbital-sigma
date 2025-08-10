#!/bin/bash

# Deployment script for Orbital Sigma Frontend

echo "🚀 Starting Orbital Sigma Frontend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found!${NC}"
    echo "Please create .env.local from .env.example and configure your environment variables."
    exit 1
fi

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf .next
rm -rf out

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci

# Run build
echo -e "${YELLOW}Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Please check the errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Start production server
echo -e "${YELLOW}Starting production server...${NC}"
npm run start

echo -e "${GREEN}Deployment complete! Application is running on port 3000${NC}"
