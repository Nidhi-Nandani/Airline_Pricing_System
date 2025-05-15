import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Grid, TextField, Button, Typography,
  Autocomplete, FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import FlightResults from './FlightResults';
import BookingModal from './BookingModal';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const FlightSearch = () => {
  const [airports, setAirports] = useState([]);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sortBy, setSortBy] = useState('departure_time');
  const [showResults, setShowResults] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: null,
    travelClass: 'Economy'
  });

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/airports/`)
      .then(response => {
        if (response.data && Array.isArray(response.data.results)) {
          setAirports(response.data.results);
        } else if (Array.isArray(response.data)) {
          setAirports(response.data);
        }
      })
      .catch(error => {
        setErrorMessage('Failed to load airports. Please try again later.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSubmitted(true);
    setShowResults(false);

    if (!formData.origin || !formData.destination || !formData.date || !formData.travelClass) {
      setErrorMessage('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const formattedDate = formData.date
        ? new Date(formData.date.setHours(0, 0, 0, 0)).toISOString().split('T')[0]
        : '';
      const response = await axios.get(`${API_BASE_URL}/flights/search_flights/`, {
        params: {
          origin: formData.origin,
          destination: formData.destination,
          date: formattedDate,
          class: formData.travelClass,
          sort: sortBy
        }
      });
      if (response.data && Array.isArray(response.data)) {
        setFlights(response.data);
        setShowResults(true);
        if (response.data.length === 0) {
          setErrorMessage('No flights found for the selected criteria.');
        }
      } else if (response.data && response.data.message) {
        setErrorMessage(response.data.message);
        setFlights([]);
        setShowResults(true);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.error || 'Failed to search flights. Please try again later.');
      setFlights([]);
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleBook = (flight) => {
    setSelectedFlight(flight);
    setBookingOpen(true);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={4} sx={{ p: 4, mb: 4, borderRadius: 4 }}>
          <Typography variant="h4" gutterBottom color="primary" fontWeight={700} align="center">
            Search Flights
          </Typography>
          <form onSubmit={handleSearch}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={airports}
                  getOptionLabel={(option) => option ? `${option.city} (${option.iata_code})` : ''}
                  value={airports.find(a => a.iata_code === formData.origin) || null}
                  onChange={(_, newValue) => setFormData({ ...formData, origin: newValue ? newValue.iata_code : '' })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="From"
                      required
                      error={submitted && !formData.origin}
                      helperText={submitted && !formData.origin ? 'Origin is required' : ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={airports}
                  getOptionLabel={(option) => option ? `${option.city} (${option.iata_code})` : ''}
                  value={airports.find(a => a.iata_code === formData.destination) || null}
                  onChange={(_, newValue) => setFormData({ ...formData, destination: newValue ? newValue.iata_code : '' })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="To"
                      required
                      error={submitted && !formData.destination}
                      helperText={submitted && !formData.destination ? 'Destination is required' : ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(newValue) => setFormData({ ...formData, date: newValue })}
                  shouldDisableDate={isDateDisabled}
                  slotProps={{
                    textField: {
                      required: true,
                      error: submitted && !formData.date,
                      helperText: submitted && !formData.date ? 'Date is required' : '',
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={formData.travelClass}
                    label="Class"
                    onChange={(e) => setFormData({ ...formData, travelClass: e.target.value })}
                  >
                    <MenuItem value="Economy">Economy</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                    <MenuItem value="First">First</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ height: '100%' }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Search'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
        {errorMessage && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        {showResults && <FlightResults flights={flights} onBook={handleBook} />}
        {selectedFlight && selectedFlight.origin_airport && selectedFlight.destination_airport && (
          <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} flight={selectedFlight} />
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default FlightSearch;

