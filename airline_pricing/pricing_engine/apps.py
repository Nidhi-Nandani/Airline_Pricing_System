from django.apps import AppConfig

class PricingEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pricing_engine'

    def ready(self):
        # Import signals or perform any initialization here
        pass
