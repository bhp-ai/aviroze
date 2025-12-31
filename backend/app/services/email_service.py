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
                <td style="padding:10px;border-bottom:1px solid #e0e0e0">
                    <div style="font-weight:bold;color:#000000;font-size:14px">{item["product_name"]}</div>
                    <div style="font-size:12px;color:#666666">Quantity: {item["quantity"]}</div>
                </td>
                <td style="padding:10px;border-bottom:1px solid #e0e0e0;text-align:right;color:#000000;font-size:14px">
                    IDR {item["price"]:,.0f}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold;color:#000000;font-size:14px">
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
            <link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;font-family:'Jost',sans-serif;background-color:#ffffff">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" style="padding:20px 10px">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid #e0e0e0">
                            <!-- Header -->
                            <tr>
                                <td style="background-color:#000000;padding:20px;text-align:center">
                                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:2px;font-family:'Jost',sans-serif">AVIROZE</h1>
                                </td>
                            </tr>

                            <!-- Order Success -->
                            <tr>
                                <td style="padding:20px;text-align:center;background-color:#f5f5f5">
                                    <h2 style="margin:0;color:#000000;font-size:20px;font-weight:bold">Order Confirmed!</h2>
                                    <p style="margin:5px 0 0 0;color:#666666;font-size:14px">Order #{order_id}</p>
                                </td>
                            </tr>

                            <!-- Order Information -->
                            <tr>
                                <td style="padding:20px">
                                    <h3 style="margin:0 0 10px 0;color:#000000;font-size:16px;font-weight:bold">Order Information</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Order Date:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">{order_date}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Order Number:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">#{order_id}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Payment Method:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">{payment_method}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Order Items -->
                            <tr>
                                <td style="padding:0 20px 20px 20px">
                                    <h3 style="margin:0 0 10px 0;color:#000000;font-size:16px;font-weight:bold">Order Items</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0">
                                        <thead>
                                            <tr style="background-color:#f5f5f5">
                                                <th style="padding:10px;text-align:left;font-size:12px;color:#666666;border-bottom:1px solid #e0e0e0">Product</th>
                                                <th style="padding:10px;text-align:right;font-size:12px;color:#666666;border-bottom:1px solid #e0e0e0">Price</th>
                                                <th style="padding:10px;text-align:right;font-size:12px;color:#666666;border-bottom:1px solid #e0e0e0">Total</th>
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
                                <td style="padding:0 20px 20px 20px">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:15px">
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Subtotal:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">IDR {subtotal:,.0f}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Shipping:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">IDR {shipping:,.0f}</td>
                                        </tr>
                                        <tr style="border-top:2px solid #000000">
                                            <td style="padding:10px 0 0 0;color:#000000;font-size:16px;font-weight:bold">Total:</td>
                                            <td style="padding:10px 0 0 0;text-align:right;color:#000000;font-size:16px;font-weight:bold">IDR {total:,.0f}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Shipping Address -->
                            <tr>
                                <td style="padding:0 20px 20px 20px">
                                    <h3 style="margin:0 0 10px 0;color:#000000;font-size:16px;font-weight:bold">Shipping Address</h3>
                                    <div style="background-color:#f5f5f5;padding:15px;font-size:14px;color:#000000">
                                        <strong>{customer_name}</strong><br>
                                        {shipping_address}
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding:20px;background-color:#f5f5f5;text-align:center;border-top:1px solid #e0e0e0">
                                    <p style="margin:0 0 5px 0;color:#666666;font-size:12px">
                                        Questions? Contact us at <a href="mailto:support@aviroze.com" style="color:#000000;text-decoration:underline">support@aviroze.com</a>
                                    </p>
                                    <p style="margin:0;color:#999999;font-size:11px">
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
        shipping_address = order_data.get("shipping_address", "")
        payment_method = order_data.get("payment_method", "Credit Card")

        # Status-specific content
        status_config = {
            "pending": {
                "title": "Order Status Updated",
                "message": "We've received your order and it's waiting to be processed."
            },
            "processing": {
                "title": "Order Status Updated",
                "message": "Great news! Your order is now being prepared for shipment."
            },
            "completed": {
                "title": "Order Status Updated",
                "message": "Your order has been successfully delivered!"
            },
            "cancelled": {
                "title": "Order Status Updated",
                "message": "Your order has been cancelled."
            }
        }

        config = status_config.get(status.lower(), status_config["pending"])

        # Generate items HTML
        items_html = ""
        if items:
            for item in items:
                item_total = item["price"] * item["quantity"]
                product_image = item.get("product_image", "")

                items_html += f"""
            <tr>
                <td style="padding:10px;border-bottom:1px solid #e0e0e0">
                    <table cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width:60px;padding-right:10px;vertical-align:top">
                                {f'<img src="{product_image}" alt="{item["product_name"]}" width="60" height="60" style="display:block;border-radius:4px;object-fit:cover">' if product_image else ''}
                            </td>
                            <td style="vertical-align:top">
                                <div style="font-weight:bold;color:#000000;font-size:14px">{item["product_name"]}</div>
                                <div style="font-size:12px;color:#666666">Quantity: {item["quantity"]}</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="padding:10px;border-bottom:1px solid #e0e0e0;text-align:right;color:#000000;font-size:14px;vertical-align:top">
                    IDR {item["price"]:,.0f}
                </td>
                <td style="padding:10px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold;color:#000000;font-size:14px;vertical-align:top">
                    IDR {item_total:,.0f}
                </td>
            </tr>
            """

        print(f"[DEBUG EMAIL] Items count: {len(items) if items else 0}")
        print(f"[DEBUG EMAIL] Items HTML length: {len(items_html)}")
        print(f"[DEBUG EMAIL] Shipping address: '{shipping_address}'")

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Update - Aviroze</title>
            <link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;font-family:'Jost',sans-serif;background-color:#ffffff">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" style="padding:20px 10px">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid #e0e0e0">
                            <!-- Header -->
                            <tr>
                                <td style="background-color:#000000;padding:20px;text-align:center">
                                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:2px;font-family:'Jost',sans-serif">AVIROZE</h1>
                                </td>
                            </tr>

                            <!-- Status Message -->
                            <tr>
                                <td style="padding:20px;text-align:center;background-color:#f5f5f5">
                                    <h2 style="margin:0;color:#000000;font-size:20px;font-weight:bold">{config['title']}</h2>
                                    <p style="margin:5px 0 0 0;color:#666666;font-size:14px">Order #{order_id}</p>
                                </td>
                            </tr>

                            <!-- Message -->
                            <tr>
                                <td style="padding:20px">
                                    <p style="margin:0 0 10px 0;color:#666666;font-size:14px">
                                        {config['message']}
                                    </p>
                                </td>
                            </tr>

                            <!-- Order Information -->
                            <tr>
                                <td style="padding:0 20px 20px 20px">
                                    <h3 style="margin:0 0 10px 0;color:#000000;font-size:16px;font-weight:bold">Order Information</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Order Date:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">{order_date}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Order Number:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">#{order_id}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Payment Method:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">{payment_method}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Status:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px;font-weight:bold">{status.upper()}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Order Items -->
                            {f'''<tr>
                                <td style="padding:0 20px 20px 20px">
                                    <h3 style="margin:0 0 10px 0;color:#000000;font-size:16px;font-weight:bold">Order Items</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0">
                                        <thead>
                                            <tr style="background-color:#f5f5f5">
                                                <th style="padding:10px;text-align:left;font-size:12px;color:#666666;border-bottom:1px solid #e0e0e0">Product</th>
                                                <th style="padding:10px;text-align:right;font-size:12px;color:#666666;border-bottom:1px solid #e0e0e0">Price</th>
                                                <th style="padding:10px;text-align:right;font-size:12px;color:#666666;border-bottom:1px solid #e0e0e0">Total</th>
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
                                <td style="padding:0 20px 20px 20px">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:15px">
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Subtotal:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">IDR {subtotal:,.0f}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:5px 0;color:#666666;font-size:14px">Shipping:</td>
                                            <td style="padding:5px 0;text-align:right;color:#000000;font-size:14px">IDR {shipping:,.0f}</td>
                                        </tr>
                                        <tr style="border-top:2px solid #000000">
                                            <td style="padding:10px 0 0 0;color:#000000;font-size:16px;font-weight:bold">Total:</td>
                                            <td style="padding:10px 0 0 0;text-align:right;color:#000000;font-size:16px;font-weight:bold">IDR {total:,.0f}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>''' if items else ''}

                            <!-- Shipping Address -->
                            {f'''<tr>
                                <td style="padding:0 20px 20px 20px">
                                    <h3 style="margin:0 0 10px 0;color:#000000;font-size:16px;font-weight:bold">Shipping Address</h3>
                                    <div style="background-color:#f5f5f5;padding:15px;font-size:14px;color:#000000">
                                        <strong>{customer_name}</strong><br>
                                        {shipping_address}
                                    </div>
                                </td>
                            </tr>''' if shipping_address else ''}

                            <!-- Action Buttons -->
                            <tr>
                                <td style="padding:0 20px 20px 20px;text-align:center">
                                    <a href="http://localhost:3000/orders" style="display:inline-block;background-color:#000000;color:#ffffff;padding:12px 24px;margin:5px;text-decoration:none;font-weight:bold;font-size:13px;border-radius:4px">View Order Details</a>
                                    <a href="http://localhost:8000/api/orders/{order_id}/receipt/pdf" style="display:inline-block;background-color:#ffffff;color:#000000;border:2px solid #000000;padding:10px 22px;margin:5px;text-decoration:none;font-weight:bold;font-size:13px;border-radius:4px">Download Receipt</a>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding:20px;background-color:#f5f5f5;text-align:center;border-top:1px solid #e0e0e0">
                                    <p style="margin:0 0 5px 0;color:#666666;font-size:12px">
                                        Questions? Contact us at <a href="mailto:support@aviroze.com" style="color:#000000;text-decoration:underline">support@aviroze.com</a>
                                    </p>
                                    <p style="margin:0;color:#999999;font-size:11px">
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
