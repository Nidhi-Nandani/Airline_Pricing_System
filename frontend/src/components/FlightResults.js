import React from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import FlightIcon from '@mui/icons-material/Flight';

function formatLocalDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short' // Automatically handles timezone conversion
  });
}

const FlightResults = ({ flights, onBook }) => {
  if (!flights || flights.length === 0) {
    return (
      <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 6 }}>
        No flights found for your search. Try different dates or routes.
      </Typography>
    );
  }
  return (
    <Grid container spacing={3} sx={{ mt: 2 }}>
      {flights.map((flight) => (
        <Grid item xs={12} md={6} lg={4} key={flight.id}>
          <Card sx={{ borderRadius: 4, boxShadow: 4, transition: '0.2s', '&:hover': { boxShadow: 8 } }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <FlightIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600} color="primary.main">
                  {flight.flight_number} - {flight.airline}
                </Typography>
                <Chip
                  label={flight.travel_class}
                  color={flight.travel_class === 'Economy' ? 'info' : flight.travel_class === 'Business' ? 'secondary' : 'warning'}
                  size="small"
                  sx={{ ml: 2, fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body1" fontWeight={500}>
                {flight.origin_airport.city} ({flight.origin_airport.iata_code}) → {flight.destination_airport.city} ({flight.destination_airport.iata_code})
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Departure: {formatLocalDateTime(flight.departure_time)}<br />
                Arrival: {formatLocalDateTime(flight.arrival_time)}
              </Typography>
              <Typography variant="h5" color="secondary" fontWeight={700}>
                ₹{flight.current_price}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {flight.available_seats} seats left
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2, fontWeight: 600, borderRadius: 2 }}
                disabled={flight.available_seats === 0}
                onClick={() => onBook(flight)}
              >
                Book Now
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default FlightResults;
