"""QR Code Generation Service."""

import base64
import io
import qrcode
from qrcode.constants import ERROR_CORRECT_M

from app.config import get_settings

settings = get_settings()


class QRCodeService:
    @classmethod
    def generate_feedback_qr_png_base64(cls, slug: str) -> str:
        """Generates a QR code pointing strictly to the public feedback form URL.

        Never embeds secrets, tokens, or private credentials.
        """
        target_url = f"{settings.FRONTEND_URL}/feedback/{slug}"

        qr = qrcode.QRCode(
            version=1,
            error_correction=ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(target_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#065F46", back_color="white") # Emerald QR

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/png;base64,{encoded}"
