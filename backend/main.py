# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-19 21:47:02
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 11:21:53
from fastapi import FastAPI, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import os
import smtplib
from email.message import EmailMessage
import json
from pydantic import BaseModel

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
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Add 5174
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    transcript: str  # Changed from summary to transcript

@app.post("/api/summarize")
async def summarize_transcript(
    file: UploadFile,
    emails: str = Form(...)
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
        
        # Removed automatic email sending
        # Recipients emails are still collected but will be used when email endpoint is called
        
        return {"summary": summary, "transcript": transcript}  # Return both summary and transcript
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/send-email")
async def send_email(request: Request):
    try:
        body = await request.json()
        summary = body.get("summary")
        emails = body.get("emails")
        
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