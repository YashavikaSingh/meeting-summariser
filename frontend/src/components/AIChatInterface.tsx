import { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography, 
  Avatar, 
  Divider,
  CircularProgress,
  Chip,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import InfoIcon from '@mui/icons-material/Info';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIChatInterfaceProps {
  summary: string;
}

// Function to clean markdown characters from text
const cleanMarkdown = (text: string): string => {
  // Don't remove bold symbols (**) as we want to preserve them for formatting
  // Remove markdown italics symbols (*)
  let cleanedText = text.replace(/\*([^*]+)\*/g, '$1');
  // Remove other common markdown characters if needed
  // For example, remove heading symbols (#)
  cleanedText = cleanedText.replace(/^#+\s+/gm, '');
  
  return cleanedText;
};

const AIChatInterface = ({ summary }: AIChatInterfaceProps) => {
  // Clean the summary before using it
  const cleanedSummary = cleanMarkdown(summary);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "I'm your meeting assistant. Ask me anything about the summary!",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update welcome message when summary changes
  useEffect(() => {
    if (cleanedSummary && cleanedSummary.trim().length > 0) {
      setMessages([
        {
          id: 'welcome',
          text: "I've analyzed the meeting summary and I'm ready to answer your questions about it. You can ask about key points, decisions made, action items, or any specific details you need clarified.",
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    }
  }, [cleanedSummary]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    
    try {
      // Send the query to the backend chat endpoint with cleaned summary
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: newMessage,
          summary: cleanedSummary
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      const aiResponse = data.response;
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble processing your request right now. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get a preview of the context (first 100 characters of cleaned summary)
  const contextPreview = cleanedSummary.length > 100 
    ? `${cleanedSummary.substring(0, 100)}...` 
    : cleanedSummary;

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white', borderTopLeftRadius: 8, borderTopRightRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <SmartToyIcon sx={{ mr: 1 }} /> AI Assistant
        </Typography>
        <Tooltip title={
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2">Using meeting summary as context:</Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, fontSize: '0.8rem' }}>
              {contextPreview}
            </Typography>
          </Box>
        }>
          <Chip 
            icon={<InfoIcon />} 
            label="Context Active" 
            size="small" 
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '& .MuiChip-icon': { color: 'white' }
            }} 
          />
        </Tooltip>
      </Box>
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, backgroundColor: 'background.default' }}>
        {messages.map(message => (
          <Box 
            key={message.id} 
            sx={{ 
              display: 'flex', 
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
              mb: 2
            }}
          >
            <Box sx={{ 
              display: 'flex',
              flexDirection: message.sender === 'user' ? 'row-reverse' : 'row', 
              alignItems: 'flex-start',
              maxWidth: '80%'
            }}>
              <Avatar 
                sx={{ 
                  bgcolor: message.sender === 'user' ? 'primary.light' : 'primary.dark',
                  width: 36,
                  height: 36,
                  ml: message.sender === 'user' ? 1 : 0,
                  mr: message.sender === 'ai' ? 1 : 0
                }}
              >
                {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
              </Avatar>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  backgroundColor: message.sender === 'user' ? 'primary.light' : 'grey.100',
                  color: message.sender === 'user' ? 'white' : 'text.primary',
                  borderRadius: 2,
                  maxWidth: '100%',
                }}
              >
                <Typography variant="body1">{message.text}</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Paper>
            </Box>
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.dark',
                  width: 36,
                  height: 36,
                  mr: 1
                }}
              >
                <SmartToyIcon />
              </Avatar>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.100',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2">Thinking...</Typography>
              </Paper>
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', backgroundColor: 'background.paper' }}>
        <TextField 
          fullWidth
          variant="outlined"
          placeholder="Ask about the meeting..."
          size="small"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          sx={{ 
            mr: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3
            }
          }}
        />
        <IconButton 
          color="primary" 
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || isLoading}
          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default AIChatInterface; 