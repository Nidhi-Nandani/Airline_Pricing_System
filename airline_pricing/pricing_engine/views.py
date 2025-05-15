from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django.utils import timezone
from django.utils.timezone import make_aware
from datetime import datetime, timedelta
from django.db.models import Avg, Q
from .models import Flight, Booking, PriceHistory, Airport
from .serializers import FlightSerializer, BookingSerializer, PriceHistorySerializer, AirportSerializer
from .algorithms import PricingEngine
from decimal import Decimal
import json
from collections import defaultdict
from django.core.cache import cache
from random import randint
import requests

pricing_engine = PricingEngine()

class AirportViewSet(viewsets.ModelViewSet):
    queryset = Airport.objects.all().order_by('city', 'iata_code')
    serializer_class = AirportSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['city', 'iata_code', 'name']

class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.all()
    serializer_class = FlightSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['flight_number', 'origin_airport__city', 'destination_airport__city']

    @action(detail=False, methods=['get'])
    def search_flights(self, request):
        origin = request.query_params.get('origin', '')
        destination = request.query_params.get('destination', '')
        date_str = request.query_params.get('date', '')
        travel_class = request.query_params.get('class', 'Economy')
        sort_by = request.query_params.get('sort', 'departure_time')  # default sort by departure time

        try:
            # Parse the date string to datetime
            search_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            current_date = timezone.now().date()

            # Validate the search date
            if search_date < current_date:
                return Response({"error": "Please select a future date for travel"}, status=400)

            # Filter flights based on the search criteria
            flights = Flight.objects.filter(
                origin_airport__iata_code=origin,
                destination_airport__iata_code=destination,
                departure_time__date=search_date,
                travel_class=travel_class
            ).order_by(sort_by)

            # Serialize and return the flight data
            serializer = FlightSerializer(flights, many=True)
            return Response(serializer.data)

        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def _update_flight_price(self, flight):
        current_time = timezone.now()
        days_until_departure = (flight.departure_time.date() - current_time.date()).days
        
        # Get recent bookings for demand calculation
        recent_bookings = Booking.objects.filter(
            flight=flight,
            booking_time__gte=current_time - timedelta(days=7)
        ).count()
        
        # Calculate current capacity
        capacity = flight.total_seats
        booked_seats = Booking.objects.filter(flight=flight).aggregate(
            total_seats=Avg('num_seats')
        )['total_seats'] or 0
        booked_seats = int(booked_seats)
        available_seats = capacity - booked_seats

        # Convert base_price to float for calculations
        base_price = float(flight.base_price)
        
        # Calculate price adjustments
        price_increase_due_to_demand = min(recent_bookings / 10, 1) * base_price
        price_increase_due_to_time = max(days_until_departure / 30, 0) * base_price

        # Calculate final price and convert back to Decimal
        final_price = Decimal(str(base_price + price_increase_due_to_demand + price_increase_due_to_time))
        
        # Update flight price
        flight.current_price = final_price
        flight.available_seats = available_seats
        flight.save()

        # Record price history
        PriceHistory.objects.create(
            flight=flight,
            price=final_price,
            seats_available=available_seats,
            demand_factor=recent_bookings/7 if recent_bookings > 0 else 0,
            timestamp=current_time
        )

    @action(detail=False, methods=['post'])
    def send_otp(self, request):
        phone = request.data.get('phone')
        if not phone or not phone.isdigit() or len(phone) != 10:
            return Response({"error": "Invalid phone number."}, status=400)

        # Generate OTP
        otp = randint(100000, 999999)
        cache.set(f"otp_{phone}", otp, timeout=300)  # Store OTP for 5 minutes

        # Send OTP via SMS gateway (example using Twilio or similar API)
        try:
            # Replace with actual SMS gateway API call
            response = requests.post(
                "https://api.sms-gateway.com/send",
                data={
                    "to": phone,
                    "message": f"Your OTP is {otp}",
                    "api_key": "your_api_key"
                }
            )
            if response.status_code != 200:
                raise Exception("Failed to send OTP")
        except Exception as e:
            return Response({"error": "Failed to send OTP. Please try again."}, status=500)

        return Response({"message": "OTP sent successfully."}, status=200)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    def create(self, request, *args, **kwargs):
        flight_id = request.data.get('flight')
        num_seats = request.data.get('num_seats', 1)
        passenger_name = request.data.get('passenger_name', '')
        phone = request.data.get('phone', '')
        customer_email = request.data.get('customer_email', '')
        if not customer_email:
            customer_email = f"demo{flight_id}@proflight.com"  # Dummy email for prototype
        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response(
                {'error': 'Flight not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        if flight.available_seats < int(num_seats):
            return Response(
                {'error': 'Not enough seats available'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        # Create booking with current price
        booking_data = {
            'flight': flight_id,
            'num_seats': num_seats,
            'price_at_booking': float(flight.current_price) * int(num_seats),
            'passenger_name': passenger_name,
            'phone': phone,
            'customer_email': customer_email,
            'booked': True
        }
        serializer = self.get_serializer(data=booking_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Update flight availability
        flight.available_seats -= int(num_seats)
        flight.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class PriceHistoryViewSet(viewsets.ViewSet):
    def get_queryset(self):
        return Flight.objects.all()

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        time_range = request.query_params.get('time_range', 'week')
        current_date = timezone.now().date()

        # Define the date range
        if time_range == 'week':
            start_date = current_date - timedelta(days=7)
        elif time_range == 'month':
            start_date = current_date - timedelta(days=30)
        else:  # year
            start_date = current_date - timedelta(days=365)

        # Get flights in the date range
        flights = self.get_queryset().filter(
            departure_time__date__gte=start_date,
            departure_time__date__lte=current_date
        )

        # Calculate average prices by route and class
        route_prices = defaultdict(lambda: defaultdict(list))
        for flight in flights:
            route = f"{flight.origin_airport.iata_code}-{flight.destination_airport.iata_code}"
            route_prices[route][flight.travel_class].append(float(flight.current_price))

        # Calculate statistics
        analytics_data = []
        for route, class_prices in route_prices.items():
            for travel_class, prices in class_prices.items():
                avg_price = sum(prices) / len(prices) if prices else 0
                min_price = min(prices) if prices else 0
                max_price = max(prices) if prices else 0
                
                analytics_data.append({
                    'route': route,
                    'travel_class': travel_class,
                    'average_price': round(avg_price, 2),
                    'minimum_price': round(min_price, 2),
                    'maximum_price': round(max_price, 2),
                    'price_volatility': round(max_price - min_price, 2) if prices else 0
                })

        return Response({
            'time_range': time_range,
            'data': analytics_data
        })

@api_view(['GET'])
def get_price_data(request):
    time_range = request.query_params.get('time_range', 'week')
    # Filter logic based on time_range can be added here
    prices = PriceHistory.objects.all()
    data = [
        {
            'date': price.date,
            'average_price': price.price,
        }
        for price in prices
    ]
    return Response({'data': data})
