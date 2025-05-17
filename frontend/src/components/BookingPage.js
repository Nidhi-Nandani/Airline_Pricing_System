import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, MenuItem, Paper, Stepper, Step, StepLabel } from '@mui/material';
import axios from 'axios';
import jsPDF from 'jspdf';

const API_BASE_URL = 'http://127.0.0.1:8000/api';
const mealOptions = [
  'Vegetarian',
  'Non-Vegetarian',
  'Vegan',
  'Jain',
  'Gluten-Free',
  'No Meal'
];
const seatOptions = Array.from({ length: 30 }, (_, i) => `Row ${Math.floor(i/6)+1} Seat ${String.fromCharCode(65 + (i%6))}`);

const steps = ['Passenger Details', 'OTP Verification', 'Booking Status'];

export default function BookingPage() {
  const { flightNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [flight, setFlight] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [numSeats, setNumSeats] = useState(1);
  const [passengerNames, setPassengerNames] = useState(['']);
  const [phone, setPhone] = useState('');
  const [seatChoices, setSeatChoices] = useState(['']);
  const [meals, setMeals] = useState(['No Meal']);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Get flight details from location state or fetch if not present
  useEffect(() => {
    if (location.state && location.state.flight) {
      setFlight(location.state.flight);
    } else {
      // Fallback: fetch flight details by flightNumber
      axios.get(`${API_BASE_URL}/flights/search_flights/`, { params: { flight_number: flightNumber } })
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) setFlight(res.data[0]);
        });
    }
  }, [flightNumber, location.state]);

  const handlePassengerNameChange = (index, value) => {
    const updatedNames = [...passengerNames];
    updatedNames[index] = value;
    setPassengerNames(updatedNames);
  };
  const handleNumSeatsChange = (value) => {
    setNumSeats(value);
    setPassengerNames(Array(value).fill(''));
    setSeatChoices(Array(value).fill(''));
    setMeals(Array(value).fill('No Meal'));
  };
  const handleSendOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setError('');
    alert(`Your OTP is: ${otp}`);
  };
  const downloadTicket = (booking, flight, passengerNames, phone, numSeats, seatChoices, meals) => {
    const doc = new jsPDF();
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('ProFlight Ticket', 15, 20);
    doc.addImage('/logo512.png', 'PNG', 170, 5, 25, 20);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let y = 40;
    doc.text(`Ticket ID: ${booking?.ticket_id || booking?.id || 'demo'}`, 20, y); y += 10;
    doc.text(`Passenger(s): ${passengerNames.join(', ')}`, 20, y); y += 10;
    doc.text(`Phone: ${phone}`, 20, y); y += 10;
    doc.text(`Flight: ${flight.flight_number} (${flight.airline})`, 20, y); y += 10;
    doc.text(`Route: ${flight.origin_airport.city} (${flight.origin_airport.iata_code}) → ${flight.destination_airport.city} (${flight.destination_airport.iata_code})`, 20, y); y += 10;
    doc.text(`Class: ${flight.travel_class}`, 20, y); y += 10;
    doc.text(`Departure: ${new Date(flight.departure_time).toLocaleString()}`, 20, y); y += 10;
    doc.text(`Arrival: ${new Date(flight.arrival_time).toLocaleString()}`, 20, y); y += 10;
    doc.text(`Seats: ${numSeats}`, 20, y); y += 10;
    seatChoices.forEach((seat, i) => {
      doc.text(`Passenger ${i+1} Seat: ${seat}`, 20, y); y += 8;
    });
    meals.forEach((meal, i) => {
      doc.text(`Passenger ${i+1} Meal: ${meal}`, 20, y); y += 8;
    });
    doc.text(`Total Price: ₹${flight.current_price * numSeats}`, 20, y); y += 10;
    if (booking?.available_seats !== undefined) {
      doc.text(`Seats left after booking: ${booking.available_seats}`, 20, y); y += 10;
    }
    doc.setTextColor(39, 174, 96);
    doc.text('Status: Confirmed', 20, y); y += 10;
    doc.setTextColor(0, 0, 0);
    doc.text('Thank you for booking with ProFlight!', 20, y + 10);
    doc.save(`ProFlight_Ticket_${booking?.ticket_id || booking?.id || 'demo'}.pdf`);
  };
  const handleNext = async () => {
    if (activeStep === 0) {
      if (passengerNames.some(name => !name) || !phone.match(/^[0-9]{10}$/)) {
        setError('Please enter all passenger names and a valid phone number.');
        return;
      }
      if (seatChoices.some(seat => !seat)) {
        setError('Please select a seat for each passenger.');
        return;
      }
      setError('');
      handleSendOtp();
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (otp !== generatedOtp) {
        setError('Invalid OTP. Please check and try again.');
        return;
      }
      setError('');
      setLoading(true);
      try {
        // Instead of searching for a DB flight, just send a mock booking request to the backend
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        const bookingPayload = {
          flight: flight.flight_number, // send flight_number as string, not DB id
          num_seats: Number(numSeats),
          passenger_name: passengerNames.join(', '),
          phone: phone,
          customer_email: '',
          seat_choice: seatChoices.join(', '),
          meal: meals.join(', '),
          travel_class: flight.travel_class,
          price: flight.current_price * numSeats,
          origin: flight.origin_airport.iata_code,
          destination: flight.destination_airport.iata_code,
          date: flight.departure_time,
          user: user // Attach username for backend to store
        };
        const response = await axios.post(`${API_BASE_URL}/bookings/`, bookingPayload, {
          headers: { Authorization: `Token ${token}` }
        });
        setSuccess(true);
        setActiveStep(2);
        setTimeout(() => {
          downloadTicket(response.data, flight, passengerNames, phone, numSeats, seatChoices, meals);
        }, 500);
      } catch (err) {
        setError(err.response?.data?.error || 'Booking failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };
  const handleBack = () => {
    if (activeStep === 0) navigate(-1);
    else if (activeStep === 2) {
      // After booking, go back to search page
      navigate(-1);
    } else setActiveStep(activeStep - 1);
  };
  // Place these handlers above the return statement
  const handleSeatChoiceChange = (index, value) => {
    const updated = [...seatChoices];
    updated[index] = value;
    setSeatChoices(updated);
  };
  const handleMealChange = (index, value) => {
    const updated = [...meals];
    updated[index] = value;
    setMeals(updated);
  };
  if (!flight) return <Box p={4}><Typography>Loading flight details...</Typography></Box>;
  return (
    <Box maxWidth="sm" mx="auto" mt={4}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2} color="primary">Book Flight: {flight.airline} {flight.flight_number}</Typography>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        {activeStep === 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              {flight.origin_airport.city} ({flight.origin_airport.iata_code}) → {flight.destination_airport.city} ({flight.destination_airport.iata_code})
            </Typography>
            <TextField label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} fullWidth margin="normal" />
            <TextField label="Number of Seats" type="number" value={numSeats} onChange={e => handleNumSeatsChange(parseInt(e.target.value, 10))} fullWidth margin="normal" />
            {Array.from({ length: numSeats }).map((_, index) => (
              <Box key={index} display="flex" gap={2} alignItems="center" mb={2}>
                <TextField
                  label={`Passenger Name ${index + 1}`}
                  value={passengerNames[index] || ''}
                  onChange={e => handlePassengerNameChange(index, e.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  label="Seat"
                  value={seatChoices[index] || ''}
                  onChange={e => handleSeatChoiceChange(index, e.target.value)}
                  sx={{ minWidth: 120 }}
                  SelectProps={{ native: true }}
                >
                  <option value="">Select</option>
                  {seatOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Meal"
                  value={meals[index] || 'No Meal'}
                  onChange={e => handleMealChange(index, e.target.value)}
                  sx={{ minWidth: 120 }}
                  SelectProps={{ native: true }}
                >
                  {mealOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </TextField>
              </Box>
            ))}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" mb={2}>OTP Verification</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>Your OTP is <b>{generatedOtp}</b> (for demo purposes). Enter it below to confirm your booking.</Alert>
            <TextField label="Enter OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} fullWidth sx={{ mb: 2 }} inputProps={{ maxLength: 6 }} />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
        {activeStep === 2 && (
          <Box textAlign="center">
            {success ? (
              <Alert severity="success" sx={{ mb: 2 }}>Booking Confirmed! Redirecting to main page...</Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>{error || 'Booking failed.'}</Alert>
            )}
          </Box>
        )}
        <Box mt={3} display="flex" justifyContent="space-between">
          <Button onClick={handleBack} color="secondary" disabled={loading}>
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          {activeStep === 2 ? (
            <Button onClick={() => navigate(-1)} color="primary" variant="contained">
              Close
            </Button>
          ) : (
            <Button onClick={handleNext} color="primary" variant="contained" disabled={loading}>
              {activeStep === 1 ? (loading ? 'Booking...' : 'Confirm') : 'Next'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
