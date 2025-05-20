import { Box, Typography, Divider } from '@mui/material';

interface SummaryDisplayProps {
  summary: string;
}

const SummaryDisplay = ({ summary }: SummaryDisplayProps) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Meeting Summary
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
        {summary}
      </Typography>
    </Box>
  );
};

export default SummaryDisplay; 