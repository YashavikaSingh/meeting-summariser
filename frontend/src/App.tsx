import { useState, useEffect } from 'react'
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
  metadata: {
    meeting_name: string;
    attendees: string[];
    meeting_date: string;
    summary?: string;
    transcript: string;
    timestamp: string;
  };
  score?: number;
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

  const steps = ['Recipient Information', 'Upload Transcript', 'Review Summary']

  useEffect(() => {
    // Load past meetings on component mount
    fetchPastMeetings();
  }, []);

  const fetchPastMeetings = async () => {
    setLoadingPastMeetings(true);
    try {
      const response = await fetch('http://localhost:3000/api/meetings');
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      const data = await response.json();
      setPastMeetings(data.meetings || []);
    } catch (err) {
      console.error('Error fetching past meetings:', err);
      setError('Failed to fetch meetings. Please try again.');
    } finally {
      setLoadingPastMeetings(false);
    }
  };

  const loadPastMeeting = async (meetingId: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`http://localhost:3000/api/meetings/${meetingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load meeting');
      }

      const data = await response.json();
      
      if (data && data.metadata) {
        // Update state with meeting data from vector database
        setMeetingName(data.metadata.meeting_name || '');
        setTranscript(data.metadata.transcript || '');
        setSummary(data.metadata.summary || '');
        setMeetingId(meetingId);
        
        // Set emails from attendees - attendees should be an array of email addresses in the vector DB
        if (data.metadata.attendees && Array.isArray(data.metadata.attendees)) {
          setEmails(data.metadata.attendees.join(', '));
        }
        
        // Move to the review step
        setActiveStep(2);
        setProcessingComplete(true);
        setTabValue(0);
      } else {
        throw new Error('Invalid meeting data structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = async (deletedMeetingId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/api/meetings/${deletedMeetingId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }
      
      // Refresh the meetings list
      fetchPastMeetings();
      
      // If the deleted meeting is currently loaded, reset the state
      if (deletedMeetingId === meetingId) {
        resetState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred deleting the meeting');
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
    setSelectedFile(file)
    handleNext()
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
        throw new Error('Failed to get summary')
      }

      const data = await response.json()
      
      const cleanedSummary = cleanMarkdownFromSummary(data.summary)
      setSummary(cleanedSummary)
      setTranscript(data.transcript)
      setMeetingId(data.meeting_id)
      
      setTabValue(0)
      setProcessingComplete(true)
      if (activeStep !== 2) {
        handleNext();
      }
      
      // Refresh the meetings list
      fetchPastMeetings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const sendSummaryEmail = async () => {
    setSendingEmail(true)
    setError('')
    
    try {
      const response = await fetch('http://localhost:3000/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: summary,
          emails: emails,
          meeting_id: meetingId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      alert('Summary email sent successfully!')
    } catch (err) {
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

    if (pastMeetings.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No past meetings found.
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {pastMeetings.map((meeting) => (
          <ListItem 
            key={meeting.meeting_id}
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
            onClick={() => loadPastMeeting(meeting.meeting_id)}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="subtitle1" component="span">
                    {meeting.metadata.meeting_name || 'Untitled Meeting'}
                  </Typography>
                  {meeting.metadata.summary && (
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
                      {formatDate(meeting.metadata.meeting_date)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <GroupIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {meeting.metadata.attendees ? 
                        `${meeting.metadata.attendees.length} attendees` : 
                        'No attendees'}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                onClick={(e) => deleteMeeting(meeting.meeting_id, e)}
                aria-label="delete"
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
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
