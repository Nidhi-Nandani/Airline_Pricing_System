import React from 'react';
import { Box, Typography, Button, Container, Grid } from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{
      minHeight: '80vh',
      background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 8
    }}>
      <Container maxWidth="md">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h2" fontWeight={700} color="primary" gutterBottom>
              Book Your Next Flight
            </Typography>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Discover the best deals, compare prices, and fly with confidence. Your journey starts here.
            </Typography>
            <Button
              variant="contained"
              size="large"
              color="primary"
              startIcon={<FlightTakeoffIcon />}
              sx={{ mt: 4, px: 5, py: 1.5, fontWeight: 600, fontSize: '1.2rem', borderRadius: 3, mr: 2 }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
            <Button
              variant="outlined"
              size="large"
              color="primary"
              sx={{ mt: 4, px: 5, py: 1.5, fontWeight: 600, fontSize: '1.2rem', borderRadius: 3 }}
              onClick={() => navigate('/register')}
            >
              Sign Up
            </Button>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box
              component="img"
              src="/plane.png"
              alt="Flight Booking"
              sx={{ width: '100%', maxWidth: 340, mx: 'auto', display: 'block', borderRadius: 4, boxShadow: 3 }}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Landing;
