import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const PriceAnalytics = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState({ data: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/get_price_data/`);
        console.log('API Response:', response.data);
        if (response.data && response.data.data) {
          setPriceData(response.data);
        }
      } catch (error) {
        setError('Failed to fetch price data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchPriceData();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const generateChartData = (priceData) => {
    return {
      labels: priceData.data.map((entry) => new Date(entry.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Average Price',
          data: priceData.data.map((entry) => entry.average_price),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
        },
      ],
    };
  };

  console.log('Price Data:', priceData.data.slice(0, 5));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h4" gutterBottom color="primary">
              Price Analytics
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CircularProgress />
          </div>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Average Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No price data available.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" align="center">
            No chart data available.
          </Typography>
        </Paper>
      </Paper>
    </Container>
  );
};

export default PriceAnalytics;

