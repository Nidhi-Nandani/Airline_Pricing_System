from django.db import models
from django.utils import timezone

class Airport(models.Model):
    iata_code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=100)
    city = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.city} ({self.iata_code})"

class Flight(models.Model):
    CLASS_CHOICES = [
        ('Economy', 'Economy'),
        ('Business', 'Business'),
        ('First', 'First'),
    ]

    flight_number = models.CharField(max_length=10)
    airline = models.CharField(max_length=50, default='')
    origin_airport = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name='departures')
    destination_airport = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name='arrivals')
    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    travel_class = models.CharField(max_length=10, choices=CLASS_CHOICES)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_seats = models.IntegerField(default=50)
    available_seats = models.IntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['flight_number', 'departure_time', 'travel_class']

    def __str__(self):
        return f"{self.flight_number}: {self.origin_airport.iata_code}-{self.destination_airport.iata_code} ({self.travel_class})"

class Booking(models.Model):
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE)
    booking_time = models.DateTimeField(auto_now_add=True)
    price_at_booking = models.DecimalField(max_digits=10, decimal_places=2)
    num_seats = models.IntegerField(default=1)
    customer_email = models.EmailField(blank=True, null=True)  # Make optional
    passenger_name = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    booked = models.BooleanField(default=True)

    def __str__(self):
        return f"Booking {self.id} for {self.flight.flight_number}"

class PriceHistory(models.Model):
    flight_id = models.CharField(max_length=20, default='UNKNOWN')
    date = models.DateField(default=timezone.now)
    travel_class = models.CharField(max_length=20, default='Economy')
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"Price for {self.flight_id} on {self.date} ({self.travel_class})"
