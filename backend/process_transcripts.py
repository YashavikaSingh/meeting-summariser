#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-21 09:10:05

import os
import json
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai
from vector_db import (
    list_all_meetings,
    retrieve_meeting,
    update_meeting_summary,
    connect_to_index,
    DEFAULT_NAMESPACE
)

# Load environment variables
load_dotenv()

# Initialize Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=GOOGLE_API_KEY)
llm_model = genai.GenerativeModel('gemini-1.5-pro')

def summarize_transcript(transcript, meeting_name, meeting_date, attendees):
    """
    Send transcript to LLM for summarization.
    Returns enhanced summary with additional structured information.
    
    Args:
        transcript (str): The meeting transcript
        meeting_name (str): Name of the meeting
        meeting_date (str): Date of the meeting
        attendees (list): List of attendees
        
    Returns:
        dict: Enhanced summary with structured data
    """
    # Prepare prompt for the LLM
    prompt = f"""
    You are a professional meeting summarizer. Your task is to analyze the following meeting transcript 
    and create a comprehensive summary with key sections:

    Meeting: {meeting_name}
    Date: {meeting_date}
    Attendees: {', '.join(attendees)}

    Transcript:
    {transcript}

    Please provide your response in JSON format with the following keys:
    - summary: A concise summary of the meeting (300 words max)
    - action_items: List of action items with assignee and deadline if mentioned
    - key_topics: List of main topics discussed
    - decisions: List of decisions made
    - next_steps: Any planned follow-up actions or meetings
    
    Make sure your output is valid JSON.
    """
    
    try:
        # Generate response
        response = llm_model.generate_content(prompt)
        
        # Parse the JSON from the response
        # Find the JSON content between triple backticks if present
        content = response.text
        
        # If JSON is in code block format, extract it
        if "```json" in content and "```" in content.split("```json", 1)[1]:
            json_content = content.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in content and "```" in content.split("```", 1)[1]:
            json_content = content.split("```", 1)[1].split("```", 1)[0].strip()
        else:
            json_content = content.strip()
        
        # Parse JSON response
        enhanced_summary = json.loads(json_content)
        
        # Add processing timestamp
        enhanced_summary["processed_at"] = datetime.now().isoformat()
        
        return enhanced_summary
    
    except Exception as e:
        print(f"Error generating summary: {e}")
        return {
            "summary": f"Error generating summary: {str(e)}",
            "action_items": [],
            "key_topics": [],
            "decisions": [],
            "next_steps": [],
            "processed_at": datetime.now().isoformat()
        }

def get_unsummarized_meetings(namespace=DEFAULT_NAMESPACE):
    """
    Get all meetings that don't have summaries or enhanced summary fields.
    
    Returns:
        list: List of meeting IDs that need summarization
    """
    result = list_all_meetings(namespace)
    
    if result["status"] != "success":
        print(f"Error fetching meetings: {result['message']}")
        return []
    
    meetings_to_process = []
    
    for meeting in result["meetings"]:
        metadata = meeting["metadata"]
        
        # Check if meeting needs processing (missing summary or enhanced fields)
        if "summary" not in metadata or not any(
            key in metadata for key in ["action_items", "key_topics", "decisions", "next_steps"]
        ):
            meetings_to_process.append(meeting["meeting_id"])
    
    return meetings_to_process

def process_meeting(meeting_id, namespace=DEFAULT_NAMESPACE):
    """
    Process a single meeting: fetch, summarize, and update in Pinecone.
    
    Args:
        meeting_id (str): ID of the meeting to process
        namespace (str): Pinecone namespace
        
    Returns:
        dict: Status of processing
    """
    # Retrieve meeting data
    result = retrieve_meeting(meeting_id, namespace)
    
    if result["status"] != "success":
        print(f"Error retrieving meeting {meeting_id}: {result['message']}")
        return {"status": "error", "message": result["message"]}
    
    meeting = result["meeting"]
    
    # Generate enhanced summary
    print(f"Summarizing meeting: {meeting['meeting_name']}")
    enhanced_summary = summarize_transcript(
        meeting["transcript"],
        meeting["meeting_name"],
        meeting["meeting_date"],
        meeting["attendees"]
    )
    
    # Update original meeting metadata with enhanced summary data
    for key, value in enhanced_summary.items():
        meeting[key] = value
    
    # Connect to the index
    index = connect_to_index()
    
    # Extract summary and additional fields
    summary = enhanced_summary.pop("summary")
    
    # Create embedding and update the meeting with summary and additional fields
    update_result = update_meeting_summary(
        meeting_id, 
        summary, 
        namespace, 
        additional_fields=enhanced_summary
    )
    
    if update_result["status"] != "success":
        print(f"Error updating meeting: {update_result['message']}")
        return update_result
    
    print(f"Successfully processed meeting: {meeting['meeting_name']}")
    return {"status": "success", "meeting_id": meeting_id}

def process_all_meetings(namespace=DEFAULT_NAMESPACE):
    """
    Process all meetings that need summarization.
    
    Args:
        namespace (str): Pinecone namespace
        
    Returns:
        dict: Processing results
    """
    # Get meetings needing summarization
    meetings_to_process = get_unsummarized_meetings(namespace)
    
    if not meetings_to_process:
        print("No meetings need processing.")
        return {"status": "success", "processed": 0, "total": 0}
    
    print(f"Found {len(meetings_to_process)} meetings to process")
    
    # Process each meeting
    processed = 0
    failed = 0
    results = []
    
    for meeting_id in meetings_to_process:
        result = process_meeting(meeting_id, namespace)
        results.append(result)
        
        if result["status"] == "success":
            processed += 1
        else:
            failed += 1
    
    print(f"Processing complete. Processed: {processed}, Failed: {failed}")
    
    return {
        "status": "success",
        "processed": processed,
        "failed": failed,
        "total": len(meetings_to_process),
        "results": results
    }

if __name__ == "__main__":
    print("Starting meeting transcript processing...")
    process_all_meetings() 