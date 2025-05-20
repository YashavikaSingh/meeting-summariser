import { useState } from 'react'
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Alert
} from '@mui/material'
import FileUpload from './components/FileUpload'
import SummaryDisplay from './components/SummaryDisplay'

function App() {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const handleFileUpload = async (file: File) => {
    setLoading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:3000/api/summarize', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to get summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Meeting Summarizer
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <FileUpload onFileUpload={handleFileUpload} />
        </Paper>

        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {summary && !loading && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <SummaryDisplay summary={summary} />
          </Paper>
        )}
      </Box>
    </Container>
  )
}

export default App
