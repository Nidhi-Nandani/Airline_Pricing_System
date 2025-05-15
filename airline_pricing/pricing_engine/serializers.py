from rest_framework import serializers
from .models import Flight, Booking, PriceHistory, Airport

class AirportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airport
        fields = ['id', 'iata_code', 'name', 'city']

class FlightSerializer(serializers.ModelSerializer):
    origin_airport = AirportSerializer()
    destination_airport = AirportSerializer()

    class Meta:
        model = Flight
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'

class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = '__all__'
