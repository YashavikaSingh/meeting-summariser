import { Box, Typography, Divider, Paper, useTheme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

interface SummaryDisplayProps {
  summary: string;
}

const SummaryDisplay = ({ summary }: SummaryDisplayProps) => {
  const theme = useTheme();
  
  // Function to split summary into sections
  const renderSummary = () => {
    // Split by lines or double line breaks
    const sections = summary.split(/\n\n|\r\n\r\n/).filter(section => section.trim().length > 0);
    
    if (sections.length <= 1) {
      // If no clear sections, just display the whole text
      return (
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {summary}
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
              {section}
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
            {section}
          </Typography>
        </Box>
      );
    });
  };

  return (
    <Box>
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