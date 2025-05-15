import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, TextField, Stepper, Step, StepLabel, Box, Alert
} from '@mui/material';
import axios from 'axios';
import jsPDF from 'jspdf';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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

function downloadTicket(booking, flight, passengerNames, phone, numSeats) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('ProFlight Ticket', 20, 20);
  doc.setFontSize(12);
  doc.text(`Booking ID: ${booking?.id}`, 20, 40);
  doc.text(`Passenger(s): ${passengerNames.join(', ')}`, 20, 50);
  doc.text(`Phone: ${phone}`, 20, 60);
  doc.text(`Flight: ${flight.flight_number} (${flight.airline})`, 20, 70);
  doc.text(`Route: ${flight.origin_airport.city} (${flight.origin_airport.iata_code}) → ${flight.destination_airport.city} (${flight.destination_airport.iata_code})`, 20, 80);
  doc.text(`Class: ${flight.travel_class}`, 20, 90);
  doc.text(`Departure: ${formatLocalDateTime(flight.departure_time)}`, 20, 100);
  doc.text(`Arrival: ${formatLocalDateTime(flight.arrival_time)}`, 20, 110);
  doc.text(`Seats: ${numSeats}`, 20, 120);
  doc.text(`Total Price: ₹${flight.current_price * numSeats}`, 20, 130);
  doc.text('Status: Confirmed', 20, 140);
  doc.text('Thank you for booking with ProFlight!', 20, 160);
  doc.save(`ProFlight_Ticket_${booking?.id || 'demo'}.pdf`);
}

function saveBookingToHistory(newBooking) {
  const storedBookings = localStorage.getItem('bookingHistory');
  const bookings = storedBookings ? JSON.parse(storedBookings) : [];
  bookings.push(newBooking);
  localStorage.setItem('bookingHistory', JSON.stringify(bookings));
}

const steps = ['Passenger Details', 'OTP Verification', 'Booking Status'];

const BookingModal = ({ open, onClose, flight }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [passengerName, setPassengerName] = useState('');
  const [numSeats, setNumSeats] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [booking, setBooking] = useState(null);
  const [passengerNames, setPassengerNames] = useState(['']);

  const handlePassengerNameChange = (index, value) => {
    const updatedNames = [...passengerNames];
    updatedNames[index] = value;
    setPassengerNames(updatedNames);
  };

  const handleNumSeatsChange = (value) => {
    setNumSeats(value);
    setPassengerNames(Array(value).fill(''));
  };

  const handleSendOtp = async () => {
    try {
      // Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp); // Set the generated OTP in state
      setError('');
      alert(`Your OTP is: ${otp}`); // Display the OTP in an alert for demo purposes
    } catch (err) {
      setError('Failed to generate OTP. Please try again.');
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (passengerNames.some(name => !name) || !phone.match(/^\d{10}$/)) {
        setError('Please enter all passenger names and a valid phone number.');
        return;
      }
      setError('');
      await handleSendOtp(); // Send OTP before moving to the next step
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (otp !== generatedOtp) {
        setError('Invalid OTP. Please check and try again.');
        return;
      }
      setError('');
      setLoading(true);
      try {
        // Simulate booking API call
        const response = await axios.post('http://127.0.0.1:8000/api/bookings/', {
          flight: flight.id,
          passenger_name: passengerName,
          num_seats: numSeats,
          phone: phone
        });
        setBooking(response.data);
        setSuccess(true);
        setActiveStep(2);
        // Download ticket after a short delay
        setTimeout(() => {
          downloadTicket(response.data, flight, passengerNames, phone, numSeats);
        }, 800);

        if (response.data && response.data.booking) {
          console.log('Saving booking to history:', {
            id: response.data.booking.id,
            flight: flight.flight_number,
            passengers: passengerNames,
            phone,
            seats: numSeats,
            totalPrice: flight.current_price * numSeats,
            date: new Date().toISOString(),
          });
          saveBookingToHistory({
            id: response.data.booking.id,
            flight: flight.flight_number,
            passengers: passengerNames,
            phone,
            seats: numSeats,
            totalPrice: flight.current_price * numSeats,
            date: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Booking failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      onClose();
      setTimeout(() => {
        setActiveStep(0);
        setPassengerName('');
        setNumSeats(1);
        setPhone('');
        setOtp('');
        setGeneratedOtp('');
        setSuccess(false);
        setBooking(null);
      }, 500);
    }
  };

  const handleBack = () => {
    if (activeStep === 0) {
      onClose();
    } else {
      setActiveStep(activeStep - 1);
    }
  };

  // Guard: Don't render modal content if flight is not defined
  if (!flight || !flight.origin_airport || !flight.destination_airport) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Book Flight</DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            Loading flight details...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary">Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Book Flight</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {activeStep === 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              {flight.origin_airport.city} ({flight.origin_airport.iata_code}) → {flight.destination_airport.city} ({flight.destination_airport.iata_code})
            </Typography>
            <TextField
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Number of Seats"
              type="number"
              value={numSeats}
              onChange={(e) => handleNumSeatsChange(parseInt(e.target.value, 10))}
              fullWidth
              margin="normal"
            />
            {Array.from({ length: numSeats }).map((_, index) => (
              <TextField
                key={index}
                label={`Passenger Name ${index + 1}`}
                value={passengerNames[index] || ''}
                onChange={(e) => handlePassengerNameChange(index, e.target.value)}
                fullWidth
                margin="normal"
              />
            ))}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" mb={2}>OTP Verification</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your OTP is <b>{generatedOtp}</b> (for demo purposes). Enter it below to confirm your booking.
            </Alert>
            <TextField
              label="Enter OTP"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 6 }}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
        {activeStep === 2 && (
          <Box textAlign="center">
            {success ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Booking Confirmed! Your booking ID is <b>{booking?.id}</b>.
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error || 'Booking failed.'}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleBack} color="secondary" disabled={loading}>
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button onClick={handleNext} color="primary" variant="contained" disabled={loading}>
          {activeStep === 2 ? 'Close' : activeStep === 1 ? (loading ? 'Booking...' : 'Confirm') : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingModal;
