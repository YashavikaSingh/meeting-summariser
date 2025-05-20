import { useState, useEffect, useRef } from 'react'
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Alert,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Button,
  Divider,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material'
import FileUpload from './components/FileUpload'
import SummaryDisplay from './components/SummaryDisplay'
import AIChatInterface from './components/AIChatInterface'
import EmailIcon from '@mui/icons-material/Email'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SummarizeIcon from '@mui/icons-material/Summarize'
import ChatIcon from '@mui/icons-material/Chat'
import SendIcon from '@mui/icons-material/Send'
import HistoryIcon from '@mui/icons-material/History'
import DeleteIcon from '@mui/icons-material/Delete'
import GroupIcon from '@mui/icons-material/Group'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

// Define interfaces for meeting data
interface Meeting {
  meeting_id: string;
  id?: string; // Alternative ID field
  metadata: {
    meeting_name: string;
    name?: string; // Alternative name field
    attendees: string[];
    meeting_date: string;
    date?: string; // Alternative date field
    summary?: string;
    transcript: string;
    timestamp: string;
  };
  score?: number;
  has_summary?: boolean; // Flag indicating if summary exists
  has_enhanced_data?: boolean; // Flag indicating if enhanced data exists
  
  // Direct properties (added for new API format)
  name?: string;
  date?: string;
  attendees?: string[];
}

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [summary, setSummary] = useState<string>('')
  const [transcript, setTranscript] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [sendingEmail, setSendingEmail] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [emails, setEmails] = useState<string>('')
  const [activeStep, setActiveStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [processingComplete, setProcessingComplete] = useState(false)
  const [meetingName, setMeetingName] = useState<string>('')
  const [meetingId, setMeetingId] = useState<string>('')
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([])
  const [loadingPastMeetings, setLoadingPastMeetings] = useState<boolean>(false)
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const hasProcessed = useRef(false)

  const steps = ['Recipient Information', 'Upload Transcript', 'Review Summary']

  useEffect(() => {
    // Load past meetings on component mount
    fetchPastMeetings();
  }, []);

  useEffect(() => {
    if (
      selectedFile &&
      validateEmails(emails) &&
      meetingName &&
      !processingComplete &&
      !loading &&
      !hasProcessed.current
    ) {
      hasProcessed.current = true;
      processFile();
    }
    // Reset flag if any dependency changes
    if (!selectedFile || !validateEmails(emails) || !meetingName) {
      hasProcessed.current = false;
    }
  }, [selectedFile, emails, meetingName]);

  const fetchPastMeetings = async () => {
    setLoadingPastMeetings(true);
    try {
      console.log("Fetching meetings...");
      
      // Add cache-busting query parameter with timestamp
      const timestamp = new Date().getTime();
      const url = `http://localhost:3000/api/meetings?_=${timestamp}`;
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch meetings failed:", response.status, errorText);
        throw new Error(`Failed to fetch meetings: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Fetched meetings data:", data);
      
      // Check if meetings data has the expected structure
      if (!data.meetings) {
        console.error("Invalid meetings data format:", data);
        throw new Error("Invalid meetings data format");
      }
      
      // Process meeting data to ensure all fields are available
      const processedMeetings = data.meetings.map((meeting: any) => {
        // Check if meeting ID is valid
        const id = meeting.meeting_id || meeting.id;
        if (!id || id === 'undefined' || id === 'null') {
          console.warn("Meeting with invalid ID found, skipping:", meeting);
          return null;
        }
        
        // Ensure metadata is present
        const metadata = meeting.metadata || {};
        
        // Provide fallback values for required fields
        return {
          meeting_id: id,
          metadata: {
            meeting_name: metadata.meeting_name || metadata.name || `Meeting ${id.slice(0, 8)}`,
            attendees: metadata.attendees || [],
            meeting_date: metadata.meeting_date || metadata.date || 'Unknown date',
            summary: metadata.summary || '',
            transcript: metadata.transcript || '',
            timestamp: metadata.timestamp || new Date().toISOString()
          },
          has_summary: metadata.summary && metadata.summary.length > 0,
          score: meeting.score
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log("Processed meetings:", processedMeetings);
      setPastMeetings(processedMeetings);
    } catch (err) {
      console.error('Error fetching past meetings:', err);
      setError('Failed to fetch meetings. Please try again.');
    } finally {
      setLoadingPastMeetings(false);
    }
  };

  const loadPastMeeting = async (meetingId: string) => {
    if (!meetingId || meetingId === 'undefined' || meetingId === 'null') {
      setError('Invalid meeting ID');
      return;
    }
    
    setLoading(true);
    setError('');
    console.log("Loading meeting with ID:", meetingId);
    
    try {
      const response = await fetch(`http://localhost:3000/api/meetings/${meetingId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to load meeting:", response.status, errorText);
        throw new Error(`Failed to load meeting: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Loaded meeting data:", data);
      
      if (data.status === 'error') {
        throw new Error(data.message || 'Unknown error loading meeting');
      }
      
      // Get the meeting object from the response
      const meeting = data.meeting || {};
      
      // Set meeting name, defaulting to "Untitled Meeting" if not available
      const name = meeting.meeting_name || meeting.name || 'Untitled Meeting';
      setMeetingName(name);
      
      setTranscript(meeting.transcript || '');
      setSummary(meeting.summary || '');
      setMeetingId(meetingId);
      
      // Handle attendees
      if (meeting.attendees && Array.isArray(meeting.attendees)) {
        setEmails(meeting.attendees.join(', '));
      } else {
        setEmails('');
      }
      
      setActiveStep(2);
      setProcessingComplete(true);
      setTabValue(0);
    } catch (err) {
      console.error("Error loading meeting:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = async (deletedMeetingId: string, event: React.MouseEvent) => {
    // Don't attempt to delete if ID is invalid
    if (!deletedMeetingId || deletedMeetingId === 'undefined' || deletedMeetingId === 'null') {
      console.error("Cannot delete meeting with invalid ID:", deletedMeetingId);
      setError('Cannot delete meeting with invalid ID');
      alert('Cannot delete meeting with invalid ID');
      return;
    }
    
    event.stopPropagation();
    event.preventDefault(); // Prevent any parent click events
    console.log("Deleting meeting with ID:", deletedMeetingId);
    
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Add a timeout to ensure we don't get stuck waiting for a response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      console.log(`Sending DELETE request to: http://localhost:3000/api/meetings/${deletedMeetingId}`);
      
      // Make the delete request
      const response = await fetch(`http://localhost:3000/api/meetings/${deletedMeetingId}`, {
        method: 'DELETE',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add cache-busting query parameter
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log("Delete response status:", response.status);
      
      // Log the raw response for debugging
      const responseText = await response.text();
      console.log("Raw response text:", responseText);
      
      let responseData;
      
      try {
        // Try to parse the text as JSON
        responseData = responseText ? JSON.parse(responseText) : { status: response.ok ? "success" : "error" };
      } catch (e) {
        console.warn("Could not parse response as JSON:", e);
        responseData = { status: response.ok ? "success" : "error", message: responseText };
      }
      
      console.log("Delete API response data:", responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || responseData.detail || `Error deleting meeting: ${response.status}`);
      }
      
      // Show success message
      alert('Meeting deleted successfully');
      
      // Force clean out this meeting from the local state immediately
      setPastMeetings(prevMeetings => prevMeetings.filter(meeting => 
        meeting.meeting_id !== deletedMeetingId && meeting.id !== deletedMeetingId
      ));
      
      // If the deleted meeting is currently loaded, reset the state
      if (deletedMeetingId === meetingId) {
        resetState();
      }
      
      // Add a small delay before fetching the updated list
      setTimeout(async () => {
        // Refresh the meetings list with cache-busting
        await fetchPastMeetings();
      }, 500);
      
    } catch (err) {
      console.error("Error deleting meeting:", err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred deleting the meeting';
      setError(errorMessage);
      alert(`Failed to delete meeting: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSummary('');
    setTranscript('');
    setMeetingName('');
    setMeetingId('');
    setEmails('');
    setSelectedFile(null);
    setProcessingComplete(false);
    setActiveStep(0);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    handleNext();
    // Automatically call processFile if all required fields are filled
    if (validateEmails(emails) && meetingName) {
      processFile();
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const processFile = async () => {
    if (!selectedFile) return
    
    setLoading(true)
    setError('')
    setSummary('')
    setTranscript('')
    setProcessingComplete(false)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('emails', emails)
      formData.append('meeting_name', meetingName)

      const response = await fetch('http://localhost:3000/api/summarize', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to get summary:", response.status, errorText);
        throw new Error(`Failed to get summary: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Received summary data:", data);
      
      const cleanedSummary = cleanMarkdownFromSummary(data.summary || '')
      setSummary(cleanedSummary)
      setTranscript(data.transcript || '')
      setMeetingId(data.meeting_id || '')
      
      setTabValue(0)
      setProcessingComplete(true)
      if (activeStep !== 2) {
        handleNext();
      }
      
      // Refresh the meetings list
      fetchPastMeetings();
    } catch (err) {
      console.error("Process file error:", err);
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const sendSummaryEmail = async () => {
    setSendingEmail(true)
    setError('')
    
    try {
      console.log("Sending summary email to:", emails);
      const payload = {
        summary: summary,
        emails: emails,
        meeting_id: meetingId
      };
      console.log("Email payload:", payload);
      
      const response = await fetch('http://localhost:3000/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send email:", response.status, errorText);
        throw new Error(`Failed to send email: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);
      alert('Summary email sent successfully!')
    } catch (err) {
      console.error("Error sending email:", err);
      setError(err instanceof Error ? err.message : 'An error occurred sending the email')
    } finally {
      setSendingEmail(false)
    }
  }

  const cleanMarkdownFromSummary = (text: string): string => {
    if (!text) return '';
    
    let cleanedText = text.replace(/\*([^*]+)\*/g, '$1');
    cleanedText = cleanedText.replace(/^#+\s+/gm, '');
    
    return cleanedText;
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateEmails = (emailString: string) => {
    if (!emailString) return false
    
    const emailArray = emailString.split(',').map(email => email.trim())
    return emailArray.every(email => isValidEmail(email))
  }

  const updateAttendees = async (newEmails: string) => {
    if (!meetingId || !validateEmails(newEmails)) return;
    
    try {
      const attendeesList = newEmails.split(',').map(email => email.trim()).filter(email => email.length > 0);
      
      const response = await fetch(`http://localhost:3000/api/meetings/${meetingId}/attendees`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: attendeesList
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update attendees');
      }
      
      // Success, quietly save
    } catch (err) {
      console.error('Error updating attendees:', err);
      // Don't show error to user for this operation
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Enter email addresses of meeting participants
            </Typography>
            <TextField
              fullWidth
              label="Email Addresses"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter email addresses separated by commas"
              multiline
              rows={2}
              variant="outlined"
              error={!validateEmails(emails) && emails.length > 0}
              helperText={!validateEmails(emails) && emails.length > 0 ? "Please enter valid email addresses separated by commas" : ""}
            />

            <TextField
              fullWidth
              label="Meeting Name"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder="Enter a name for this meeting"
              variant="outlined"
              margin="normal"
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <FileUpload onFileUpload={handleFileSelect} />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="summary tabs">
              <Tab 
                icon={<SummarizeIcon />} 
                label="Summary" 
                id="summary-tab"
                aria-controls="summary-panel"
              />
              <Tab 
                icon={<ChatIcon />} 
                label="Chat" 
                id="chat-tab"
                aria-controls="chat-panel"
              />
              <Tab 
                icon={<EmailIcon />} 
                label="Email" 
                id="email-tab"
                aria-controls="email-panel"
              />
            </Tabs>
            
            <TabPanel value={tabValue} index={0}>
              <SummaryDisplay summary={summary} />
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <AIChatInterface transcript={transcript} />
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Send summary to meeting attendees
                </Typography>
                
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    <GroupIcon fontSize="small" sx={{ mr: 0.5, position: 'relative', top: '2px' }} />
                    Meeting Attendees
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    The following email addresses were extracted from the meeting data:
                  </Typography>
                  {emails ? emails.split(',').map((email, index) => (
                    <Chip 
                      key={index}
                      label={email.trim()}
                      size="small"
                      sx={{ m: 0.5 }}
                    />
                  )) : (
                    <Typography variant="body2" color="error">
                      No attendee emails found. Please add email addresses below.
                    </Typography>
                  )}
                </Box>
                
                <TextField
                  fullWidth
                  label="Recipients"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  onBlur={() => updateAttendees(emails)}
                  placeholder="Enter email addresses separated by commas"
                  multiline
                  rows={2}
                  margin="normal"
                  variant="outlined"
                  disabled={sendingEmail}
                  error={!validateEmails(emails) && emails.length > 0}
                  helperText={!validateEmails(emails) && emails.length > 0 ? "Please enter valid email addresses separated by commas" : "You can add or remove email addresses if needed"}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={sendSummaryEmail}
                  disabled={!validateEmails(emails) || sendingEmail || !summary}
                  startIcon={sendingEmail ? <CircularProgress size={20} /> : <SendIcon />}
                  sx={{ mt: 2 }}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </Box>
            </TabPanel>
          </Box>
        );
      default:
        return null;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Render the past meetings list
  const renderPastMeetings = () => {
    if (loadingPastMeetings) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!pastMeetings || pastMeetings.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No past meetings found.
          </Typography>
        </Box>
      );
    }

    console.log("Rendering meetings:", pastMeetings);

    return (
      <List>
        {pastMeetings.map((meeting) => {
          // Ensure meeting_id is valid and not undefined
          const meetingId = meeting.meeting_id || meeting.id;
          if (!meetingId || meetingId === 'undefined' || meetingId === 'null') {
            console.error("Invalid meeting ID:", meetingId);
            return null; // Skip rendering this meeting
          }
          
          // Check for direct name and date properties first (new API format)
          let meetingName = meeting.name;
          let meetingDate = meeting.date;
          let attendees = meeting.attendees;
          
          // Fall back to metadata if direct properties aren't available
          if (!meetingName && meeting.metadata) {
            meetingName = meeting.metadata.meeting_name || meeting.metadata.name;
          }
          
          if (!meetingDate && meeting.metadata) {
            meetingDate = meeting.metadata.meeting_date || meeting.metadata.date;
          }
          
          if (!attendees && meeting.metadata) {
            attendees = meeting.metadata.attendees;
          }
          
          // Final fallbacks
          if (!meetingName) {
            meetingName = `Meeting ${meetingId.slice(0, 8)}`;
          }
          
          if (!meetingDate) {
            meetingDate = 'Unknown date';
          }
          
          if (!attendees || !Array.isArray(attendees)) {
            attendees = [];
          }
          
          // Check if summary exists
          const hasSummary = (meeting.has_summary === true) || 
                             (meeting.metadata && meeting.metadata.summary && meeting.metadata.summary.length > 0);
          
          console.log(`Rendering meeting: ${meetingId} with name: ${meetingName}`);
          
          return (
            <ListItem 
              key={meetingId}
              component="div"
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                cursor: 'pointer'
              }}
              onClick={() => loadPastMeeting(meetingId)}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle1" component="span">
                      {meetingName}
                    </Typography>
                    {hasSummary && (
                      <Tooltip title="Has summary">
                        <CheckCircleIcon color="success" sx={{ ml: 1, fontSize: 18 }} />
                      </Tooltip>
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(meetingDate)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <GroupIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {attendees.length ? `${attendees.length} attendees` : 'No attendees'}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  onClick={(e) => deleteMeeting(meetingId, e)}
                  aria-label="delete"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          );
        }).filter(Boolean)} {/* Filter out null values from the map */}
      </List>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Meeting Summarizer
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Left sidebar with past meetings (on desktop) */}
        {!isMobile && (
          <Box sx={{ flex: '0 0 25%', minWidth: '250px' }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <HistoryIcon sx={{ mr: 1 }} /> Past Meetings
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {renderPastMeetings()}
            </Paper>
          </Box>
        )}
        
        {/* Main content area */}
        <Box sx={{ flex: '1 1 auto' }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
            {/* Mobile view tabs */}
            {isMobile && (
              <Tabs 
                value={activeStep === 2 ? 1 : 0} 
                onChange={(_, value) => value === 0 ? resetState() : null}
                sx={{ mb: 2 }}
              >
                <Tab 
                  icon={<UploadFileIcon />} 
                  label="New Meeting" 
                />
                <Tab 
                  icon={<HistoryIcon />} 
                  label="Past Meetings"
                  disabled={activeStep !== 2}
                />
              </Tabs>
            )}
            
            {/* Mobile past meetings view */}
            {isMobile && activeStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <HistoryIcon sx={{ mr: 1 }} /> Past Meetings
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {renderPastMeetings()}
              </Box>
            )}
            
            {/* Main workflow */}
            {(!isMobile || activeStep !== 2) && (
              <>
                <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 3 }}>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                {loading ? (
                  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      Processing your meeting transcript...
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {renderStepContent(activeStep)}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                      <Button
                        color="inherit"
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        sx={{ mr: 1 }}
                      >
                        Back
                      </Button>
                      <Box>
                        {activeStep === 0 && (
                          <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={!validateEmails(emails) && emails.length > 0 || !meetingName}
                          >
                            Next
                          </Button>
                        )}
                        {activeStep === 1 && (
                          <Button
                            variant="contained"
                            onClick={processFile}
                            disabled={!selectedFile}
                          >
                            Process
                          </Button>
                        )}
                        {activeStep === 2 && (
                          <Button
                            variant="outlined"
                            onClick={resetState}
                            sx={{ mr: 1 }}
                          >
                            New Meeting
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
