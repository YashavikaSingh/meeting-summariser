#!/bin/bash
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 11:57:01
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 13:15:55
#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOL
# Google Gemini API key for summarization and embeddings
GOOGLE_API_KEY=your_google_api_key_here

# Pinecone API key for vector database
PINECONE_API_KEY=your_pinecone_api_key_here

# Gmail credentials for sending emails
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password_here
EOL
  echo ".env file created. Please edit it with your API keys and credentials."
else
  echo ".env file already exists."
fi

# Make sure Docker is running
echo "Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Build and start the containers
echo "Building and starting containers..."
docker-compose up -d --build

echo "Setup complete! The application is now running at http://localhost"
echo "To stop the application, run: docker-compose down" 