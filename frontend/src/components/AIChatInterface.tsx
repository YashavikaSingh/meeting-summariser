import { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Avatar, 
  CircularProgress,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface AIChatInterfaceProps {
  transcript: string;  // Meeting transcript to use as context
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ transcript }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'ai', 
      text: 'Hi there! I can answer questions about this meeting. What would you like to know?' 
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Add user message to chat
    const userMessage: Message = { sender: 'user', text: newMessage };
    setMessages([...messages, userMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      // Send query to backend with transcript as context
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: newMessage,
          transcript: transcript
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prevMessages => [...prevMessages, {
        sender: 'ai' as const,
        text: data.response || 'Sorry, I could not process that request.'
      }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prevMessages => [...prevMessages, {
        sender: 'ai' as const,
        text: 'Sorry, there was an error processing your request. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Ask about this meeting
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5
      }}>
        {messages.map((message, index) => (
          <Box 
            key={index} 
            sx={{ 
              display: 'flex', 
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
              mb: 1 
            }}
          >
            <Box sx={{ display: 'flex', maxWidth: '80%' }}>
              {message.sender === 'ai' && (
                <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                  <SmartToyIcon />
                </Avatar>
              )}
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  bgcolor: message.sender === 'user' ? 'primary.light' : 'background.paper',
                  color: message.sender === 'user' ? 'white' : 'text.primary',
                  borderRadius: 2,
                  borderTopRightRadius: message.sender === 'user' ? 0 : 2,
                  borderTopLeftRadius: message.sender === 'ai' ? 0 : 2,
                }}
              >
                <Typography variant="body1">
                  {message.text}
                </Typography>
              </Paper>
              {message.sender === 'user' && (
                <Avatar sx={{ bgcolor: 'primary.dark', ml: 1 }}>
                  <PersonIcon />
                </Avatar>
              )}
            </Box>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
            <Box sx={{ display: 'flex' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                <SmartToyIcon />
              </Avatar>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  borderTopLeftRadius: 0,
                  minWidth: 50,
                  minHeight: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CircularProgress size={20} />
              </Paper>
            </Box>
          </Box>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ask a question about this meeting..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          disabled={loading}
          size="small"
        />
        <Button 
          variant="contained" 
          color="primary" 
          endIcon={<SendIcon />} 
          onClick={handleSendMessage}
          disabled={loading || !newMessage.trim()}
          sx={{ ml: 1 }}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default AIChatInterface; 