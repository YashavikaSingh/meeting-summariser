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
  Card,
  CardContent,
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
import Grid from '@mui/material/Grid'
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
import ErrorIcon from '@mui/icons-material/Error'

// Define interfaces for meeting data
interface Meeting {
  meeting_id: string;
  metadata: {
    meeting_name: string;
    attendees: string[];
    meeting_date: string;
    summary?: string;
    timestamp: string;
  };
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
      
      // Update state with meeting data
      setMeetingName(data.meeting_name || '');
      setTranscript(data.transcript || '');
      setSummary(data.summary || '');
      setMeetingId(data.meeting_id);
      
      // Set emails from attendees
      if (data.attendees && Array.isArray(data.attendees)) {
        setEmails(data.attendees.join(', '));
      }
      
      // Move to the review step
      setActiveStep(2);
      setProcessingComplete(true);
      setTabValue(0);
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

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Card elevation={3} sx={{ mt: 3, borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <EmailIcon color="primary" sx={{ fontSize: 30, mr: 2 }} />
                <Typography variant="h5">Meeting Information</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <TextField
                label="Meeting Name"
                placeholder="Enter the name of the meeting"
                fullWidth
                margin="normal"
                value={meetingName}
                onChange={e => setMeetingName(e.target.value)}
                error={meetingName.length === 0}
                helperText={meetingName.length === 0 ? "Meeting name is required" : ""}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              <TextField
                label="Recipient Emails"
                placeholder="Enter comma-separated emails (e.g., user@example.com, user2@example.com)"
                fullWidth
                margin="normal"
                value={emails}
                onChange={e => setEmails(e.target.value)}
                error={emails.length > 0 && !validateEmails(emails)}
                helperText={emails.length > 0 && !validateEmails(emails) ? "Please enter valid email addresses separated by commas" : ""}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
              <Box display="flex" justifyContent="flex-end">
                <Button 
                  variant="contained" 
                  onClick={handleNext}
                  disabled={!validateEmails(emails) || meetingName.length === 0}
                  endIcon={<SendIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Continue
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Card elevation={3} sx={{ mt: 3, borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <UploadFileIcon color="primary" sx={{ fontSize: 30, mr: 2 }} />
                <Typography variant="h5">Upload Meeting Transcript</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <FileUpload onFileUpload={handleFileSelect} />
              <Box display="flex" justifyContent="space-between" mt={3}>
                <Button 
                  onClick={handleBack}
                  sx={{ borderRadius: 2 }}
                >
                  Back
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card elevation={3} sx={{ mt: 3, borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <SummarizeIcon color="primary" sx={{ fontSize: 30, mr: 2 }} />
                <Typography variant="h5">Meeting Summary</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              {loading ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {error ? (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  ) : (
                    <>
                      {!processingComplete && !summary ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body1" color="text.secondary" gutterBottom>
                            Use the "Generate Summary" button below to process your transcript.
                          </Typography>
                        </Box>
                      ) : (
                        <>
                          <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange} 
                            aria-label="summary tabs"
                            centered
                            variant="fullWidth"
                            sx={{
                              mb: 3,
                              '& .MuiTab-root': {
                                minWidth: 120,
                                fontWeight: 600,
                                py: 2,
                              },
                              '& .Mui-selected': {
                                backgroundColor: 'rgba(57, 73, 171, 0.08)',
                                borderRadius: '8px 8px 0 0',
                              },
                              borderBottom: 1,
                              borderColor: 'divider'
                            }}
                          >
                            <Tab 
                              icon={<SummarizeIcon />} 
                              label="Summary" 
                              iconPosition="start"
                            />
                            <Tab 
                              icon={<ChatIcon />} 
                              label="Chat with AI" 
                              iconPosition="start"
                            />
                          </Tabs>
                          <TabPanel value={tabValue} index={0}>
                            <SummaryDisplay summary={summary} />
                          </TabPanel>
                          <TabPanel value={tabValue} index={1}>
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle1" color="text.secondary">
                                Ask questions about the original meeting transcript to get more details or clarification.
                              </Typography>
                            </Box>
                            <AIChatInterface transcript={transcript} />
                          </TabPanel>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
              <Box display="flex" justifyContent="space-between" mt={3}>
                <Button 
                  onClick={handleBack}
                  sx={{ borderRadius: 2 }}
                >
                  Back
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {(!processingComplete || !summary) && (
                    <Button 
                      variant="contained" 
                      onClick={processFile}
                      disabled={loading}
                      sx={{ borderRadius: 2 }}
                    >
                      Generate Summary
                    </Button>
                  )}
                  {processingComplete && summary && (
                    <Button 
                      variant="contained" 
                      color="secondary"
                      onClick={sendSummaryEmail}
                      disabled={sendingEmail}
                      startIcon={sendingEmail ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                      sx={{ borderRadius: 2 }}
                    >
                      {sendingEmail ? 'Sending...' : 'Email Summary'}
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            borderRadius: 3, 
            background: 'linear-gradient(45deg, #7986CB, #3949AB)',
            mb: 4
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            align="center"
            sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              fontSize: isMobile ? '2rem' : '3rem'
            }}
          >
            AI Meeting Summarizer
          </Typography>
          <Typography 
            variant="subtitle1" 
            align="center" 
            sx={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Transform your meeting transcripts into concise, actionable summaries
          </Typography>
        </Paper>

        <Grid container spacing={4}>
          <Grid sx={{ gridColumn: '1 / span 8' }}>
            <Stepper 
              activeStep={activeStep} 
              alternativeLabel={!isMobile}
              orientation={isMobile ? 'vertical' : 'horizontal'}
              sx={{ mb: 4 }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {renderStepContent(activeStep)}
          </Grid>
          
          <Grid sx={{ gridColumn: '9 / span 4' }}>
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <HistoryIcon color="primary" sx={{ fontSize: 24, mr: 1 }} />
                  <Typography variant="h6">Past Meetings</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {loadingPastMeetings ? (
                  <Box display="flex" justifyContent="center" my={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : pastMeetings.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No past meetings found
                  </Typography>
                ) : (
                  <List dense>
                    {pastMeetings.map((meeting) => (
                      <ListItem 
                        key={meeting.meeting_id}
                        onClick={() => loadPastMeeting(meeting.meeting_id)}
                        sx={{ 
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': { 
                            bgcolor: 'rgba(0, 0, 0, 0.04)'
                          },
                          cursor: 'pointer'
                        }}
                      >
                        <ListItemText 
                          primary={meeting.metadata.meeting_name} 
                          secondary={new Date(meeting.metadata.timestamp).toLocaleDateString()}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={(e) => deleteMeeting(meeting.meeting_id, e)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                
                <Box mt={2}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    size="small"
                    onClick={() => {
                      resetState();
                      fetchPastMeetings();
                    }}
                  >
                    New Meeting
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  )
}

export default App
