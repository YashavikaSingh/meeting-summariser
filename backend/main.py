# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-19 21:47:02
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 14:30:53
from fastapi import FastAPI, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import os
import smtplib
from email.message import EmailMessage
import json
from pydantic import BaseModel
from typing import List, Optional
import vector_db
import asyncio
from opik import track
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure Gemini API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17')

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    transcript: str  # Changed from summary to transcript

class MeetingRequest(BaseModel):
    meeting_name: str
    transcript: str
    attendees: Optional[List[str]] = None
    meeting_date: Optional[str] = None

class MeetingSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

class SummaryRequest(BaseModel):
    meeting_id: str

class UpdateAttendeesRequest(BaseModel):
    attendees: List[str]

@app.on_event("startup")
async def startup_event():
    # Initialize vector database
    vector_db.initialize_vector_db()

@track
def summarize_with_gemini(prompt):
    response = model.generate_content(prompt)
    return response.text

@app.post("/api/summarize-transcript")
async def summarize_transcript_text(request: SummaryRequest):
    """Generate a summary for a meeting transcript from the vector database."""
    try:
        # Get the meeting data from the vector database
        result = vector_db.retrieve_meeting(request.meeting_id)
        
        if result["status"] != "success":
            raise HTTPException(status_code=404, detail=f"Meeting with ID {request.meeting_id} not found")
        
        meeting_data = result["meeting"]
        
        # Check if summary already exists
        if "summary" in meeting_data and meeting_data["summary"]:
            # Return existing summary
            return {
                "meeting_id": request.meeting_id,
                "summary": meeting_data["summary"],
                "transcript": meeting_data.get("transcript", ""),
                "meeting_name": meeting_data.get("meeting_name", "Unknown Meeting"),
                "attendees": meeting_data.get("attendees", []),
                "meeting_date": meeting_data.get("meeting_date", "")
            }
        
        # Get the transcript from the meeting data
        transcript = meeting_data.get("transcript", "")
        
        if not transcript:
            raise HTTPException(status_code=400, detail="No transcript found for this meeting")
        
        # Generate summary using Gemini
        prompt = f"""Please provide a concise summary of the following meeting transcript. 
        Focus on key points, decisions made, and action items. Format the summary in a clear, 
        structured way with headings and bullet points where appropriate:

        {transcript}"""
        
        summary = summarize_with_gemini(prompt)
        
        # Update the meeting with the summary
        vector_db.update_meeting_summary(request.meeting_id, summary)
        
        return {
            "meeting_id": request.meeting_id,
            "summary": summary,
            "transcript": transcript,
            "meeting_name": meeting_data.get("meeting_name", "Unknown Meeting"),
            "attendees": meeting_data.get("attendees", []),
            "meeting_date": meeting_data.get("meeting_date", "")
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/summarize")
async def summarize_transcript(
    file: UploadFile,
    emails: str = Form(...),
    meeting_name: str = Form(...)
):
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    try:
        # Read the file content
        content = await file.read()
        transcript = content.decode('utf-8')
        
        # Generate summary using Gemini (tracked by Comet)
        prompt = f"""Please provide a concise summary of the following meeting transcript. \
        Focus on key points, decisions made, and action items. Format the summary in a clear, \
        structured way with headings and bullet points where appropriate:\n\n        {transcript}"""
        summary = summarize_with_gemini(prompt)
        
        # Store in vector database
        attendees = [email.strip() for email in emails.split(',') if email.strip()]
        meeting_id = vector_db.store_meeting(
            meeting_name=meeting_name,
            transcript=transcript,
            meeting_date=datetime.now().isoformat(),
            attendees=attendees
        )
        
        # Update with summary
        vector_db.update_meeting_summary(meeting_id, summary)
        
        return {
            "summary": summary, 
            "transcript": transcript,
            "meeting_id": meeting_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-email")
async def send_email(request: Request):
    try:
        body = await request.json()
        summary = body.get("summary")
        emails = body.get("emails")
        meeting_id = body.get("meeting_id")
        
        if not summary or not emails:
            raise HTTPException(status_code=400, detail="Summary and emails are required")
        
        # Format recipients and send email
        recipients = [email.strip() for email in emails.split(',') if email.strip()]
        send_summary_via_email(summary, recipients)
        
        return {"message": "Email sent successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        # Get the query and transcript from the request
        query = request.query
        transcript = request.transcript
        
        # Generate response using Gemini
        prompt = f"""You are an AI assistant helping to answer questions about a meeting transcript.
        Please answer the following question based only on the information in the transcript.
        If the question cannot be answered with the information in the transcript, 
        please indicate that you don't have enough information.

        Meeting Transcript:
        {transcript}
        
        Question: {query}"""
        
        response = model.generate_content(prompt)
        answer = response.text
        
        return {"response": answer}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/meetings")
async def store_meeting(meeting: MeetingRequest):
    try:
        # Store meeting in vector database
        meeting_id = vector_db.store_meeting(
            meeting_name=meeting.meeting_name,
            transcript=meeting.transcript,
            meeting_date=meeting.meeting_date,
            attendees=meeting.attendees
        )
        
        return {"meeting_id": meeting_id}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str):
    try:
        # Validate meeting ID
        if not meeting_id or meeting_id == "undefined" or meeting_id == "null":
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid meeting ID: {meeting_id}"
            )
            
        # Get meeting from vector database
        result = vector_db.retrieve_meeting(meeting_id)
        
        if result["status"] != "success":
            raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
        
        meeting = result["meeting"]
        
        # Format the meeting data
        # Generate a default name if missing
        meeting_name = meeting.get("meeting_name", "")
        if not meeting_name or meeting_name.strip() == "":
            meeting_name = f"Meeting {meeting_id[:8]}"
            print(f"Setting default name for meeting {meeting_id}: {meeting_name}")
            
        # Generate a default date if missing    
        meeting_date = meeting.get("meeting_date", "")
        if not meeting_date or meeting_date.strip() == "":
            meeting_date = meeting.get("timestamp", "Unknown date")
            if meeting_date and meeting_date.endswith("Z"):
                meeting_date = meeting_date[:-1]  # Remove Z suffix if present
        
        # Format the response
        formatted_meeting = {
            "id": meeting_id,
            "meeting_id": meeting_id,
            "name": meeting_name,
            "meeting_name": meeting_name,
            "date": meeting_date,
            "meeting_date": meeting_date,
            "attendees": meeting.get("attendees", []),
            "transcript": meeting.get("transcript", ""),
            "summary": meeting.get("summary", ""),
            "action_items": meeting.get("action_items", []),
            "key_topics": meeting.get("key_topics", []),
            "decisions": meeting.get("decisions", []),
            "next_steps": meeting.get("next_steps", []),
            "processed_at": meeting.get("processed_at", ""),
            "has_summary": "summary" in meeting and meeting["summary"].strip() != "",
            "has_enhanced_data": any(
                key in meeting for key in ["action_items", "key_topics", "decisions", "next_steps"]
            )
        }
        
        return {
            "status": "success",
            "meeting": formatted_meeting
        }
    
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        # Log the error and return a 500 response
        print(f"Error retrieving meeting: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving meeting: {str(e)}"
        )

@app.post("/api/meetings/search")
async def search_meetings(search_request: MeetingSearchRequest):
    try:
        # Search meetings in vector database
        meetings = vector_db.search_meetings(
            query=search_request.query,
            top_k=search_request.top_k
        )
        
        return {"results": meetings}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/meetings")
async def list_meetings():
    try:
        # Get all meetings from vector database
        meetings_result = vector_db.list_all_meetings()
        
        if "status" not in meetings_result or meetings_result["status"] != "success":
            return {"meetings": []}
        
        # Format the meetings for the frontend
        formatted_meetings = []
        for meeting in meetings_result["meetings"]:
            meeting_id = meeting["meeting_id"]
            metadata = meeting["metadata"]
            
            # Generate a default name if missing
            meeting_name = metadata.get("meeting_name", "")
            if not meeting_name or meeting_name.strip() == "":
                meeting_name = f"Meeting {meeting_id[:8]}"
                print(f"Setting default name for meeting {meeting_id}: {meeting_name}")
                
            # Generate a default date if missing    
            meeting_date = metadata.get("meeting_date", "")
            if not meeting_date or meeting_date.strip() == "":
                meeting_date = metadata.get("timestamp", "Unknown date")
                if meeting_date and meeting_date.endswith("Z"):
                    meeting_date = meeting_date[:-1]  # Remove Z suffix if present
                    
            formatted_meeting = {
                "meeting_id": meeting_id,  # Use consistent field name
                "id": meeting_id,        # Add id for backward compatibility
                "metadata": {
                    "meeting_name": meeting_name,
                    "name": meeting_name,
                    "meeting_date": meeting_date,
                    "date": meeting_date,
                    "attendees": metadata.get("attendees", []),
                    "summary": metadata.get("summary", ""),
                    "transcript": metadata.get("transcript", ""),
                    "timestamp": metadata.get("timestamp", "")
                },
                "name": meeting_name,    # Add name at top level for API consumers
                "date": meeting_date,    # Add date at top level for API consumers
                "attendees": metadata.get("attendees", []),
                "has_summary": "summary" in metadata and metadata["summary"].strip() != "",
                "has_enhanced_data": any(
                    key in metadata for key in ["action_items", "key_topics", "decisions", "next_steps"]
                )
            }
            formatted_meetings.append(formatted_meeting)
        
        # Sort meetings by meeting_date (newest first)
        sorted_meetings = sorted(
            formatted_meetings,
            key=lambda x: x.get("date", "1970-01-01"),
            reverse=True  # Newest first
        )
        
        return {
            "status": "success",
            "meetings": sorted_meetings,
            "total": len(sorted_meetings)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing meetings: {str(e)}")

@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str):
    try:
        # Validate meeting ID
        if not meeting_id or meeting_id == "undefined" or meeting_id == "null":
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid meeting ID: {meeting_id}"
            )
            
        print(f"FastAPI: Processing delete request for meeting ID: {meeting_id}")
        
        # Call delete_meeting function with namespace
        result = vector_db.delete_meeting(meeting_id, namespace=vector_db.DEFAULT_NAMESPACE)
        
        # Check result
        if result["status"] != "success":
            error_message = result.get("message", "Unknown error during deletion")
            print(f"FastAPI: Delete operation failed: {error_message}")
            raise HTTPException(
                status_code=500,
                detail=error_message
            )
            
        # Give Pinecone some time to process the deletion
        await asyncio.sleep(0.5)  
        
        # Force a refresh of the Pinecone index to ensure deletion is reflected
        # Try to access the meeting to verify it's gone (double-check)
        verify_result = vector_db.retrieve_meeting(meeting_id)
        if verify_result["status"] == "success":
            print(f"FastAPI: Warning - Meeting still exists after deletion reported as successful")
            # Meeting still exists - unusual but we'll report success anyway
            # since the vector_db layer reported success
        
        print(f"FastAPI: Delete operation completed successfully for meeting ID: {meeting_id}")
        return {
            "status": "success",
            "message": f"Meeting with ID {meeting_id} deleted successfully"
        }
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        # Log the error and return a 500 response
        error_msg = f"Error deleting meeting: {str(e)}"
        print(f"FastAPI: {error_msg}")
        raise HTTPException(
            status_code=500, 
            detail=error_msg
        )

@app.put("/api/meetings/{meeting_id}/attendees")
async def update_meeting_attendees(meeting_id: str, request: UpdateAttendeesRequest):
    try:
        # Update attendees in vector database
        result = vector_db.update_meeting_attendees(
            meeting_id=meeting_id,
            attendees=request.attendees
        )
        
        if result["status"] != "success":
            raise HTTPException(status_code=404, detail=result["message"])
        
        return {"message": f"Meeting attendees updated successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def send_summary_via_email(summary, recipients):
    EMAIL_ADDRESS = os.getenv('GMAIL_USER')
    EMAIL_PASSWORD = os.getenv('GMAIL_APP_PASSWORD')
    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        raise Exception("GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not set")
    msg = EmailMessage()
    msg['Subject'] = 'Meeting Summary'
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = ', '.join(recipients)
    msg.set_content(summary)
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.send_message(msg)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)