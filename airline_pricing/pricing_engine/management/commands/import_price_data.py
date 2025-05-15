import csv
from django.core.management.base import BaseCommand
from pricing_engine.models import PriceHistory

class Command(BaseCommand):
    help = 'Import price data from flightsSchedule.csv into the database'

    def handle(self, *args, **kwargs):
        file_path = 'flightsSchedule.csv'
        try:
            with open(file_path, 'r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    PriceHistory.objects.create(
                        flight_id=row['Flight ID'],
                        date=row['Date'],
                        travel_class=row['Class'],
                        price=row['Price (INR)']
                    )
            self.stdout.write(self.style.SUCCESS('Price data imported successfully.'))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error importing price data: {e}'))
