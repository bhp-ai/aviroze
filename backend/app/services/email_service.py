import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import List, Dict
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

class EmailService:
    def __init__(self):
        # Check which email provider to use
        email_provider = os.getenv("EMAIL_PROVIDER", "gmail").lower()

        if email_provider == "gmail":
            self.smtp_server = "smtp.gmail.com"
            self.smtp_port = 587
            self.sender_email = os.getenv("GMAIL_EMAIL")
            self.sender_password = os.getenv("GMAIL_APP_PASSWORD")
        elif email_provider == "outlook":
            self.smtp_server = "smtp-mail.outlook.com"
            self.smtp_port = 587
            self.sender_email = os.getenv("OUTLOOK_EMAIL")
            self.sender_password = os.getenv("OUTLOOK_PASSWORD")
        else:
            # Generic SMTP settings
            self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
            self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
            self.sender_email = os.getenv("SMTP_EMAIL")
            self.sender_password = os.getenv("SMTP_PASSWORD")

        if not self.sender_email or not self.sender_password:
            print("Warning: Email credentials not configured. Email sending will be disabled.")
            print(f"Provider: {email_provider}, Server: {self.smtp_server}")

    def send_email(self, recipient_email: str, subject: str, html_content: str):
        """Send an email using Gmail SMTP"""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"Aviroze Shop <{self.sender_email}>"
            message["To"] = recipient_email

            # Attach HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # Connect to Gmail SMTP server
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Secure the connection
                server.login(self.sender_email, self.sender_password)
                server.send_message(message)

            print(f"Email sent successfully to {recipient_email}")
            return True
        except Exception as e:
            print(f"Failed to send email to {recipient_email}: {str(e)}")
            return False

    def generate_receipt_html(self, order_data: Dict) -> str:
        """Generate HTML receipt email template"""

        # Extract order details
        order_id = order_data.get("order_id")
        customer_name = order_data.get("customer_name", "Valued Customer")
        customer_email = order_data.get("customer_email")
        order_date = order_data.get("order_date", datetime.now().strftime("%B %d, %Y"))
        items = order_data.get("items", [])
        subtotal = order_data.get("subtotal", 0)
        shipping = order_data.get("shipping", 50000)
        total = order_data.get("total", 0)
        shipping_address = order_data.get("shipping_address", "")
        payment_method = order_data.get("payment_method", "Credit Card")

        # Generate items HTML
        items_html = ""
        for item in items:
            item_total = item["price"] * item["quantity"]
            items_html += f"""
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
                    <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">{item["product_name"]}</div>
                    <div style="font-size: 14px; color: #6b7280;">Quantity: {item["quantity"]}</div>
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827;">
                    IDR {item["price"]:,.0f}
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">
                    IDR {item_total:,.0f}
                </td>
            </tr>
            """

        # Generate complete HTML
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Receipt - Aviroze</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">AVIROZE</h1>
                                    <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Thank you for your purchase!</p>
                                </td>
                            </tr>

                            <!-- Order Success Message -->
                            <tr>
                                <td style="padding: 40px 30px; text-align: center; background-color: #f0fdf4; border-bottom: 1px solid #e5e7eb;">
                                    <div style="display: inline-block; background-color: #10b981; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; margin-bottom: 15px;">
                                        <span style="color: #ffffff; font-size: 30px;">✓</span>
                                    </div>
                                    <h2 style="margin: 0 0 10px 0; color: #065f46; font-size: 24px; font-weight: 600;">Order Confirmed!</h2>
                                    <p style="margin: 0; color: #047857; font-size: 16px;">Order #{order_id}</p>
                                </td>
                            </tr>

                            <!-- Order Details -->
                            <tr>
                                <td style="padding: 30px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding-bottom: 20px;">
                                                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">Order Information</h3>
                                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                                    <tr>
                                                        <td style="padding: 8px 0; color: #6b7280;">Order Date:</td>
                                                        <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: 500;">{order_date}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 8px 0; color: #6b7280;">Order Number:</td>
                                                        <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: 500;">#{order_id}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 8px 0; color: #6b7280;">Payment Method:</td>
                                                        <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: 500;">{payment_method}</td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Order Items -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">Order Items</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                        <thead>
                                            <tr style="background-color: #f9fafb;">
                                                <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Product</th>
                                                <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Price</th>
                                                <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items_html}
                                        </tbody>
                                    </table>
                                </td>
                            </tr>

                            <!-- Order Summary -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px; font-weight: 500;">IDR {subtotal:,.0f}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Shipping:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px; font-weight: 500;">IDR {shipping:,.0f}</td>
                                        </tr>
                                        <tr style="border-top: 2px solid #e5e7eb;">
                                            <td style="padding: 15px 0 0 0; color: #111827; font-size: 18px; font-weight: 700;">Total:</td>
                                            <td style="padding: 15px 0 0 0; text-align: right; color: #10b981; font-size: 24px; font-weight: 700;">IDR {total:,.0f}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Shipping Address -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">Shipping Address</h3>
                                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; font-size: 14px; color: #374151; line-height: 1.6;">
                                        <strong style="color: #111827;">{customer_name}</strong><br>
                                        {shipping_address}
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                        Questions about your order? Contact us at <a href="mailto:support@aviroze.com" style="color: #667eea; text-decoration: none;">support@aviroze.com</a>
                                    </p>
                                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                        © 2025 Aviroze. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        return html

    def send_order_receipt(self, order_data: Dict) -> bool:
        """Send order receipt email to customer"""
        try:
            html_content = self.generate_receipt_html(order_data)
            subject = f"Order Confirmation - #{order_data.get('order_id')} - Aviroze"
            recipient = order_data.get("customer_email")

            if not recipient:
                print("No recipient email provided")
                return False

            return self.send_email(recipient, subject, html_content)
        except Exception as e:
            print(f"Error sending order receipt: {str(e)}")
            return False

    def generate_status_update_html(self, order_data: Dict, status: str) -> str:
        """Generate HTML for order status update emails"""

        order_id = order_data.get("order_id")
        customer_name = order_data.get("customer_name", "Valued Customer")
        order_date = order_data.get("order_date", datetime.now().strftime("%B %d, %Y"))
        total = order_data.get("total", 0)
        tracking_number = order_data.get("tracking_number", "")
        items = order_data.get("items", [])
        subtotal = order_data.get("subtotal", 0)
        shipping = order_data.get("shipping", 50000)

        # Status-specific content
        status_config = {
            "pending": {
                "color": "#f59e0b",
                "bg_color": "#fef3c7",
                "icon": "⏳",
                "title": "Order Received",
                "message": "We've received your order and it's waiting to be processed.",
                "next_step": "We'll start processing your order soon and send you another update."
            },
            "processing": {
                "color": "#3b82f6",
                "bg_color": "#dbeafe",
                "icon": "📦",
                "title": "Order is Being Processed",
                "message": "Great news! Your order is now being prepared for shipment.",
                "next_step": "Your items are being carefully packed and will be shipped within 1-2 business days."
            },
            "completed": {
                "color": "#10b981",
                "bg_color": "#d1fae5",
                "icon": "✓",
                "title": "Order Delivered",
                "message": "Your order has been successfully delivered!",
                "next_step": "We hope you love your purchase! If you have any issues, please contact our support team."
            },
            "cancelled": {
                "color": "#ef4444",
                "bg_color": "#fee2e2",
                "icon": "✕",
                "title": "Order Cancelled",
                "message": "Your order has been cancelled.",
                "next_step": "If this was a mistake or you have questions, please contact our support team immediately."
            }
        }

        config = status_config.get(status.lower(), status_config["pending"])

        # Generate items HTML
        items_html = ""
        if items:
            for item in items:
                item_total = item["price"] * item["quantity"]
                items_html += f"""
                <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
                        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">{item["product_name"]}</div>
                        <div style="font-size: 14px; color: #6b7280;">Quantity: {item["quantity"]}</div>
                    </td>
                    <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827;">
                        IDR {item["price"]:,.0f}
                    </td>
                    <td style="padding: 15px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">
                        IDR {item_total:,.0f}
                    </td>
                </tr>
                """

        # Add tracking info for completed/processing
        tracking_html = ""
        if status.lower() in ["processing", "completed"] and tracking_number:
            tracking_html = f"""
            <tr>
                <td style="padding: 0 30px 30px 30px;">
                    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px; font-weight: 600;">
                            📍 Tracking Information
                        </h3>
                        <p style="margin: 0; color: #374151; font-size: 14px;">
                            Tracking Number: <strong>{tracking_number}</strong>
                        </p>
                    </div>
                </td>
            </tr>
            """

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Update - Aviroze</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">AVIROZE</h1>
                                    <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Order Status Update</p>
                                </td>
                            </tr>

                            <!-- Status Badge -->
                            <tr>
                                <td style="padding: 40px 30px; text-align: center; background-color: {config['bg_color']}; border-bottom: 1px solid #e5e7eb;">
                                    <div style="display: inline-block; background-color: {config['color']}; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; margin-bottom: 15px;">
                                        <span style="color: #ffffff; font-size: 30px;">{config['icon']}</span>
                                    </div>
                                    <h2 style="margin: 0 0 10px 0; color: {config['color']}; font-size: 24px; font-weight: 600;">{config['title']}</h2>
                                    <p style="margin: 0; color: #374151; font-size: 16px;">Order #{order_id}</p>
                                </td>
                            </tr>

                            <!-- Message -->
                            <tr>
                                <td style="padding: 30px;">
                                    <p style="margin: 0 0 15px 0; color: #111827; font-size: 16px; line-height: 1.6;">
                                        Hi <strong>{customer_name}</strong>,
                                    </p>
                                    <p style="margin: 0 0 15px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                                        {config['message']}
                                    </p>
                                    <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
                                        {config['next_step']}
                                    </p>
                                </td>
                            </tr>

                            {tracking_html}

                            <!-- Order Items -->
                            {f'''
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">Order Items</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                        <thead>
                                            <tr style="background-color: #f9fafb;">
                                                <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Product</th>
                                                <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Price</th>
                                                <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items_html}
                                        </tbody>
                                    </table>
                                </td>
                            </tr>

                            <!-- Order Summary -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px; font-weight: 500;">IDR {subtotal:,.0f}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Shipping:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px; font-weight: 500;">IDR {shipping:,.0f}</td>
                                        </tr>
                                        <tr style="border-top: 2px solid #e5e7eb;">
                                            <td style="padding: 15px 0 0 0; color: #111827; font-size: 18px; font-weight: 700;">Total:</td>
                                            <td style="padding: 15px 0 0 0; text-align: right; color: #10b981; font-size: 24px; font-weight: 700;">IDR {total:,.0f}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            ''' if items else f'''
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">Order Details</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order Number:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px; font-weight: 500;">#{order_id}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order Date:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px; font-weight: 500;">{order_date}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                                            <td style="padding: 8px 0; text-align: right;">
                                                <span style="display: inline-block; background-color: {config['color']}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                                    {status}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #10b981; font-size: 16px; font-weight: 700;">IDR {total:,.0f}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            '''}

                            <!-- Action Buttons -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px; text-align: center;">
                                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="padding-right: 10px;">
                                                <a href="http://localhost:3000/orders" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                                                    View Order Details
                                                </a>
                                            </td>
                                            <td style="padding-left: 10px;">
                                                <a href="http://localhost:8000/api/orders/{order_id}/receipt/pdf" style="display: inline-block; background-color: #ffffff; color: #111827; border: 2px solid #111827; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                                                    📄 Download Receipt
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                        Questions about your order? Contact us at <a href="mailto:support@aviroze.com" style="color: #667eea; text-decoration: none;">support@aviroze.com</a>
                                    </p>
                                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                        © 2025 Aviroze. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        return html

    def send_status_update_email(self, order_data: Dict, status: str) -> bool:
        """Send order status update email to customer"""
        try:
            html_content = self.generate_status_update_html(order_data, status)

            # Status-specific subject lines
            subject_map = {
                "pending": f"Order Received - #{order_data.get('order_id')} - Aviroze",
                "processing": f"Your Order is Being Processed - #{order_data.get('order_id')} - Aviroze",
                "completed": f"Order Delivered - #{order_data.get('order_id')} - Aviroze",
                "cancelled": f"Order Cancelled - #{order_data.get('order_id')} - Aviroze"
            }

            subject = subject_map.get(status.lower(), f"Order Update - #{order_data.get('order_id')} - Aviroze")
            recipient = order_data.get("customer_email")

            if not recipient:
                print("No recipient email provided")
                return False

            return self.send_email(recipient, subject, html_content)
        except Exception as e:
            print(f"Error sending status update email: {str(e)}")
            return False

# Create singleton instance
email_service = EmailService()
