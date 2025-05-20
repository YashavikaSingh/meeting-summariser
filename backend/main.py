from fastapi import FastAPI, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import os
import smtplib
from email.message import EmailMessage

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
        structured way:

        {transcript}"""
        
        response = model.generate_content(prompt)
        summary = response.text
        
        # Send summary via email
        recipients = [email.strip() for email in emails.split(',') if email.strip()]
        send_summary_via_email(summary, recipients)
        
        return {"summary": summary}
    
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