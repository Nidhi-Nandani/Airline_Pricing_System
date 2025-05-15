from django.contrib import admin
from .models import Airport, Flight, Booking, PriceHistory

@admin.register(Airport)
class AirportAdmin(admin.ModelAdmin):
    list_display = ('iata_code', 'name', 'city')
    search_fields = ('iata_code', 'name', 'city')
    ordering = ('city', 'iata_code')

@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = ('flight_number', 'origin_display', 'destination_display', 
                   'departure_datetime', 'travel_class', 'available_seats', 
                   'current_price')
    search_fields = ('flight_number', 'origin_airport__city', 
                    'destination_airport__city')
    list_filter = ('travel_class', 'departure_time', 'origin_airport__city', 
                  'destination_airport__city')

    def origin_display(self, obj):
        return f"{obj.origin_airport.city} ({obj.origin_airport.iata_code})"
    origin_display.short_description = 'Origin'

    def destination_display(self, obj):
        return f"{obj.destination_airport.city} ({obj.destination_airport.iata_code})"
    destination_display.short_description = 'Destination'

    def departure_datetime(self, obj):
        return obj.departure_time.strftime('%Y-%m-%d %H:%M')
    departure_datetime.short_description = 'Departure'

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'flight_display', 'booking_time', 'price_at_booking', 
                   'num_seats', 'customer_email')
    search_fields = ('customer_email', 'flight__flight_number')
    list_filter = ('booking_time', 'booked', 'flight__travel_class')

    def flight_display(self, obj):
        return f"{obj.flight.flight_number} - {obj.flight.travel_class}"
    flight_display.short_description = 'Flight'

@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ('flight_id', 'date', 'travel_class', 'price')
    search_fields = ('flight_id', 'travel_class')
    list_filter = ('date', 'travel_class')
