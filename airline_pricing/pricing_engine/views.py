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
from rest_framework.permissions import IsAuthenticated
import os

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
        import random
        origin = request.query_params.get('origin')
        destination = request.query_params.get('destination')
        travel_class = request.query_params.get('class', 'Economy')
        date = request.query_params.get('date')
        sort_by = request.query_params.get('sort', 'departure_time')

        try:
            search_date = datetime.strptime(date, '%Y-%m-%d').date()
        except Exception:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        airlines = ['Air India', 'IndiGo', 'SpiceJet', 'Vistara', 'GoAir', 'Akasa Air']
        airport_objs = Airport.objects.all()
        origin_airport = airport_objs.filter(iata_code=origin).first()
        destination_airport = airport_objs.filter(iata_code=destination).first()
        if not origin_airport or not destination_airport:
            return Response({"error": "Invalid origin or destination airport."}, status=400)

        flights = []
        stopover_cities = ['DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'MAA', 'AMD', 'GOI', 'PNQ', 'LKO']
        # Add 6 direct flights with more price flexibility
        for i in range(6):
            base_price = random.randint(3200, 9000)
            flights.append({
                'flight_number': f"DR{random.randint(1000,9999)}",
                'airline': 'ProFlight',
                'origin_airport': {'city': origin, 'iata_code': origin},
                'destination_airport': {'city': destination, 'iata_code': destination},
                'departure_time': f"{date}T{8+i*2:02d}:00:00",
                'arrival_time': f"{date}T{10+i*2:02d}:00:00",
                'is_direct': True,
                'route': [origin, destination],
                'available_seats': random.randint(5, 30),
                'travel_class': travel_class,
                'current_price': base_price if travel_class=='Economy' else (base_price+4000 if travel_class=='Business' else base_price+7000)
            })
        # Add 4 indirect flights with clear stopover and more price flexibility
        for i in range(4):
            base_price = random.randint(2200, 7000)
            stopover = random.choice(stopover_cities)
            while stopover == origin or stopover == destination:
                stopover = random.choice(stopover_cities)
            flights.append({
                'flight_number': f"IN{random.randint(1000,9999)}",
                'airline': 'ProFlight',
                'origin_airport': {'city': origin, 'iata_code': origin},
                'destination_airport': {'city': destination, 'iata_code': destination},
                'departure_time': f"{date}T{2+i:02d}:00:00",
                'arrival_time': f"{date}T{5+i:02d}:00:00",
                'is_direct': False,
                'route': [origin, stopover, destination],
                'stopover': stopover,
                'available_seats': random.randint(5, 30),
                'travel_class': travel_class,
                'current_price': int(0.7*base_price) if travel_class=='Economy' else (int(0.7*base_price)+4000 if travel_class=='Business' else int(0.7*base_price)+7000)
            })
        # Sorting
        if sort_by == 'price':
            flights.sort(key=lambda x: float(x['current_price']))
        elif sort_by == 'available_seats':
            flights.sort(key=lambda x: x['available_seats'], reverse=True)
        elif sort_by == 'class':
            class_order = {'Economy': 0, 'Business': 1, 'First': 2}
            flights.sort(key=lambda x: class_order.get(x['travel_class'], 99))
        else:
            flights.sort(key=lambda x: x['departure_time'])
        # Add a unique id for React key
        for i, f in enumerate(flights):
            f['id'] = f.get('flight_number', '') + '_' + str(i)
        return Response(flights)

    @action(detail=False, methods=['post'])
    def book_flight(self, request):
        import random
        import string
        from django.core.cache import cache
        data = request.data
        flight_key = data.get('flight_number')
        seats_key = f"seats_{flight_key}"
        booked_seats = int(data.get('num_seats', 1))
        available_seats = cache.get(seats_key, 20)
        available_seats = max(0, available_seats - booked_seats)
        cache.set(seats_key, available_seats, timeout=3600)
        ticket_id = f"{data.get('flight_number', 'FL')}-{random.randint(100000,999999)}"
        ticket = {
            'ticket_id': ticket_id,
            'flight_number': data.get('flight_number'),
            'passenger_name': data.get('passenger_name', 'Demo Passenger'),
            'phone': data.get('phone', ''),
            'num_seats': booked_seats,
            'class': data.get('travel_class', 'Economy'),
            'price': data.get('price', 0),
            'origin': data.get('origin'),
            'destination': data.get('destination'),
            'date': data.get('date'),
            'status': 'CONFIRMED',
            'seat_choice': data.get('seat_choice', ''),
            'meal': data.get('meal', ''),
        }
        return Response({'message': 'Booking successful', 'ticket': ticket})

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Return mock bookings from file for the current user
        username = self.request.user.username
        bookings_file = f"/tmp/user_bookings_{username}.json"
        if os.path.exists(bookings_file):
            with open(bookings_file, 'r') as f:
                try:
                    bookings = json.load(f)
                except Exception:
                    bookings = []
        else:
            bookings = []
        return bookings

    def list(self, request, *args, **kwargs):
        # Return all bookings for the current user from file
        bookings = self.get_queryset()
        return Response(bookings)

    def create(self, request, *args, **kwargs):
        # Save booking to a per-user file in /tmp
        import random
        from datetime import datetime
        username = request.data.get('user') or request.user.username
        bookings_file = f"/tmp/user_bookings_{username}.json"
        booking_id = random.randint(100000, 999999)
        booking_time = datetime.now().isoformat()
        booking = {
            'id': booking_id,
            'flight_number': request.data.get('flight'),
            'num_seats': request.data.get('num_seats', 1),
            'passenger_name': request.data.get('passenger_name', ''),
            'phone': request.data.get('phone', ''),
            'customer_email': request.data.get('customer_email', ''),
            'booked': True,
            'booking_time': booking_time,
            'price_at_booking': request.data.get('price', 0),
            'seat_choice': request.data.get('seat_choice', ''),
            'meal': request.data.get('meal', ''),
            'travel_class': request.data.get('travel_class', ''),
            'origin': request.data.get('origin', ''),
            'destination': request.data.get('destination', ''),
            'date': request.data.get('date', ''),
            'user': username
        }
        # Load previous bookings
        if os.path.exists(bookings_file):
            with open(bookings_file, 'r') as f:
                try:
                    bookings = json.load(f)
                except Exception:
                    bookings = []
        else:
            bookings = []
        bookings.append(booking)
        with open(bookings_file, 'w') as f:
            json.dump(bookings, f)
        return Response(booking, status=status.HTTP_201_CREATED)

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
