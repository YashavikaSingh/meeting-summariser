import { useState } from 'react'
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
  Grid,
  Divider,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab
} from '@mui/material'
import FileUpload from './components/FileUpload'
import SummaryDisplay from './components/SummaryDisplay'
import AIChatInterface from './components/AIChatInterface'
import EmailIcon from '@mui/icons-material/Email'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SummarizeIcon from '@mui/icons-material/Summarize'
import ChatIcon from '@mui/icons-material/Chat'
import SendIcon from '@mui/icons-material/Send'

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
  
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const steps = ['Recipient Information', 'Upload Transcript', 'Review Summary']

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
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
      
      setTabValue(0)
      setProcessingComplete(true)
      if (activeStep !== 2) {
        handleNext();
      }
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
          emails: emails
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
                <Typography variant="h5">Recipient Information</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
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
                  disabled={!validateEmails(emails)}
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
                            <AIChatInterface summary={summary} transcript={transcript} />
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
      </Box>
    </Container>
  )
}

export default App
