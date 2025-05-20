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

@app.on_event("startup")
async def startup_event():
    # Initialize vector database
    vector_db.initialize_vector_db()

@app.post("/api/summarize-transcript")
async def summarize_transcript_text(request: SummaryRequest):
    """Generate a summary for a meeting transcript from the vector database."""
    try:
        # Get the meeting data from the vector database
        meeting_data = vector_db.get_meeting(request.meeting_id)
        
        if not meeting_data:
            raise HTTPException(status_code=404, detail=f"Meeting with ID {request.meeting_id} not found")
        
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
        
        response = model.generate_content(prompt)
        summary = response.text
        
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
        
        # Generate summary using Gemini
        prompt = f"""Please provide a concise summary of the following meeting transcript. 
        Focus on key points, decisions made, and action items. Format the summary in a clear, 
        structured way with headings and bullet points where appropriate:

        {transcript}"""
        
        response = model.generate_content(prompt)
        summary = response.text
        
        # Store in vector database
        attendees = [email.strip() for email in emails.split(',') if email.strip()]
        meeting_id = vector_db.store_meeting(
            meeting_name=meeting_name,
            transcript=transcript,
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
            attendees=meeting.attendees,
            meeting_date=meeting.meeting_date
        )
        
        return {"meeting_id": meeting_id}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str):
    try:
        # Get meeting from vector database
        meeting = vector_db.get_meeting(meeting_id)
        
        if not meeting:
            raise HTTPException(status_code=404, detail=f"Meeting with ID {meeting_id} not found")
        
        return meeting
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        # List all meetings from vector database
        meetings = vector_db.list_all_meetings()
        
        # Format the response to include essential data for the dashboard
        formatted_meetings = []
        for meeting in meetings:
            meeting_data = meeting["metadata"]
            formatted_meetings.append({
                "meeting_id": meeting["meeting_id"],
                "meeting_name": meeting_data.get("meeting_name", "Unknown Meeting"),
                "meeting_date": meeting_data.get("meeting_date", ""),
                "attendees": meeting_data.get("attendees", []),
                "has_summary": "summary" in meeting_data and bool(meeting_data.get("summary")),
                "timestamp": meeting_data.get("timestamp", "")
            })
        
        return {"meetings": formatted_meetings}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str):
    try:
        # Delete meeting from vector database
        vector_db.delete_meeting(meeting_id)
        
        return {"message": f"Meeting with ID {meeting_id} deleted successfully"}
    
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