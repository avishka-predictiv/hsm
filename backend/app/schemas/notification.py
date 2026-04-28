from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    channel: Optional[str] = None
    is_read: bool
    sent_at: datetime

    model_config = {"from_attributes": True}
