from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
from typing import Dict

class PDFReceiptService:
    def generate_receipt(self, order_data: Dict) -> BytesIO:
        """Generate a PDF receipt for an order"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)

        # Container for the 'Flowable' objects
        elements = []

        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#111827'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold'
        )

        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#374151')
        )

        # Title
        title = Paragraph("AVIROZE", title_style)
        elements.append(title)

        subtitle = Paragraph("Order Receipt", styles['Heading2'])
        elements.append(subtitle)
        elements.append(Spacer(1, 0.3*inch))

        # Order Information
        order_info = [
            ['Order Number:', f"#{order_data.get('order_id')}"],
            ['Order Date:', order_data.get('order_date', datetime.now().strftime("%B %d, %Y"))],
            ['Customer:', order_data.get('customer_name', 'N/A')],
            ['Email:', order_data.get('customer_email', 'N/A')],
            ['Payment Method:', order_data.get('payment_method', 'N/A')],
        ]

        info_table = Table(order_info, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))

        # Order Items
        items_heading = Paragraph("Order Items", heading_style)
        elements.append(items_heading)

        # Items table header
        items_data = [['Product', 'Quantity', 'Price', 'Total']]

        # Items table data
        items = order_data.get('items', [])
        for item in items:
            item_total = item['price'] * item['quantity']
            items_data.append([
                item['product_name'],
                str(item['quantity']),
                f"IDR {item['price']:,.0f}",
                f"IDR {item_total:,.0f}"
            ])

        items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1.5*inch, 1.5*inch])
        items_table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f9fafb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#6b7280')),
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),

            # Body
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#111827')),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 0.2*inch))

        # Order Summary
        subtotal = order_data.get('subtotal', 0)
        shipping = order_data.get('shipping', 50000)
        total = order_data.get('total', 0)

        summary_data = [
            ['Subtotal:', f"IDR {subtotal:,.0f}"],
            ['Shipping:', f"IDR {shipping:,.0f}"],
            ['', ''],  # Separator
            ['Total:', f"IDR {total:,.0f}"],
        ]

        summary_table = Table(summary_data, colWidths=[5*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('TEXTCOLOR', (0, 0), (0, 2), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (1, 0), (1, 2), colors.HexColor('#111827')),
            ('FONTNAME', (0, 0), (-1, 2), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 2), 10),

            # Total row
            ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 3), (-1, 3), 14),
            ('TEXTCOLOR', (0, 3), (0, 3), colors.HexColor('#111827')),
            ('TEXTCOLOR', (1, 3), (1, 3), colors.HexColor('#10b981')),
            ('LINEABOVE', (0, 3), (-1, 3), 1, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 3), (-1, 3), 10),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.3*inch))

        # Shipping Address
        if order_data.get('shipping_address'):
            address_heading = Paragraph("Shipping Address", heading_style)
            elements.append(address_heading)

            address_text = Paragraph(order_data['shipping_address'], normal_style)
            elements.append(address_text)
            elements.append(Spacer(1, 0.3*inch))

        # Footer
        footer_text = Paragraph(
            "Thank you for your purchase!<br/>For questions, contact us at support@aviroze.com",
            ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                alignment=TA_CENTER
            )
        )
        elements.append(Spacer(1, 0.5*inch))
        elements.append(footer_text)

        # Build PDF
        doc.build(elements)

        # Get the value of the BytesIO buffer and return it
        buffer.seek(0)
        return buffer

# Create singleton instance
pdf_service = PDFReceiptService()
