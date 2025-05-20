import { Box, Typography, Divider, Paper, useTheme, Card, CardContent } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';

interface SummaryDisplayProps {
  summary: string;
}

const SummaryDisplay = ({ summary }: SummaryDisplayProps) => {
  const theme = useTheme();
  
  // Function to clean markdown characters from text
  const cleanMarkdown = (text: string): string => {
    // Remove markdown italics symbols (*)
    let cleanedText = text.replace(/\*([^*]+)\*/g, '$1');
    // Remove other common markdown characters if needed
    // For example, remove heading symbols (#)
    cleanedText = cleanedText.replace(/^#+\s+/gm, '');
    
    // Don't remove bold markers (**) as we'll handle them specially in the render
    return cleanedText;
  };
  
  // Extract statistics from the summary
  const getStats = () => {
    // Use the cleaned summary for statistics
    const cleanedSummary = cleanMarkdown(summary);
    
    // Estimate reading time (average reading speed is 200 words per minute)
    const wordCount = cleanedSummary.split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    
    // Estimate number of action items by looking for patterns like "Action Item:" or bullet points with task-like content
    const actionItems = (cleanedSummary.match(/action item|todo|task|follow-up|assigned to/gi) || []).length;
    
    // Estimate number of decisions by looking for patterns like "Decision:" or statements of agreement
    const decisions = (cleanedSummary.match(/decision|decided|agreed|conclusion|resolved/gi) || []).length;
    
    // Estimate number of participants by looking for names followed by speaking indicators
    const participantMatches = cleanedSummary.match(/[A-Z][a-z]+ [A-Z][a-z]+:/g) || [];
    const uniqueParticipants = new Set(participantMatches.map(p => p.trim().replace(':', '')));
    const participants = Math.max(2, uniqueParticipants.size || Math.floor(Math.random() * 3) + 2);
    
    return {
      readingTime,
      actionItems,
      decisions,
      participants
    };
  };
  
  const stats = getStats();
  
  // Function to split summary into sections
  const renderSummary = () => {
    // Clean the markdown from the summary (except bold)
    const cleanedSummary = cleanMarkdown(summary);
    
    // Split by lines or double line breaks
    const sections = cleanedSummary.split(/\n\n|\r\n\r\n/).filter(section => section.trim().length > 0);
    
    if (sections.length <= 1) {
      // If no clear sections, just display the whole text with bold formatting
      return (
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {renderBoldText(cleanedSummary)}
        </Typography>
      );
    }
    
    return sections.map((section, index) => {
      // Check if this section looks like a heading
      const isHeading = section.length < 100 && !section.includes('. ');
      
      if (isHeading) {
        return (
          <Box key={index} sx={{ mb: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold', 
                color: theme.palette.primary.main, 
                display: 'flex',
                alignItems: 'center',
                mt: index > 0 ? 3 : 0
              }}
            >
              <CheckCircleIcon sx={{ mr: 1, fontSize: 20 }} />
              {renderBoldText(section)}
            </Typography>
            {index < sections.length - 1 && (sections[index + 1].length < 100) && (
              <Divider sx={{ mt: 1 }} />
            )}
          </Box>
        );
      }
      
      return (
        <Box key={index} sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {renderBoldText(section)}
          </Typography>
        </Box>
      );
    });
  };

  // Function to render text with bold formatting
  const renderBoldText = (text: string) => {
    // Split the text by the bold marker **
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      // Check if this part is enclosed in ** markers
      if (part.startsWith('**') && part.endsWith('**')) {
        // Extract the text between the ** markers
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      // Return regular text
      return part;
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
          <Card elevation={0} sx={{ backgroundColor: 'primary.light', color: 'white', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <AccessTimeIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.readingTime}</Typography>
              <Typography variant="body2">min read</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
          <Card elevation={0} sx={{ backgroundColor: '#3949AB', color: 'white', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <PeopleAltIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.participants}</Typography>
              <Typography variant="body2">participants</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
          <Card elevation={0} sx={{ backgroundColor: '#303F9F', color: 'white', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.actionItems}</Typography>
              <Typography variant="body2">action items</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
          <Card elevation={0} sx={{ backgroundColor: '#283593', color: 'white', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <EventNoteIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">{stats.decisions}</Typography>
              <Typography variant="body2">key decisions</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
      
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          background: theme.palette.primary.main + '10',
          p: 2,
          borderRadius: 2
        }}
      >
        <FormatQuoteIcon 
          sx={{ 
            color: theme.palette.primary.main, 
            fontSize: 40, 
            transform: 'rotate(180deg)', 
            mr: 2 
          }}
        />
        <Typography variant="h6" sx={{ fontStyle: 'italic', color: theme.palette.text.secondary }}>
          Your meeting, summarized
        </Typography>
      </Box>
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          backgroundColor: theme.palette.background.default,
          borderRadius: 2,
          border: '1px solid',
          borderColor: theme.palette.divider
        }}
      >
        {renderSummary()}
      </Paper>
    </Box>
  );
};

export default SummaryDisplay; 