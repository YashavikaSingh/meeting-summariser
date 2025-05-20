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
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material'
import FileUpload from './components/FileUpload'
import SummaryDisplay from './components/SummaryDisplay'
import EmailIcon from '@mui/icons-material/Email'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SummarizeIcon from '@mui/icons-material/Summarize'
import SendIcon from '@mui/icons-material/Send'

function App() {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [emails, setEmails] = useState<string>('')
  const [activeStep, setActiveStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
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

  const processFile = async () => {
    if (!selectedFile) return
    
    setLoading(true)
    setError('')
    
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
      setSummary(data.summary)
      handleNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

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
                    <SummaryDisplay summary={summary} />
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
                <Button 
                  variant="contained" 
                  onClick={processFile}
                  disabled={loading || summary !== ''}
                  sx={{ borderRadius: 2 }}
                >
                  Generate Summary
                </Button>
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
