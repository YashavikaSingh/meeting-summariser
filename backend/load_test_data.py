#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 13:30:05
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 12:26:39

import os
import glob
import re
import json
from datetime import datetime
import uuid
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17')

def extract_meeting_info_from_transcript(transcript_text):
    """
    Extract meeting information from the transcript text.
    
    Returns:
        dict: Dictionary containing meeting name, date, and participants
    """
    info = {
        "meeting_name": "Unknown Meeting",
        "meeting_date": datetime.now().isoformat(),
        "attendees": []
    }
    
    # Extract meeting topic/name
    topic_match = re.search(r'Meeting Topic:\s*(.*?)(?:\n|$)', transcript_text)
    if topic_match:
        info["meeting_name"] = topic_match.group(1).strip()
    
    # Extract meeting date
    date_match = re.search(r'Meeting Date:\s*(.*?)(?:\n|$)', transcript_text)
    if date_match:
        date_str = date_match.group(1).strip()
        try:
            # Try to parse the date
            date_obj = datetime.strptime(date_str, "%B %d, %Y")
            info["meeting_date"] = date_obj.isoformat()
        except ValueError:
            # If parsing fails, keep the original string
            info["meeting_date"] = date_str
    
    # Extract participants and their emails
    participants_match = re.search(r'Participants:\s*(.*?)(?:\n|$)', transcript_text)
    if participants_match:
        participants_str = participants_match.group(1).strip()
        participants = participants_str.split(',')
        
        # Extract names and generate emails
        for participant in participants:
            name = participant.strip()
            
            # Extract just the name without titles or roles
            name_match = re.search(r'([\w\s]+)(?:\(.*\))?', name)
            if name_match:
                clean_name = name_match.group(1).strip()
                # Generate email from name
                email = clean_name.lower().replace(' ', '.') + '@example.com'
                info["attendees"].append(email)
    
    return info

def generate_summary(transcript):
    """Generate a summary of the transcript using Gemini."""
    prompt = f"""Please provide a concise summary of the following meeting transcript. 
    Focus on key points, decisions made, and action items. Format the summary in a clear, 
    structured way with headings and bullet points where appropriate:

    {transcript}"""
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Summary generation failed. Please try again later."

def main():
    """Extract meeting information from transcripts and save to JSON."""
    print("Processing test data...")
    
    # Get all text files in the testdata directory
    # First check if we should use the testdata in the current directory or go up one level
    if os.path.exists("../testdata"):
        test_files = glob.glob("../testdata/*.txt")
    else:
        test_files = glob.glob("testdata/*.txt")
    
    if not test_files:
        print("No test files found in the testdata directory.")
        return
    
    print(f"Found {len(test_files)} test files.")
    
    # Create a list to store processed meeting data
    meetings_data = []
    
    # Process each file
    for file_path in test_files:
        # Read the transcript
        with open(file_path, 'r') as file:
            transcript = file.read()
        
        # Extract meeting information from the transcript
        meeting_info = extract_meeting_info_from_transcript(transcript)
        meeting_name = meeting_info["meeting_name"]
        
        print(f"Processing {meeting_name}...")
        
        # Generate a unique ID for the meeting
        meeting_id = str(uuid.uuid4())
        
        # Generate summary
        print(f"Generating summary for {meeting_name}...")
        summary = generate_summary(transcript)
        
        # Create a record for this meeting
        meeting_record = {
            "meeting_id": meeting_id,
            "meeting_name": meeting_name,
            "transcript": transcript,
            "summary": summary,
            "timestamp": datetime.now().isoformat(),
            "attendees": meeting_info["attendees"],
            "meeting_date": meeting_info["meeting_date"]
        }
        
        meetings_data.append(meeting_record)
        
        print(f"Successfully processed {meeting_name} with ID {meeting_id}")
    
    # Save the processed data to a JSON file
    output_file = "processed_meetings.json"
    with open(output_file, 'w') as f:
        json.dump(meetings_data, f, indent=2)
    
    print(f"All test data processed and saved to {output_file}")

if __name__ == "__main__":
    main() 