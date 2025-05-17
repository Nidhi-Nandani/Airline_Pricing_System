import csv
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from pricing_engine.models import Airport, Flight
from pricing_engine.algorithms import PricingEngine
import os

class Command(BaseCommand):
    help = 'Import flight data from CSV files'

    def handle(self, *args, **kwargs):
        self.pricing_engine = PricingEngine()
        self.import_airports()
        self.import_flights()
        self.stdout.write(self.style.SUCCESS('Successfully imported flight data'))

    def import_airports(self):
        # Get the absolute path to the CSV file
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        airports_csv = os.path.join(base_dir, 'airline_pricing', 'Airports.csv')
        if not os.path.exists(airports_csv):
            airports_csv = os.path.join(base_dir, 'airline_pricing', '..', 'Airports.csv')
        
        # Delete all existing airports first to ensure we have clean data
        Airport.objects.all().delete()
        
        with open(airports_csv, 'r') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                Airport.objects.create(
                    iata_code=row['IATA Code'],
                    name=row['Airports Name'],
                    city=row['City Name']
                )

    def import_flights(self):
        # Get the absolute path to the CSV file
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        flights_csv = os.path.join(base_dir, '..', 'flightsSchedule.csv')
        
        # Delete all existing flights
        Flight.objects.all().delete()

        with open(flights_csv, 'r') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                # Parse origin and destination from IATA Code Pair
                origin_code, dest_code = row['IATA Code Pair'].split(' - ')
                
                # Get the airport objects
                try:
                    origin = Airport.objects.get(iata_code=origin_code)
                    destination = Airport.objects.get(iata_code=dest_code)
                except Airport.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f'Skipping flight due to missing airport: {row["IATA Code Pair"]}'))
                    continue

                # Parse date and times
                departure_time = timezone.make_aware(
                    datetime.strptime(f"{row['Date']} {row['Departure Time']}", '%Y-%m-%d %H:%M')
                )
                arrival_time = timezone.make_aware(
                    datetime.strptime(f"{row['Date']} {row['Arrival Time']}", '%Y-%m-%d %H:%M')
                )

                # Get total seats based on class
                total_seats = self.get_total_seats(row['Class'])
                
                # Create the flight
                Flight.objects.create(
                    flight_number=row['Flight ID'],
                    origin_airport=origin,
                    destination_airport=destination,
                    departure_time=departure_time,
                    arrival_time=arrival_time,
                    total_seats=total_seats,
                    available_seats=total_seats,  # Initially all seats are available
                    base_price=float(row['Price (INR)']),
                    current_price=float(row['Price (INR)']),  # Initialize current_price with base_price
                    travel_class=row['Class'],
                    airline=row['Flight Company']
                )

    def get_total_seats(self, travel_class):
        if travel_class == 'Economy':
            return 150
        elif travel_class == 'Business':
            return 30
        else:  # First
            return 10
