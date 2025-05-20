#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Date:   2025-05-27 11:00:00

import os
import json
import argparse
from dotenv import load_dotenv
from vector_db import (
    store_meeting,
    search_meetings,
    retrieve_meeting,
    DEFAULT_NAMESPACE
)
from process_transcripts import summarize_transcript

# Load environment variables
load_dotenv()

def upload_meeting_from_file(file_path, namespace=DEFAULT_NAMESPACE):
    """
    Upload a meeting transcript from a file.
    
    Args:
        file_path (str): Path to the transcript file
        namespace (str): Namespace to store in
    
    Returns:
        dict: Status and meeting ID
    """
    print(f"Reading transcript from {file_path}...")
    
    try:
        with open(file_path, 'r') as f:
            transcript = f.read()
        
        # Extract meeting name from file name
        meeting_name = os.path.basename(file_path).replace('.txt', '').replace('_', ' ').title()
        
        # Parse meeting metadata from the transcript
        meeting_date = None
        attendees = []
        
        lines = transcript.split('\n')
        for line in lines[:10]:  # Look at first 10 lines for metadata
            if "Meeting Date:" in line:
                meeting_date = line.split("Meeting Date:")[1].strip()
            elif "Participants:" in line:
                participants = line.split("Participants:")[1].strip()
                attendees = [email.strip() + "@example.com" for email in participants.split(',')]
        
        if not meeting_date:
            meeting_date = "2025-05-01T00:00:00"  # Default date if not found
        
        if not attendees:
            attendees = ["unknown@example.com"]  # Default attendee if not found
        
        print(f"Uploading meeting: {meeting_name}")
        print(f"Date: {meeting_date}")
        print(f"Attendees: {', '.join(attendees)}")
        
        # Store the meeting in Pinecone
        result = store_meeting(
            transcript=transcript,
            meeting_name=meeting_name,
            meeting_date=meeting_date,
            attendees=attendees,
            namespace=namespace
        )
        
        if result["status"] == "success":
            print(f"✅ Meeting uploaded successfully with ID: {result['meeting_id']}")
            return result["meeting_id"]
        else:
            print(f"❌ Failed to upload meeting: {result.get('message', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"❌ Error uploading meeting: {e}")
        return None

def process_meeting_summary(meeting_id, namespace=DEFAULT_NAMESPACE):
    """
    Generate an enhanced summary for a meeting.
    
    Args:
        meeting_id (str): Meeting ID to process
        namespace (str): Namespace of the meeting
    
    Returns:
        dict: Enhanced summary if successful
    """
    print(f"\nProcessing meeting {meeting_id}...")
    
    # Retrieve the meeting
    result = retrieve_meeting(meeting_id, namespace)
    
    if result["status"] != "success":
        print(f"❌ Failed to retrieve meeting: {result.get('message', 'Unknown error')}")
        return None
    
    meeting = result["meeting"]
    
    # Generate enhanced summary
    print("Generating enhanced summary with Gemini...")
    enhanced_summary = summarize_transcript(
        meeting["transcript"],
        meeting["meeting_name"],
        meeting["meeting_date"],
        meeting["attendees"]
    )
    
    print("✅ Summary generated successfully")
    
    # Print some summary information
    print("\n=== Meeting Summary ===")
    print(f"Meeting: {meeting['meeting_name']}")
    print(f"Date: {meeting['meeting_date']}")
    print(f"Attendees: {', '.join(meeting['attendees'])}")
    print("\nSummary:")
    print(enhanced_summary["summary"][:500] + "..." if len(enhanced_summary["summary"]) > 500 else enhanced_summary["summary"])
    
    print("\nAction Items:")
    for item in enhanced_summary["action_items"][:3]:
        print(f"- {item}")
    
    if len(enhanced_summary["action_items"]) > 3:
        print(f"... and {len(enhanced_summary['action_items']) - 3} more action items")
    
    print("\nKey Topics:")
    for topic in enhanced_summary["key_topics"][:3]:
        print(f"- {topic}")
    
    if len(enhanced_summary["key_topics"]) > 3:
        print(f"... and {len(enhanced_summary['key_topics']) - 3} more key topics")
    
    return enhanced_summary

def search_for_information(query, namespace=DEFAULT_NAMESPACE, top_k=3):
    """
    Search for information across meetings.
    
    Args:
        query (str): Search query
        namespace (str): Namespace to search in
        top_k (int): Number of results to return
    
    Returns:
        dict: Search results
    """
    print(f"\nSearching for: '{query}'")
    
    # Perform the search
    result = search_meetings(query, top_k, namespace)
    
    if result["status"] != "success":
        print(f"❌ Failed to search meetings: {result.get('message', 'Unknown error')}")
        return None
    
    # Print search results
    print(f"Found {len(result['meetings'])} relevant meetings:")
    
    for i, meeting in enumerate(result["meetings"]):
        print(f"\n{i+1}. {meeting['metadata']['meeting_name']} (Score: {meeting['score']:.2f})")
        print(f"   Date: {meeting['metadata']['meeting_date']}")
        
        # Print a snippet of the summary if available
        if "summary" in meeting["metadata"]:
            summary = meeting["metadata"]["summary"]
            print(f"   Summary: {summary[:200]}..." if len(summary) > 200 else f"   Summary: {summary}")
        
        # Print relevant topics if available
        if "key_topics" in meeting["metadata"]:
            topics = meeting["metadata"]["key_topics"]
            print(f"   Topics: {', '.join(topics[:3])}" + ("..." if len(topics) > 3 else ""))
    
    return result["meetings"]

def main():
    parser = argparse.ArgumentParser(description='RAG Meeting Summarizer Demo')
    parser.add_argument('--transcript', type=str, help='Path to a transcript file to upload')
    parser.add_argument('--meeting-id', type=str, help='Meeting ID to process')
    parser.add_argument('--search', type=str, help='Search query')
    parser.add_argument('--namespace', type=str, default=DEFAULT_NAMESPACE, help='Pinecone namespace')
    
    args = parser.parse_args()
    
    if not any([args.transcript, args.meeting_id, args.search]):
        parser.print_help()
        return
    
    # Upload a transcript if specified
    if args.transcript:
        meeting_id = upload_meeting_from_file(args.transcript, args.namespace)
        if meeting_id and not args.meeting_id:
            args.meeting_id = meeting_id  # Process the meeting we just uploaded
    
    # Process a meeting if specified
    if args.meeting_id:
        enhanced_summary = process_meeting_summary(args.meeting_id, args.namespace)
    
    # Search for information if specified
    if args.search:
        search_results = search_for_information(args.search, args.namespace)

if __name__ == "__main__":
    main() 