#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-21 09:45:05

import os
import threading
import time
from dotenv import load_dotenv
from api import app
from process_transcripts import process_all_meetings
from vector_db import DEFAULT_NAMESPACE

# Load environment variables
load_dotenv()

def background_processing():
    """
    Background thread to process meeting transcripts.
    """
    print("Starting background processing of meeting transcripts...")
    
    # Initial delay to allow the server to start
    time.sleep(5)
    
    # Process all meetings at startup
    process_all_meetings(DEFAULT_NAMESPACE)
    
    # Schedule periodic processing if needed
    # For future enhancement: add scheduled reprocessing of meetings
    # This could be useful for meetings that didn't have summaries generated
    # or if the model is updated

if __name__ == "__main__":
    # Start background processing thread
    processing_thread = threading.Thread(target=background_processing)
    processing_thread.daemon = True  # Daemon thread will exit when main thread exits
    processing_thread.start()
    
    # Start Flask API server
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting API server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True) 