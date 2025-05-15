from datetime import datetime, timedelta
import numpy as np
from typing import List, Dict, Any

class PricingEngine:
    def __init__(self):
        self.base_price_weight = 0.4
        self.demand_weight = 0.3
        self.seasonality_weight = 0.15
        self.competition_weight = 0.15
        self.learning_rate = 0.01
        self.price_history: List[Dict[str, Any]] = []
        self.booking_history: List[Dict[str, Any]] = []

    def calculate_demand_factor(self, bookings: int, capacity: int, days_until_departure: int) -> float:
        # Calculate current load factor
        load_factor = bookings / capacity if capacity > 0 else 0
        
        # Adjust demand based on days until departure
        time_factor = 1 + (1 - days_until_departure / 90) if days_until_departure <= 90 else 1
        
        # Calculate demand pressure
        demand_pressure = load_factor * time_factor
        
        # Normalize demand factor between 0.5 and 2.0
        return max(0.5, min(2.0, 1 + demand_pressure))

    def calculate_seasonality_factor(self, date: datetime) -> float:
        # Month-based seasonality (example factors)
        month_factors = {
            12: 1.3,  # December (holiday season)
            1: 1.2,   # January (new year)
            7: 1.2,   # July (summer vacation)
            8: 1.2,   # August (summer vacation)
            4: 1.1,   # April (spring break)
            5: 1.0,   # May
            6: 1.1,   # June
            9: 0.9,   # September
            10: 0.8,  # October
            11: 0.9,  # November
            2: 0.8,   # February
            3: 0.9    # March
        }
        
        # Day of week factors (weekend premium)
        dow_factors = {
            0: 1.1,  # Monday
            1: 1.0,  # Tuesday
            2: 1.0,  # Wednesday
            3: 1.0,  # Thursday
            4: 1.2,  # Friday
            5: 1.3,  # Saturday
            6: 1.2   # Sunday
        }
        
        month_factor = month_factors[date.month]
        dow_factor = dow_factors[date.weekday()]
        
        # Combine factors and normalize
        return (month_factor + dow_factor) / 2

    def calculate_competition_factor(self, competitor_prices: List[float]) -> float:
        if not competitor_prices:
            return 1.0
            
        avg_competitor_price = sum(competitor_prices) / len(competitor_prices)
        our_price = self.price_history[-1]['price'] if self.price_history else avg_competitor_price
        
        # Calculate relative price position
        price_position = our_price / avg_competitor_price if avg_competitor_price > 0 else 1
        
        # Adjust based on price position (encourage staying close to market average)
        return max(0.8, min(1.2, price_position))

    def greedy_pricing(self, base_price: float, current_bookings: int, 
                      capacity: int, departure_date: datetime,
                      competitor_prices: List[float] = None) -> float:
        """
        Greedy pricing algorithm that optimizes for immediate revenue
        """
        if competitor_prices is None:
            competitor_prices = []
            
        current_date = datetime.now()
        days_until_departure = (departure_date - current_date).days
        
        # Calculate adjustment factors
        demand_factor = self.calculate_demand_factor(current_bookings, capacity, days_until_departure)
        seasonality_factor = self.calculate_seasonality_factor(departure_date)
        competition_factor = self.calculate_competition_factor(competitor_prices)
        
        # Calculate weighted price
        adjusted_price = base_price * (
            self.base_price_weight +
            self.demand_weight * demand_factor +
            self.seasonality_weight * seasonality_factor +
            self.competition_weight * competition_factor
        )
        
        # Store price in history for future reference
        self.price_history.append({
            'price': adjusted_price,
            'demand_factor': demand_factor,
            'seasonality_factor': seasonality_factor,
            'competition_factor': competition_factor,
            'timestamp': current_date
        })
        
        return round(adjusted_price, 2)

    def dynamic_pricing(self, base_price: float, current_bookings: int, 
                       capacity: int, departure_date: datetime) -> float:
        """
        Dynamic pricing algorithm that combines all factors
        """
        # Convert Decimal to float if necessary
        base_price = float(base_price)
        
        return self.greedy_pricing(
            base_price=base_price,
            current_bookings=current_bookings,
            capacity=capacity,
            departure_date=departure_date
        )

    def _calculate_price_elasticity(self, recent_bookings: List[Dict[str, Any]]) -> float:
        """
        Calculate price elasticity of demand using recent booking history
        """
        if len(recent_bookings) < 2:
            return 0
            
        price_change = (recent_bookings[1]['price'] - recent_bookings[0]['price'])
        demand_change = (recent_bookings[1]['bookings'] - recent_bookings[0]['bookings'])
        
        # Avoid division by zero
        if abs(price_change) < 0.01 or recent_bookings[0]['price'] == 0 or recent_bookings[0]['bookings'] == 0:
            return 0
            
        # Calculate elasticity using midpoint formula
        avg_price = (recent_bookings[1]['price'] + recent_bookings[0]['price']) / 2
        avg_demand = (recent_bookings[1]['bookings'] + recent_bookings[0]['bookings']) / 2
        
        elasticity = (demand_change / avg_demand) / (price_change / avg_price)
        return elasticity

    def update_booking_history(self, price: float, bookings: int) -> None:
        """
        Update booking history with new data point
        """
        self.booking_history.append({
            'price': price,
            'bookings': bookings,
            'timestamp': datetime.now()
        })
