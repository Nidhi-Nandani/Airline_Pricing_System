import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    // Remove localStorage booking history logic, only fetch from backend
    fetchBookings(token);
    // eslint-disable-next-line
  }, [navigate]);

  const fetchBookings = async (token) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/bookings/`, {
        headers: {
          Authorization: `Token ${token}`
        }
      });
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError('Failed to load booking history. Please try again later.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Booking History
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>Flight Number</TableCell>
                <TableCell>Passenger Names</TableCell>
                <TableCell>Booking Date</TableCell>
                <TableCell>Total Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.flight?.flight_number || booking.flight_number || '-'}</TableCell>
                  <TableCell>{Array.isArray(booking.passenger_names) ? booking.passenger_names.join(', ') : (booking.passenger_name || '-')}</TableCell>
                  <TableCell>{formatDate(booking.booking_date || booking.booking_time || new Date())}</TableCell>
                  <TableCell>{formatPrice(booking.total_price || booking.price_at_booking || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default BookingHistory;

