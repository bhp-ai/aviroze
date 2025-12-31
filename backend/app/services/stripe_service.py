"""
Stripe Customer Management Service
Handles creation and updates of Stripe Customers with saved addresses
"""
import stripe
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.db_models import User, Address

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    """Service for managing Stripe Customers"""

    @staticmethod
    def _get_country_code(country_name: str) -> str:
        """Map country name to ISO 2-letter code"""
        country_code_map = {
            "Indonesia": "ID",
            "United States": "US",
            "Canada": "CA",
            "United Kingdom": "GB",
            "Australia": "AU",
            "Singapore": "SG",
            "Malaysia": "MY",
            "Thailand": "TH",
            "Philippines": "PH",
            "Vietnam": "VN",
        }
        return country_code_map.get(country_name, "ID")

    @staticmethod
    def create_or_update_customer(user: User, address: Address, db: Session) -> str:
        """
        Create or update a Stripe Customer with user's address information

        Args:
            user: User database object
            address: Address database object (should be default address)
            db: Database session

        Returns:
            Stripe Customer ID
        """
        try:
            # Prepare shipping address for Stripe
            shipping_address = {
                "name": address.full_name or user.username,
                "line1": address.street_address,
                "city": address.city,
                "state": address.state or "",
                "postal_code": address.postal_code,
                "country": StripeService._get_country_code(address.country),
            }

            # If user already has a Stripe customer ID, update it
            if user.stripe_customer_id:
                try:
                    customer = stripe.Customer.modify(
                        user.stripe_customer_id,
                        name=user.username,
                        email=user.email,
                        phone=address.phone_number if address.phone_number else None,
                        shipping={
                            "name": shipping_address["name"],
                            "address": {
                                "line1": shipping_address["line1"],
                                "city": shipping_address["city"],
                                "state": shipping_address["state"],
                                "postal_code": shipping_address["postal_code"],
                                "country": shipping_address["country"],
                            }
                        },
                        metadata={
                            "user_id": str(user.id),
                            "user_public_id": user.public_id,
                        }
                    )
                    print(f"[Stripe] Updated customer {customer.id} for user {user.email}")
                    return customer.id
                except stripe.error.InvalidRequestError:
                    # Customer doesn't exist anymore, create a new one
                    print(f"[Stripe] Customer {user.stripe_customer_id} not found, creating new one")
                    user.stripe_customer_id = None

            # Create new Stripe customer
            customer = stripe.Customer.create(
                name=user.username,
                email=user.email,
                phone=address.phone_number if address.phone_number else None,
                shipping={
                    "name": shipping_address["name"],
                    "address": {
                        "line1": shipping_address["line1"],
                        "city": shipping_address["city"],
                        "state": shipping_address["state"],
                        "postal_code": shipping_address["postal_code"],
                        "country": shipping_address["country"],
                    }
                },
                metadata={
                    "user_id": str(user.id),
                    "user_public_id": user.public_id,
                }
            )

            # Save the Stripe customer ID to database
            user.stripe_customer_id = customer.id
            db.commit()

            print(f"[Stripe] Created customer {customer.id} for user {user.email}")
            return customer.id

        except stripe.error.StripeError as e:
            print(f"[Stripe Error] {str(e)}")
            raise Exception(f"Failed to create/update Stripe customer: {str(e)}")

    @staticmethod
    def get_or_create_customer(user: User, address: Address, db: Session) -> str:
        """
        Get existing Stripe customer ID or create new customer

        Args:
            user: User database object
            address: Address database object (should be default address)
            db: Database session

        Returns:
            Stripe Customer ID
        """
        if user.stripe_customer_id:
            try:
                # Verify customer still exists in Stripe
                stripe.Customer.retrieve(user.stripe_customer_id)
                return user.stripe_customer_id
            except stripe.error.InvalidRequestError:
                # Customer doesn't exist, create new one
                print(f"[Stripe] Customer {user.stripe_customer_id} not found in Stripe")
                user.stripe_customer_id = None

        # Create new customer
        return StripeService.create_or_update_customer(user, address, db)

    @staticmethod
    def delete_customer(user: User, db: Session):
        """
        Delete Stripe customer when user is deleted

        Args:
            user: User database object
            db: Database session
        """
        if user.stripe_customer_id:
            try:
                stripe.Customer.delete(user.stripe_customer_id)
                print(f"[Stripe] Deleted customer {user.stripe_customer_id}")
                user.stripe_customer_id = None
                db.commit()
            except stripe.error.StripeError as e:
                print(f"[Stripe Error] Failed to delete customer: {str(e)}")
                # Don't raise exception - customer might already be deleted

stripe_service = StripeService()
