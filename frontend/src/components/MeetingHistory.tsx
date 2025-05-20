import { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Paper, Divider, CircularProgress, Button } from '@mui/material';
import SummaryDisplay from './SummaryDisplay';

interface Meeting {
  id: number;
  emails: string;
  timestamp: string;
  summary: string;
}

interface MeetingDetail {
  id: number;
  transcript: string;
  summary: string;
  emails: string;
  timestamp: string;
}

const MeetingHistory = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:3000/api/meetings')
      .then(res => res.json())
      .then(data => setMeetings(data))
      .catch(() => setError('Failed to fetch meetings'))
      .finally(() => setLoading(false));
  }, []);

  const fetchMeetingDetail = (id: number) => {
    setDetailLoading(true);
    fetch(`http://localhost:3000/api/meetings/${id}`)
      .then(res => res.json())
      .then(data => setSelectedMeeting(data))
      .catch(() => setError('Failed to fetch meeting details'))
      .finally(() => setDetailLoading(false));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Past Meetings</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Paper sx={{ mb: 3 }}>
          <List>
            {meetings.map(meeting => (
              <div key={meeting.id}>
                <ListItem button onClick={() => fetchMeetingDetail(meeting.id)}>
                  <ListItemText
                    primary={`Meeting #${meeting.id} - ${new Date(meeting.timestamp).toLocaleString()}`}
                    secondary={`Emails: ${meeting.emails} | Preview: ${meeting.summary}`}
                  />
                </ListItem>
                <Divider />
              </div>
            ))}
          </List>
        </Paper>
      )}
      {detailLoading && <CircularProgress />}
      {selectedMeeting && !detailLoading && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6" gutterBottom>Meeting Details</Typography>
          <Typography variant="subtitle2" gutterBottom>Timestamp: {new Date(selectedMeeting.timestamp).toLocaleString()}</Typography>
          <Typography variant="subtitle2" gutterBottom>Emails: {selectedMeeting.emails}</Typography>
          <Typography variant="subtitle2" gutterBottom>Transcript:</Typography>
          <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selectedMeeting.transcript}</Typography>
          </Paper>
          <SummaryDisplay summary={selectedMeeting.summary} />
          <Button sx={{ mt: 2 }} onClick={() => setSelectedMeeting(null)}>Back to list</Button>
        </Paper>
      )}
    </Box>
  );
};

export default MeetingHistory; 