import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper, Button, useTheme } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

const FileUpload = ({ onFileUpload }: FileUploadProps) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });
  
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.txt')) return <DescriptionIcon fontSize="large" />;
    if (fileName.endsWith('.pdf')) return <PictureAsPdfIcon fontSize="large" />;
    if (fileName.endsWith('.docx')) return <ArticleIcon fontSize="large" />;
    return <DescriptionIcon fontSize="large" />;
  };

  const handleButtonClick = () => {
    // Ensure fileInputRef.current is not null before clicking
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  return (
    <Box>
      {/* Hidden file input for the button */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        accept=".txt,.pdf,.docx"
      />
      
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive 
            ? theme.palette.primary.main + '10' 
            : theme.palette.background.paper,
          border: '2px dashed',
          borderColor: isDragActive 
            ? theme.palette.primary.main 
            : theme.palette.divider,
          borderRadius: 2,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: theme.palette.primary.main + '10',
            transform: 'translateY(-4px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }
        }}
      >
        <input {...getInputProps()} />
        
        <CloudUploadIcon 
          sx={{ 
            fontSize: 64, 
            color: theme.palette.primary.main, 
            mb: 2,
            transition: 'transform 0.3s ease',
            ...(isDragActive && {
              transform: 'scale(1.2)'
            })
          }} 
        />
        
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{
            fontWeight: 'medium',
            color: isDragActive 
              ? theme.palette.primary.main 
              : theme.palette.text.primary
          }}
        >
          {isDragActive
            ? 'Drop the file here'
            : 'Drag and drop a meeting transcript here'}
        </Typography>
        
        <Button 
          variant="outlined" 
          color="primary" 
          sx={{ mt: 2, borderRadius: 2 }}
          onClick={(e) => {
            e.stopPropagation();
            handleButtonClick();
          }}
        >
          Browse Files
        </Button>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mt: 2 }}
        >
          Supported formats: TXT, PDF, DOCX
        </Typography>
        
        {acceptedFiles.length > 0 && (
          <Box 
            sx={{ 
              mt: 3, 
              p: 2, 
              border: '1px solid', 
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2
            }}
          >
            {getFileIcon(acceptedFiles[0].name)}
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="subtitle2">
                {acceptedFiles[0].name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(acceptedFiles[0].size / 1024).toFixed(2)} KB
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FileUpload; 